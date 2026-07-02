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
    contractLabor: price.contractLabor,
    lumpSum: price.lumpSum,
    total: price.total,
    materialCost: cost.materialAmount,
    laborCost: cost.laborAmount + cost.contractLabor,
  };
}

export function formatSummaryMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "-";
  return `$ ${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatProjectDate(ms) {
  if (!ms) return "-";
  const d = new Date(Number(ms));
  if (Number.isNaN(d.getTime())) return "-";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
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
