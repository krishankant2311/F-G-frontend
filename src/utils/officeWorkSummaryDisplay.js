import {
  getFieldCopyLaborLineDisplayTotal,
  getLumpSumSourceLaborLineTotal,
  getOfficeFieldCopyLineCost,
  isFieldCopyLaborContext,
  normalizeJobTypeKey,
  resolveCustomerCopyInvoiceLaborJobType,
  stripLaborReferenceParentheses,
} from "./fieldCopyLaborDisplay";

function isOfficeWorkSummaryLaborRow(item) {
  if (!item) return false;
  if (item.dataType === "Labor") return true;
  if (item.dataType === "Material" && String(item.source || "").toLowerCase() === "labor") {
    return true;
  }
  return false;
}

function officeWorkSummaryRowTaxable(item) {
  return !!(item?.isLaborTaxable ?? item?.isTaxable);
}

function fieldCopyLaborLineSell(fc) {
  const stored = Number(fc?.totalPrice);
  if (stored > 0 && !Number.isNaN(stored)) return stored;
  return getFieldCopyLaborLineDisplayTotal(fc) || 0;
}

function findOfficeWorkSummaryFieldCopyLaborMatch(item, fieldCopies) {
  if (!Array.isArray(fieldCopies) || fieldCopies.length === 0) return null;
  const sell = Number(item?.totalPrice) || 0;
  if (!(sell > 0)) return null;

  const taxable = officeWorkSummaryRowTaxable(item);
  for (const fc of fieldCopies) {
    if (String(fc?.source || "").toLowerCase() !== "labor") continue;
    const ref = String(fc?.reference || fc?.description || "");
    if (!ref.toUpperCase().includes("LABOR")) continue;
    const fcSell = fieldCopyLaborLineSell(fc);
    if (Math.abs(fcSell - sell) > 0.02) continue;
    if (officeWorkSummaryRowTaxable(fc) !== taxable) continue;
    return fc;
  }
  return null;
}

function labelFromLaborReferenceText(text) {
  const ref = stripLaborReferenceParentheses(String(text ?? "")).toUpperCase();
  const m = ref.match(/^([A-Z][A-Z\s]*?)\s+LABOR\b/);
  if (m) return `${String(m[1]).trim()} LABOR`;
  if (ref.includes("LABOR")) return ref.replace(/\s+/g, " ").trim();
  return "";
}

function officeWorkSummaryCrewDescriptionBase(item, fieldCopies = []) {
  const fromRef = labelFromLaborReferenceText(
    item?.reference || item?.description || ""
  );
  if (fromRef) return fromRef;

  const fc = findOfficeWorkSummaryFieldCopyLaborMatch(item, fieldCopies);
  if (fc) {
    const fromFc = labelFromLaborReferenceText(
      fc?.reference || fc?.description || ""
    );
    if (fromFc) return fromFc;
  }

  const resolvedJt = resolveCustomerCopyInvoiceLaborJobType(item);
  return resolvedJt ? `${resolvedJt} LABOR` : "";
}

function isOfficeWorkSummaryContractorRow(item) {
  return (
    item?.dataType === "Material" &&
    String(item?.source || "").toLowerCase() === "labor" &&
    isFieldCopyLaborContext(item)
  );
}

export function getOfficeWorkSummaryLaborMergeKey(item, fieldCopies = []) {
  if (!isOfficeWorkSummaryLaborRow(item)) return null;

  const crewBase = officeWorkSummaryCrewDescriptionBase(item, fieldCopies);
  if (!crewBase || !crewBase.includes("LABOR")) return null;

  const jtFromLabel = crewBase.replace(/\s+LABOR$/i, "").trim();
  const jtKey = normalizeJobTypeKey(
    jtFromLabel || resolveCustomerCopyInvoiceLaborJobType(item)
  );
  if (!jtKey) return null;

  const taxable = officeWorkSummaryRowTaxable(item);

  return `${jtKey}|${taxable}|${crewBase.replace(/\s+/g, " ")}`;
}

export function getOfficeWorkSummaryDisplayLabel(item, fieldCopies = []) {
  return officeWorkSummaryCrewDescriptionBase(item, fieldCopies);
}

