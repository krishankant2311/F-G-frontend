import { finalizeLaborSummaryRow } from "./materialReference";

/** Normalize job type for loose matching (Pick up/Delivery vs PICK UP/DELIVERY). */
export function normalizeJobTypeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** First field-copy line with source Labor for this job type. */
export function findLaborSourceLine(items, jobType) {
  if (!items?.length || jobType == null || jobType === "") return null;
  const key = normalizeJobTypeKey(jobType);
  if (!key) return null;
  return (
    items.find((item) => {
      if (item?.source !== "Labor") return false;
      const typeKey = normalizeJobTypeKey(item.type);
      const jobKey = normalizeJobTypeKey(item.jobType);
      return typeKey === key || jobKey === key;
    }) || null
  );
}

export function hasLaborSourceLineForJobType(items, jobType) {
  return !!findLaborSourceLine(items, jobType);
}

/**
 * PDF / work-summary label for labor rows.
 * Source=Labor lines use the user Description (`reference`), not Job Type + "LABOR".
 */
export function getLaborPdfDescription({ labor, groupItems, fieldCopies }) {
  const fromGroup = findLaborSourceLine(groupItems, labor?.jobType);
  if (fromGroup?.reference) return fromGroup.reference;
  if (fromGroup?.description) return fromGroup.description;

  const fromFlat = findLaborSourceLine(fieldCopies, labor?.jobType);
  if (fromFlat?.reference) return fromFlat.reference;
  if (fromFlat?.description) return fromFlat.description;

  if (labor?.reference) return labor.reference;
  if (labor?.description) return labor.description;

  const jt = String(labor?.jobType || "").trim();
  return jt ? `${jt} LABOR` : "LABOR";
}

/** Hide crew-aggregated labor row when a Source=Labor line already covers this job type. */
export function shouldSkipAggregatedLaborPdfRow(labor, groupItems, fieldCopies) {
  return (
    hasLaborSourceLineForJobType(groupItems, labor?.jobType) ||
    hasLaborSourceLineForJobType(fieldCopies, labor?.jobType)
  );
}

/**
 * Unit PRICE for field-copy tables/PDF (matches Office Field Copy screen).
 * Uses price, else totalPrice÷qty, else cost + markup%.
 */
export function getFieldCopyLineDisplayPrice(item) {
  if (!item) return null;

  if (item.source === "Labor") {
    const row = finalizeLaborSummaryRow(item);
    return Number(row.price) > 0 ? Number(row.price) : null;
  }

  const qty = Number(item.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;

  const priceVal =
    item.price != null && item.price !== "" ? Number(item.price) : null;
  const totalVal =
    item.totalPrice != null && item.totalPrice !== ""
      ? Number(item.totalPrice)
      : null;

  if (priceVal != null && !Number.isNaN(priceVal) && priceVal > 0) {
    return priceVal;
  }
  if (totalVal != null && !Number.isNaN(totalVal) && totalVal > 0) {
    return totalVal / qtySafe;
  }

  const unitCost =
    item.cost != null && item.cost !== "" ? Number(item.cost) : 0;
  const markupRaw = item.markup ?? item.markUp ?? null;
  const markupPct =
    markupRaw != null &&
    markupRaw !== "" &&
    !Number.isNaN(Number(markupRaw))
      ? Number(markupRaw)
      : null;

  if (unitCost > 0 && markupPct != null) {
    return unitCost * (1 + markupPct / 100);
  }

  return null;
}

/** Line TOTAL for Source=Labor (markup on sell total). */
export function getFieldCopyLineDisplayTotal(item) {
  if (!item) return null;
  if (item.source === "Labor") {
    const row = finalizeLaborSummaryRow(item);
    return Number(row.totalPrice) > 0 ? Number(row.totalPrice) : null;
  }
  const totalVal =
    item.totalPrice != null && item.totalPrice !== ""
      ? Number(item.totalPrice)
      : null;
  if (totalVal != null && !Number.isNaN(totalVal) && totalVal > 0) {
    return totalVal;
  }
  const unitPrice = getFieldCopyLineDisplayPrice(item);
  const qty = Number(item.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  if (unitPrice != null && unitPrice > 0) {
    return unitPrice * qtySafe;
  }
  return null;
}

/** Line COST for tables/PDF: totalCost, else unit cost × quantity. */
export function getFieldCopyLineDisplayCost(item) {
  if (!item) return 0;

  const qty = Number(item.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;

  const totalCostVal =
    item.totalCost != null && item.totalCost !== ""
      ? Number(item.totalCost)
      : 0;
  const unitCostVal =
    item.cost != null && item.cost !== "" ? Number(item.cost) : 0;

  if (totalCostVal > 0) return totalCostVal;
  if (unitCostVal > 0) return unitCostVal * qtySafe;
  return 0;
}

export function formatFieldCopyAmount(value) {
  if (value == null || value === "" || Number.isNaN(Number(value))) {
    return "";
  }
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
