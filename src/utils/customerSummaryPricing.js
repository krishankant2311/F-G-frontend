/** Summarize latest customer copy pricing for Customer Summary table rows. */
import {
  getOfficeFieldCopyLineCost,
  getOfficeFieldCopyLineTotal,
} from "./fieldCopyLaborDisplay";

export function stripHtmlText(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatSummaryDescription(description) {
  const text = stripHtmlText(description);
  return text ? text.toUpperCase() : "-";
}

function resolveGroupCrewLabor(group, useCost) {
  const storedCost = Number(group?.totalCost) || 0;
  const storedPrice = Number(group?.totalPrice) || 0;
  const manHours = Number(group?.manHours) || 0;
  const jobTypeCost = Number(group?.jobTypeCost) || 0;

  if (useCost) return storedCost;

  if (storedPrice > 0) return storedPrice;
  if (manHours > 0 && jobTypeCost > 0) {
    return Math.round(manHours * jobTypeCost * 100) / 100;
  }
  // Crew labor groups often store the billable total in totalCost only.
  if (storedCost > 0) return storedCost;
  return 0;
}

function resolveLineAmount(line, useCost) {
  if (useCost) {
    const stored = Number(line?.totalCost);
    if (stored > 0) return stored;
    const unitCost = Number(line?.cost);
    const qty = Number(line?.quantity);
    const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
    if (unitCost > 0) return Math.round(unitCost * qtySafe * 100) / 100;
    return 0;
  }

  const stored = Number(line?.totalPrice);
  if (stored > 0) return stored;
  const unitPrice = Number(line?.price);
  const qty = Number(line?.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  if (unitPrice > 0) return Math.round(unitPrice * qtySafe * 100) / 100;
  return 0;
}

function isMaterialLine(line) {
  const src = String(line?.source || "");
  if (src === "Labor") return false;
  if (src === "Lump Sum" || src.includes("Lump Sum")) return false;
  return src === "F&G" || src === "Other";
}

/** Sum sell price for one material row — same rules as Customer Copy table TOTAL. */
function resolveMaterialLinePrice(line) {
  const total = getOfficeFieldCopyLineTotal(line);
  if (total > 0) return total;
  return resolveLineAmount(line, false);
}

function resolveMaterialLineCost(line) {
  const price = resolveMaterialLinePrice(line);
  const fromOffice = getOfficeFieldCopyLineCost(line);
  if (fromOffice > 0 && price > 0 && Math.abs(fromOffice - price) > 0.01) {
    return fromOffice;
  }

  const unitCost = Number(line?.cost);
  const qty = Number(line?.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;

  if (unitCost > 0) {
    return Math.round(unitCost * qtySafe * 100) / 100;
  }

  const storedCost = Number(line?.totalCost);
  if (storedCost > 0 && price > 0 && Math.abs(storedCost - price) > 0.01) {
    return storedCost;
  }

  if (price > 0) {
    return Math.round((price / 2) * 100) / 100;
  }

  if (fromOffice > 0) return fromOffice;
  if (storedCost > 0) return storedCost;
  return 0;
}

function computeCustomerCopySummary(project, useCost = false) {
  const empty = {
    materialAmount: 0,
    laborAmount: 0,
    contractLabor: 0,
    lumpSum: 0,
    total: 0,
  };

  const blocks = project?.customerFieldCopy || [];
  if (!blocks.length) return empty;

  const lastBlock = blocks[blocks.length - 1];
  const copiesByJob = lastBlock?.customerCopies?.[lastBlock.customerCopies.length - 1];
  if (!Array.isArray(copiesByJob)) return empty;

  let materialAmount = 0;
  let laborAmount = 0;
  let contractLabor = 0;
  let lumpSum = 0;

  for (const group of copiesByJob) {
    let groupContractLabor = 0;

    for (const line of group.copies || []) {
      const src = String(line.source || "");
      const amount = resolveLineAmount(line, useCost);

      if (src === "Labor") {
        groupContractLabor += amount;
      } else if (src === "Lump Sum" || src.includes("Lump Sum")) {
        lumpSum += amount;
      } else if (isMaterialLine(line)) {
        materialAmount += useCost
          ? resolveMaterialLineCost(line)
          : resolveMaterialLinePrice(line);
      }
    }

    const groupCrew = resolveGroupCrewLabor(group, useCost);
    laborAmount += groupCrew;
    contractLabor += groupContractLabor;
  }

  const total = materialAmount + laborAmount + contractLabor + lumpSum;

  return {
    materialAmount,
    laborAmount,
    contractLabor,
    lumpSum,
    total,
  };
}

export function summarizeLatestCustomerCopy(project, { useCost = false } = {}) {
  if (useCost) {
    return computeCustomerCopySummary(project, true);
  }
  return computeCustomerCopySummary(project, false);
}

export function summarizeLatestCustomerCopyBoth(project) {
  const price = computeCustomerCopySummary(project, false);
  const cost = computeCustomerCopySummary(project, true);
  return {
    materialPrice: price.materialAmount,
    laborPrice: price.laborAmount,
    contractLaborPrice: price.contractLabor,
    lumpSumPrice: price.lumpSum,
    totalPrice: price.total,
    materialCost: cost.materialAmount,
    laborCost: cost.laborAmount,
    contractLaborCost: cost.contractLabor,
    lumpSumCost: cost.lumpSum,
    totalCost: cost.total,
  };
}

export function formatSummaryMoneyCsv(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "";
  return n.toFixed(2);
}

/** Parse project date from API (ms, ISO, MM/DD/YYYY, etc.). */
export function parseProjectDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const d = new Date(Number(trimmed));
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = Number(slashMatch[1]);
      const day = Number(slashMatch[2]);
      const year = Number(slashMatch[3]);
      const d = new Date(year, month - 1, day, 12, 0, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    const d = trimmed.includes("T")
      ? new Date(trimmed)
      : new Date(`${trimmed}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatProjectDate(value) {
  const d = parseProjectDate(value);
  if (!d) return "-";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/** ISO date for CSV; tab prefix keeps Excel from misreading the column. */
export function formatProjectDateForCsv(value) {
  const d = parseProjectDate(value);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `\t${yyyy}-${mm}-${dd}`;
}

export function downloadCustomerSummaryCsv(
  customerName,
  rows,
  { costMode = false, fileName = "" } = {}
) {
  if (!rows?.length) return false;

  const escapeCsv = (value) => {
    const s = String(value ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  };

  const headers = costMode
    ? [
        "Project",
        "Description",
        "Material Cost",
        "Material Price",
        "Labor Cost",
        "Labor Price",
        "Contract Labor Cost",
        "Contract Labor Price",
        "Lump Sum Cost",
        "Lump Sum Price",
        "Total Cost",
        "Total Price",
        "Start Date",
        "Completion Date",
        "Bid",
      ]
    : [
        "Project",
        "Description",
        "Material Price",
        "Labor Price",
        "Contract Labor Price",
        "Lump Sum Price",
        "Total Price",
        "Start Date",
        "Completion Date",
        "Bid",
      ];

  const body = rows.map((row) => {
    if (costMode) {
      return [
        row.projectCode,
        row.description,
        formatSummaryMoneyCsv(row.materialCost),
        formatSummaryMoneyCsv(row.materialPrice),
        formatSummaryMoneyCsv(row.laborCost),
        formatSummaryMoneyCsv(row.laborPrice),
        formatSummaryMoneyCsv(row.contractLaborCost),
        formatSummaryMoneyCsv(row.contractLaborPrice),
        formatSummaryMoneyCsv(row.lumpSumCost),
        formatSummaryMoneyCsv(row.lumpSumPrice),
        formatSummaryMoneyCsv(row.totalCost),
        formatSummaryMoneyCsv(row.totalPrice),
        formatProjectDateForCsv(row.startDateRaw),
        formatProjectDateForCsv(row.completionDateRaw),
        row.isBid,
      ];
    }
    return [
      row.projectCode,
      row.description,
      formatSummaryMoneyCsv(row.materialPrice),
      formatSummaryMoneyCsv(row.laborPrice),
      formatSummaryMoneyCsv(row.contractLaborPrice),
      formatSummaryMoneyCsv(row.lumpSumPrice),
      formatSummaryMoneyCsv(row.totalPrice),
      formatProjectDateForCsv(row.startDateRaw),
      formatProjectDateForCsv(row.completionDateRaw),
      row.isBid,
    ];
  });

  const csv = [headers, ...body]
    .map((line) => line.map(escapeCsv).join(","))
    .join("\r\n");

  const safeName = String(fileName || customerName || "customer")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName || "customer-summary"}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

export function formatSummaryMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "-";
  return `$ ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const RECENT_KEY = "customerSummaryRecentSearches";

export function loadRecentCustomerSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentCustomerSearch(customer) {
  if (!customer?._id) return;
  const entry = {
    _id: customer._id,
    customerName: customer.customerName,
    customerEmail: customer.customerEmail || "",
    searchedAt: new Date().toISOString(),
  };
  const prev = loadRecentCustomerSearches().filter((c) => c._id !== customer._id);
  const next = [entry, ...prev].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}