function resolveOfficeWorkSummaryAbsorbCostCore(item) {
  const sell = Number(item?.totalPrice) || 0;
  const markup = Number(item?.markup ?? item?.markUp) || 0;
  const stored = Number(item?.totalCost);
  if (stored > 0 && !Number.isNaN(stored)) {
    const storedLooksLikeSell =
      markup > 0 && sell > 0 && Math.abs(stored - sell) < 0.01;
    if (!storedLooksLikeSell) return stored;
  }

  const fromLine = getOfficeFieldCopyLineCost(item);
  if (fromLine > 0) return fromLine;

  const unitCost = Number(item?.cost);
  const qty = Number(item?.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  if (unitCost > 0 && !Number.isNaN(unitCost)) {
    return Math.round(unitCost * qtySafe * 100) / 100;
  }

  if (sell > 0 && markup > 0) {
    return Math.round((sell / (1 + markup / 100)) * 100) / 100;
  }

  if (sell > 0 && item?.dataType === "Labor") {
    return sell;
  }

  return 0;
}

function resolveOfficeWorkSummaryAbsorbCost(item, fieldCopies = []) {
  const core = resolveOfficeWorkSummaryAbsorbCostCore(item);
  if (core > 0) return core;

  const fc = findOfficeWorkSummaryFieldCopyLaborMatch(item, fieldCopies);
  if (fc) {
    const fcCost = resolveOfficeWorkSummaryAbsorbCostCore(fc);
    if (fcCost > 0) return fcCost;
  }

  return 0;
}

function resolveOfficeWorkSummaryAbsorbSell(item, fieldCopies = []) {
  const sell = Number(item?.totalPrice);
  if (sell > 0 && !Number.isNaN(sell)) return sell;

  if (String(item?.source || "").toLowerCase() === "labor") {
    const lump = getLumpSumSourceLaborLineTotal(item);
    if (lump > 0) return lump;
  }

  const cost = resolveOfficeWorkSummaryAbsorbCost(item, fieldCopies);
  const markup = parseFloat(item?.markup ?? item?.markUp) || 0;
  if (cost > 0 && markup > 0) {
    return Math.round((cost * (1 + markup / 100)) * 100) / 100;
  }

  const fromLabor = getFieldCopyLaborLineDisplayTotal(item);
  return fromLabor > 0 ? fromLabor : 0;
}

function isFieldCopyWorkSummaryLaborSource(fc) {
  if (!fc) return false;
  const ref = String(fc?.reference || fc?.description || "").toUpperCase();
  if (ref.includes("LABOR")) return true;
  return String(fc?.source || "").toLowerCase() === "labor";
}

function fieldCopyAsWorkSummaryMergeItem(fc) {
  const isLaborSource = String(fc?.source || "").toLowerCase() === "labor";
  return {
    ...fc,
    dataType: isLaborSource ? "Material" : "Labor",
    isLaborTaxable: fc.isLaborTaxable ?? fc.isTaxable,
    isTaxable: fc.isTaxable ?? fc.isLaborTaxable,
  };
}

function crewEntryWorkSummaryTotals(entry, fieldCopies) {
  const labor = entry?.labor;
  const crewRow = entry?.row;
  if (!labor || !crewRow) return { cost: 0, sell: 0 };

  const pseudo = {
    dataType: "Labor",
    jobType: labor.jobType,
    reference: crewRow.description,
    description: crewRow.description,
    isLaborTaxable: labor.isLaborTaxable,
    isTaxable: labor.isLaborTaxable,
    totalPrice: Number(crewRow.displayTotal) || 0,
    totalCost: Number(crewRow.lineCost) || 0,
  };
  const key = getOfficeWorkSummaryLaborMergeKey(pseudo, fieldCopies);
  if (!key) return { cost: 0, sell: 0 };

  return {
    mergeKey: key,
    cost: Number(crewRow.lineCost) || 0,
    sell: Number(crewRow.displayTotal) || 0,
  };
}

/** Sum cost/sell from field-copy lines + crew rows for one Work Summary labor key. */
function sumWorkSummaryTotalsForKey(mergeKey, fieldCopies, crewEntries = []) {
  let cost = 0;
  let sell = 0;
  for (const fc of fieldCopies || []) {
    if (!isFieldCopyWorkSummaryLaborSource(fc)) continue;
    const item = fieldCopyAsWorkSummaryMergeItem(fc);
    const key = getOfficeWorkSummaryLaborMergeKey(item, fieldCopies);
    if (key !== mergeKey) continue;
    cost += resolveOfficeWorkSummaryAbsorbCost(item, fieldCopies);
    sell += resolveOfficeWorkSummaryAbsorbSell(item, fieldCopies);
  }

  for (const entry of crewEntries || []) {
    const crewTotals = crewEntryWorkSummaryTotals(entry, fieldCopies);
    if (crewTotals.mergeKey !== mergeKey) continue;
    cost += crewTotals.cost;
    sell += crewTotals.sell;
  }

  return {
    cost: Math.round(cost * 100) / 100,
    sell: Math.round(sell * 100) / 100,
  };
}

function collectOfficeWorkSummaryExtraLaborRows(summaryRows, materialLaborData) {
  const summaryLaborRefs = new Set(
    (summaryRows || [])
      .filter(
        (item) =>
          item?.dataType === "Material" &&
          String(item?.source || "").toLowerCase() === "labor"
      )
      .map((item) =>
        String(item.reference || item.description || "")
          .trim()
          .toLowerCase()
      )
  );
  return (materialLaborData || []).filter((item) => {
    if (item?.dataType !== "Material") return false;
    if (String(item?.source || "").toLowerCase() !== "labor") return false;
    const ref = String(item.reference || item.description || "")
      .trim()
      .toLowerCase();
    return ref && !summaryLaborRefs.has(ref);
  });
}

export function buildOfficeWorkSummaryDisplayRows(
  summaryRows,
  crewEntries = [],
  materialLaborData = [],
  fieldCopies = []
) {
  const materialRows = [];
  const laborByKey = new Map();

  const extraLaborRows = collectOfficeWorkSummaryExtraLaborRows(
    summaryRows,
    materialLaborData
  );

  const absorbLabor = (item) => {
    const mergeKey = getOfficeWorkSummaryLaborMergeKey(item, fieldCopies);
    if (!mergeKey) return;

    const sell = Number(item.totalPrice) || 0;
    const cost = resolveOfficeWorkSummaryAbsorbCost(item, fieldCopies);
    const lineTaxable = officeWorkSummaryRowTaxable(item);
    const displayLabel = getOfficeWorkSummaryDisplayLabel(item, fieldCopies);

    if (laborByKey.has(mergeKey)) {
      const merged = laborByKey.get(mergeKey);
      merged.totalCost += cost;
      const mergedSell = Number(merged.totalPrice) || 0;
      if (sell > 0) {
        if (isOfficeWorkSummaryContractorRow(item)) {
          if (mergedSell <= 0) {
            merged.totalPrice = sell;
          } else if (sell > mergedSell + 0.01) {
            merged.totalPrice = mergedSell + sell;
          }
        } else if (sell > mergedSell + 0.01) {
          merged.totalPrice = Math.max(mergedSell, sell);
        } else if (mergedSell <= 0) {
          merged.totalPrice = sell;
        }
      }
      if (displayLabel) {
        merged.reference = displayLabel;
        merged.description = displayLabel;
      }
      if (lineTaxable) {
        merged.isLaborTaxable = true;
        merged.isTaxable = true;
      }
      return;
    }

    laborByKey.set(mergeKey, {
      ...item,
      dataType: "Labor",
      source: "Labor",
      reference: displayLabel,
      description: displayLabel,
      totalPrice: sell,
      totalCost: cost,
      isLaborTaxable: lineTaxable,
      isTaxable: lineTaxable,
      _officeWsMerged: true,
    });
  };

  for (const item of summaryRows || []) {
    if (isOfficeWorkSummaryLaborRow(item)) {
      absorbLabor(item);
    } else {
      materialRows.push(item);
    }
  }

  for (const item of extraLaborRows) {
    if (isOfficeWorkSummaryLaborRow(item)) {
      absorbLabor(item);
    }
  }

  const mergedCrewKeys = new Set();
  for (const entry of crewEntries || []) {
    const crewTotals = crewEntryWorkSummaryTotals(entry, fieldCopies);
    if (!crewTotals.mergeKey) continue;
    mergedCrewKeys.add(crewTotals.mergeKey);
  }

  for (const [mergeKey, merged] of laborByKey.entries()) {
    const { cost, sell } = sumWorkSummaryTotalsForKey(
      mergeKey,
      fieldCopies,
      crewEntries
    );
    if (cost > 0) merged.totalCost = cost;
    if (sell > 0) merged.totalPrice = sell;
  }

  return {
    rows: [...materialRows, ...Array.from(laborByKey.values())],
    mergedCrewKeys,
  };
}
