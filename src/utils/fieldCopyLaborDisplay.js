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

export function isFieldCopyLaborContext(item) {
  if (!item) return false;
  if (item.source === "Labor") return true;
  return String(item.reference || "")
    .toUpperCase()
    .includes("LABOR");
}

function hasStoredUnitPrice(item) {
  const p = item?.price;
  return (
    p != null &&
    p !== "" &&
    !Number.isNaN(Number(p)) &&
    Number(p) > 0
  );
}

/** Source=Labor / Lump Sum / labor-style lines: PRICE shows line total when no unit price. */
export function isLineTotalAsPriceColumnSource(item) {
  if (!item) return false;
  const src = String(item?.source ?? "");
  const typeStr = String(item?.type ?? "");
  if (src === "Labor" || src.includes("Lump Sum") || typeStr.includes("Lump Sum")) {
    return true;
  }
  // HARDSCAPE LABOR (KRISH) etc. — lump-sum sell total, no unit price in DB
  if (isFieldCopyLaborContext(item) && !hasStoredUnitPrice(item)) {
    return true;
  }
  return false;
}

/** Hide crew-aggregated labor row when a Source=Labor line already covers this job type. */
export function shouldSkipAggregatedLaborPdfRow(labor, groupItems, fieldCopies) {
  return (
    hasLaborSourceLineForJobType(groupItems, labor?.jobType) ||
    hasLaborSourceLineForJobType(fieldCopies, labor?.jobType)
  );
}

/** Label like "HARDSCAPE LUMP SUM LABOR" — not shown on no-bid office copy table. */
export function isLumpSumLaborLabel(text) {
  const s = String(text || "")
    .trim()
    .toUpperCase();
  return s.includes("LUMP SUM") && s.includes("LABOR");
}

/** Field-copy / summarized table row that represents lump-sum labor (duplicate of crew row). */
export function isLumpSumLaborFieldCopyItem(item) {
  if (!item) return false;
  const ref = String(item.reference || item.description || "").trim();
  if (isLumpSumLaborLabel(ref)) return true;
  const src = String(item.source || "").toUpperCase();
  const type = String(item.type || "").toUpperCase();
  if (src.includes("LUMP SUM") && (ref.toUpperCase().includes("LABOR") || type.includes("LABOR"))) {
    return true;
  }
  return false;
}

/** Crew labor entry whose job type resolves to a lump-sum labor label. */
export function isLumpSumLaborCrewEntry(labor, formDataJobType) {
  if (!labor) return false;
  const jt = String(labor.jobType || "").toUpperCase();
  if (jt.includes("LUMP SUM")) return true;
  const label = resolveFieldCopyDisplayJobType({
    jobType: labor.jobType,
    formDataJobType,
  });
  return isLumpSumLaborLabel(label ? `${label} LABOR` : "");
}

/** Source=Labor contractor line (e.g. LANDSCAPE LABOR (DEANS STUMP REMOVAL)). */
export function isContractorSourceLaborSummaryRow(item) {
  if (!item || String(item?.source || "") !== "Labor") return false;
  const vendor = String(item?.vendorName || item?.vendor || "").trim();
  if (vendor) return true;
  const typeStr = String(item?.type || "").toLowerCase();
  if (typeStr.includes("contract")) return true;
  const ref = String(item?.reference || item?.description || "").toUpperCase();
  if (!ref.includes("LABOR")) return false;
  const parenChunks = ref.match(/\(([^)]+)\)/g) || [];
  return parenChunks.some((chunk) => {
    const inner = chunk.slice(1, -1).trim();
    return inner && inner !== "CONTRACTOR" && inner !== "F&G";
  });
}

/** Source=Labor contractor / lump-sum lines (no crew qty) — not hourly price × qty. */
export function isLumpSumSourceLaborRow(item) {
  if (!item || String(item?.source || "").toLowerCase() !== "labor") return false;
  if (isContractorSourceLaborSummaryRow(item)) return true;
  const qty = Number(item?.quantity);
  return !(Number.isFinite(qty) && qty > 0);
}

/** Sell total for lump-sum Source=Labor: cost + markup (ignore stray hourly price field). */
export function getLumpSumSourceLaborLineTotal(item) {
  const unitCost = Number(item?.cost) || 0;
  const markupPct = parseFloat(item?.markup ?? item?.markUp) || 0;
  if (unitCost > 0) {
    return Math.round((unitCost * (1 + markupPct / 100)) * 100) / 100;
  }
  const stored = Number(item?.totalPrice);
  if (stored > 0 && !Number.isNaN(stored)) return stored;
  return 0;
}

/**
 * Hide contractor Source=Labor from Work Summary when crew labor exists for same job type
 * (Materials table still shows the line; summary shows JOB TYPE LABOR only).
 */
function workSummaryRowJobTypeKey(item) {
  const fromField = normalizeJobTypeKey(item?.jobType || item?.type);
  if (fromField) return fromField;
  const ref = String(item?.reference || item?.description || "").toUpperCase();
  const m = ref.match(/^([A-Z][A-Z\s]*?)\s+LABOR\b/);
  if (m) return normalizeJobTypeKey(m[1]);
  return "";
}

export function shouldHideContractorLaborWorkSummaryRow(
  item,
  { laborData, fieldLaborData, laborManHoursByJobType } = {}
) {
  if (!isContractorSourceLaborSummaryRow(item)) return false;
  const key = workSummaryRowJobTypeKey(item);
  if (!key) return false;

  const jobTypeMatches = (l) => normalizeJobTypeKey(l?.jobType) === key;

  for (const l of laborData || []) {
    if (!jobTypeMatches(l)) continue;
    if (Number(l?.totalPrice) > 0) return true;
  }
  for (const l of fieldLaborData || []) {
    if (!jobTypeMatches(l)) continue;
    if (Number(l?.manHours) > 0 || Number(l?.totalPrice) > 0) return true;
  }
  if (laborManHoursByJobType && typeof laborManHoursByJobType === "object") {
    for (const [jt, h] of Object.entries(laborManHoursByJobType)) {
      if (normalizeJobTypeKey(jt) === key && Number(h) > 0) return true;
    }
  }
  return false;
}

/** Field Copy PDF — Labor unit price (Add Field Copy formula, not 4× view logic). */
export function getFieldCopyLaborLineDisplayPrice(item) {
  if (!item) return null;
  if (isLumpSumSourceLaborRow(item)) {
    const total = getLumpSumSourceLaborLineTotal(item);
    return total > 0 ? total : null;
  }
  const priceVal =
    item.price != null && item.price !== "" ? Number(item.price) : null;
  if (priceVal != null && !Number.isNaN(priceVal) && priceVal > 0) {
    return priceVal;
  }
  const qty = Number(item.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const totalVal =
    item.totalPrice != null && item.totalPrice !== ""
      ? Number(item.totalPrice)
      : null;
  if (totalVal != null && !Number.isNaN(totalVal) && totalVal > 0) {
    return totalVal / qtySafe;
  }
  const unitCost = Number(item.cost) || 0;
  const markupPct = parseFloat(item.markup ?? item.markUp) || 0;
  if (unitCost > 0) {
    return unitCost * (1 + markupPct / 100);
  }
  return null;
}

/** Field Copy PDF — Labor line total (stored total or price × qty). */
export function getFieldCopyLaborLineDisplayTotal(item) {
  if (!item) return 0;
  if (isLumpSumSourceLaborRow(item)) {
    return getLumpSumSourceLaborLineTotal(item);
  }
  const stored = Number(item.totalPrice);
  if (stored > 0 && !Number.isNaN(stored)) return stored;
  const unitPrice = getFieldCopyLaborLineDisplayPrice(item);
  const qty = Number(item.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  if (unitPrice != null && unitPrice > 0) {
    return Math.round(unitPrice * qtySafe * 100) / 100;
  }
  const unitCost = Number(item.cost) || 0;
  const markupPct = parseFloat(item.markup ?? item.markUp) || 0;
  if (unitCost > 0) {
    return Math.round((unitCost + (unitCost * markupPct) / 100) * 100) / 100;
  }
  return 0;
}

export function buildLaborManHoursByJobType(laborEntries) {
  const map = {};
  if (!Array.isArray(laborEntries)) return map;
  for (const entry of laborEntries) {
    const jt = String(entry?.jobType || "").trim().toUpperCase();
    const h = Number(entry?.manHours || 0);
    if (jt && h > 0) {
      map[jt] = (map[jt] || 0) + h;
    }
  }
  return map;
}

/** Match job type against hours/rate maps (exact key, then fuzzy). */
export function lookupLaborMapValue(map, jobTypeLabel) {
  if (!map || jobTypeLabel == null || jobTypeLabel === "") return 0;
  const key = String(jobTypeLabel).trim().toUpperCase();
  if (!key) return 0;
  const direct = Number(map[key]);
  if (direct > 0 && !Number.isNaN(direct)) return direct;
  const nk = normalizeJobTypeKey(key);
  if (!nk) return 0;
  for (const [mapKey, val] of Object.entries(map)) {
    const mk = normalizeJobTypeKey(mapKey);
    if (!mk) continue;
    if (mk === nk || mk.includes(nk) || nk.includes(mk)) {
      const n = Number(val);
      if (n > 0 && !Number.isNaN(n)) return n;
    }
  }
  return 0;
}

/** Crew labor row man hours (fieldLaborData / laborData entry). */
export function getFieldCopyPdfLaborManHours(labor, laborManHoursByJobType) {
  const direct = Number(labor?.manHours);
  if (direct > 0 && !Number.isNaN(direct)) return direct;
  const label =
    resolveFieldCopyDisplayJobType({ jobType: labor?.jobType }) ||
    String(labor?.jobType || "").trim().toUpperCase();
  return label ? lookupLaborMapValue(laborManHoursByJobType, label) : 0;
}

/**
 * Unit PRICE for field-copy tables/PDF — matches View Office Copy.
 * Materials: stored unit price only. Labor: Add Field Copy labor formula.
 */
export function getFieldCopyLineDisplayPrice(item) {
  if (!item) return null;
  if (item.source === "Labor") {
    return getFieldCopyLaborLineDisplayPrice(item);
  }
  if (isLineTotalAsPriceColumnSource(item)) {
    const total = getOfficeFieldCopyLineTotal(item);
    return total > 0 ? total : null;
  }
  return getOfficeFieldCopyLinePrice(item);
}

/** Line TOTAL — matches View Office Copy (price × qty; labor uses labor helper). */
export function getFieldCopyLineDisplayTotal(item) {
  return getOfficeFieldCopyLineTotal(item);
}

/**
 * Line COST — same as View Office Copy (unit cost × qty; else price ÷ 2 × qty).
 */
export function getFieldCopyLineDisplayCost(item) {
  return getOfficeFieldCopyLineCost(item);
}

function officeLineQty(item) {
  const qty = Number(item?.quantity);
  return Number.isFinite(qty) && qty > 0 ? qty : 1;
}

function officeUnitPrice(item) {
  const p = item?.price;
  if (p === null || p === undefined || p === "") return null;
  const n = Number(p);
  return !Number.isNaN(n) && n > 0 ? n : null;
}

function officeUnitCost(item) {
  const c = item?.cost;
  if (c === null || c === undefined || c === "") return null;
  const n = Number(c);
  return !Number.isNaN(n) && n > 0 ? n : null;
}

/** View Office Copy — COST: unit cost × qty; else (unit price ÷ 2) × qty. */
export function getOfficeFieldCopyLineCost(item) {
  if (!item) return 0;
  const qty = officeLineQty(item);
  const unitCost = officeUnitCost(item);
  if (unitCost != null) {
    return Math.round(unitCost * qty * 100) / 100;
  }
  const unitPrice = officeUnitPrice(item);
  if (unitPrice != null) {
    return Math.round((unitPrice / 2) * qty * 100) / 100;
  }
  return 0;
}

/** View Office Copy — PRICE column: stored unit price only. */
export function getOfficeFieldCopyLinePrice(item) {
  if (isLumpSumSourceLaborRow(item)) return null;
  return officeUnitPrice(item);
}

/** View Office Copy — TOTAL: price × quantity when price exists; else stored total. */
export function getOfficeFieldCopyLineTotal(item) {
  if (!item) return 0;
  if (isLumpSumSourceLaborRow(item)) {
    return getLumpSumSourceLaborLineTotal(item);
  }
  const qty = officeLineQty(item);
  const unitPrice = officeUnitPrice(item);

  if (unitPrice != null) {
    return Math.round(unitPrice * qty * 100) / 100;
  }

  const stored = Number(item?.totalPrice);
  if (stored > 0 && !Number.isNaN(stored)) return stored;

  if (isFieldCopyLaborContext(item)) {
    return getFieldCopyLaborLineDisplayTotal(item);
  }
  return 0;
}

/** Office / Field Copy table row: cost, price, total (Labor uses Add-formula, not 4×). */
export function getOfficeFieldCopyRowCalculations(item) {
  const isLaborLine = isFieldCopyLaborContext(item);
  const lineCost = getOfficeFieldCopyLineCost(item);
  const markupVal = item?.markup ?? item?.markUp ?? null;
  const displayTotal = getOfficeFieldCopyLineTotal(item);
  const unitPrice = getOfficeFieldCopyLinePrice(item);
  // Source=Labor / Lump Sum / labor lines without unit price → PRICE = line total.
  let displayPrice = isLineTotalAsPriceColumnSource(item)
    ? displayTotal > 0
      ? displayTotal
      : null
    : unitPrice;
  if (
    (displayPrice == null || !(Number(displayPrice) > 0)) &&
    displayTotal > 0 &&
    isLineTotalAsPriceColumnSource(item)
  ) {
    displayPrice = displayTotal;
  }

  const priceVal = officeUnitPrice(item);
  const totalVal =
    item?.totalPrice != null && item?.totalPrice !== ""
      ? Number(item.totalPrice)
      : null;
  const unitCostVal = officeUnitCost(item) ?? 0;
  const totalCostVal =
    item?.totalCost != null && item?.totalCost !== ""
      ? Number(item.totalCost)
      : 0;

  const displayQty =
    item?.quantity != null && item?.quantity !== ""
      ? Number(item.quantity)
      : (() => {
          if (priceVal != null && priceVal > 0 && totalVal != null && totalVal > 0) {
            return totalVal / priceVal;
          }
          if (unitCostVal > 0 && totalCostVal > 0) {
            return totalCostVal / unitCostVal;
          }
          return null;
        })();

  const qtyText =
    displayQty != null && Number.isFinite(displayQty) && displayQty > 0
      ? Number.isInteger(displayQty)
        ? String(displayQty)
        : displayQty.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
      : item?.quantity
        ? String(item.quantity)
        : "";

  return {
    isLaborLine,
    lineCost,
    displayPrice,
    markupVal,
    displayTotal,
    qtyText,
  };
}

export function isMongoObjectIdString(value) {
  return /^[a-f0-9]{24}$/i.test(String(value ?? "").trim());
}

/** Human-readable job type for Field Copy download (not Mongo ObjectId). */
export function resolveFieldCopyDisplayJobType({ jobType, formDataJobType } = {}) {
  for (const c of [jobType, formDataJobType]) {
    const s = String(c ?? "").trim();
    if (s && !isMongoObjectIdString(s)) return s.toUpperCase();
  }
  const fallback = String(jobType ?? formDataJobType ?? "").trim();
  return fallback ? fallback.toUpperCase() : "";
}

/** Office field-copy group job type (avoid mapping ObjectId → project default job type). */
export function resolveOfficeFieldCopyGroupJobType(
  group,
  { jobTypesCatalog } = {}
) {
  const candidates = [group?.jobType, group?.jobTypeName, group?.type];
  for (const c of candidates) {
    const s = String(c ?? "").trim();
    if (!s) continue;
    if (!isMongoObjectIdString(s)) return s.toUpperCase();
    if (Array.isArray(jobTypesCatalog)) {
      const match = jobTypesCatalog.find(
        (j) => String(j?._id || j?.id || "") === s
      );
      if (match?.jobName) {
        return String(match.jobName).trim().toUpperCase();
      }
    }
  }
  return "";
}

/** Standard hourly rate from admin job-type catalog. */
export function lookupJobTypeCatalogRate(jobTypesCatalog, jobTypeLabel) {
  if (!Array.isArray(jobTypesCatalog) || !jobTypeLabel) return 0;
  const nk = normalizeJobTypeKey(jobTypeLabel);
  if (!nk) return 0;
  for (const j of jobTypesCatalog) {
    if (normalizeJobTypeKey(j?.jobName) === nk) {
      const p = Number(j?.price);
      if (p > 0 && !Number.isNaN(p)) return p;
    }
  }
  return 0;
}

/** Prefer primary map values; fill missing keys from fallback. */
export function mergeLaborMapMissingKeys(primary, fallback) {
  const out = { ...(primary || {}) };
  if (!fallback) return out;
  for (const [key, val] of Object.entries(fallback)) {
    const n = Number(val);
    if (!(Number(out[key]) > 0) && n > 0 && !Number.isNaN(n)) {
      out[key] = n;
    }
  }
  return out;
}

/**
 * Field Copy download — hide duplicate crew-hours line already shown as JOB TYPE LABOR row.
 */
export function isFieldCopyCrewHoursAggregateLine(item, crewManHours) {
  if (!item || item.source === "Labor") return false;
  const qty = Number(item.quantity);
  const hours = Number(crewManHours);
  const hasOperationalMeta =
    String(item?.vendorName || "").trim() !== "" ||
    String(item?.invoice || "").trim() !== "" ||
    String(item?.PO || "").trim() !== "";
  // Only skip qty==hours rows when they look like auto-generated aggregates.
  if (
    hours > 0 &&
    qty > 0 &&
    Math.abs(qty - hours) < 0.01 &&
    isFieldCopyLaborContext(item) &&
    !hasStoredUnitPrice(item) &&
    !hasOperationalMeta
  ) {
    return true;
  }
  if (isMongoObjectIdString(item?.reference)) return true;
  if (isMongoObjectIdString(item?.jobType)) return true;
  if (isMongoObjectIdString(item?.type)) return true;
  return false;
}

/** Hourly crew rate from labor record — never derive from line total ÷ hours. */
export function resolveFieldCopyCrewUnitRate(laborLike) {
  const direct = Number(laborLike?.jobTypeCost) || 0;
  if (direct > 0 && direct < 500) return direct;
  const cost = Number(laborLike?.cost) || 0;
  if (cost > 0 && cost < 500) return cost;
  const price = Number(laborLike?.price) || 0;
  if (price > 0 && price < 500) return price;
  return 0;
}

/**
 * Normalize crew labor for Field Copy download: qty = hours, cost = hours × jobTypeCost.
 */
export function enrichFieldCopyDownloadCrewLabor(
  labor,
  { displayJobType, formDataJobType, manHoursFallback = 0, resolveRateForJobType }
) {
  const label =
    resolveFieldCopyDisplayJobType({
      jobType: labor?.jobType,
      formDataJobType,
    }) || displayJobType;
  if (!label) return null;

  const manHours =
    Number(labor?.manHours) > 0
      ? Number(labor.manHours)
      : Number(manHoursFallback) > 0
        ? Number(manHoursFallback)
        : 0;

  let unitRate = resolveFieldCopyCrewUnitRate(labor);
  if (!(unitRate > 0) && typeof resolveRateForJobType === "function") {
    unitRate = resolveRateForJobType(label);
  }
  if (!(unitRate > 0) || !(manHours > 0)) return null;

  const lineCost = Math.round(manHours * unitRate * 100) / 100;

  return {
    ...labor,
    jobType: label,
    manHours,
    jobTypeCost: unitRate,
    cost: unitRate,
    price: unitRate,
    totalCost: lineCost,
    totalPrice: lineCost,
  };
}

/** Field Copy download PDF — same crew row logic as office/customer copy views. */
export function getFieldCopyDownloadCrewLaborRowFields(
  labor,
  laborManHoursByJobType,
  laborHourlyRateByJobType,
  formDataJobType,
  resolveRateForJobType
) {
  return getOfficeFieldCopyCrewLaborRowFields(
    labor,
    laborManHoursByJobType,
    laborHourlyRateByJobType,
    formDataJobType,
    resolveRateForJobType
  );
}

/**
 * View Office Copy — crew / field labor hours row (separate from Source=Labor lines).
 * Qty = man hours; description = JOB TYPE + LABOR; cost = hours × unit cost rate.
 */
export function getOfficeFieldCopyCrewLaborRowFields(
  labor,
  laborManHoursByJobType,
  laborHourlyRateByJobType,
  formDataJobType,
  resolveRateForJobType
) {
  const label =
    resolveFieldCopyDisplayJobType({
      jobType: labor?.jobType,
      formDataJobType,
    }) || String(labor?.jobType || "").trim().toUpperCase();
  const description = label ? `${label} LABOR` : "LABOR";

  let manHours = getFieldCopyPdfLaborManHours(labor, laborManHoursByJobType);
  if (!(manHours > 0)) {
    const q = Number(labor?.quantity);
    if (q > 0 && !Number.isNaN(q)) manHours = q;
  }
  let hourly =
    Number(labor?.jobTypeCost) > 0
      ? Number(labor.jobTypeCost)
      : lookupLaborMapValue(laborHourlyRateByJobType, label);
  if (!(hourly > 0)) {
    hourly = resolveFieldCopyCrewUnitRate(labor);
  }
  if (!(hourly > 0) && typeof resolveRateForJobType === "function") {
    hourly = Number(resolveRateForJobType(label) || 0);
  }

  const storedTotal = Number(labor?.totalPrice) || 0;
  const storedLineCost = Number(labor?.totalCost) || 0;

  if (!(manHours > 0) && storedTotal > 0 && hourly > 0) {
    manHours = Math.round((storedTotal / hourly) * 100) / 100;
  }
  if (!(manHours > 0) && storedLineCost > 0 && hourly > 0) {
    manHours = Math.round((storedLineCost / hourly) * 100) / 100;
  }

  const billAmount =
    storedTotal > 0 ? storedTotal : storedLineCost > 0 ? storedLineCost : 0;
  if (billAmount > 0 && (!(manHours > 0) || !(hourly > 0))) {
    if (!(hourly > 0) && typeof resolveRateForJobType === "function") {
      hourly = Number(resolveRateForJobType(label) || 0);
    }
    if (!(manHours > 0) && hourly > 0) {
      manHours = Math.round((billAmount / hourly) * 100) / 100;
    }
    if (manHours > 0 && !(hourly > 0)) {
      hourly = Math.round((billAmount / manHours) * 100) / 100;
    }
  }

  const unitCost =
    Number(labor?.cost) > 0
      ? Number(labor.cost)
      : hourly > 0
        ? hourly
        : manHours > 0 && storedLineCost > 0
          ? storedLineCost / manHours
          : manHours > 0 && storedTotal > 0
            ? storedTotal / manHours
            : 0;

  let lineCost =
    manHours > 0 && unitCost > 0
      ? Math.round(manHours * unitCost * 100) / 100
      : storedLineCost > 0
        ? storedLineCost
        : 0;
  if (lineCost <= 0 && storedTotal > 0) {
    lineCost = storedTotal;
  }

  let displayPrice =
    hourly > 0
      ? hourly
      : unitCost > 0
        ? unitCost
        : manHours > 0 && storedTotal > 0
          ? Math.round((storedTotal / manHours) * 100) / 100
          : manHours > 0 && billAmount > 0
            ? Math.round((billAmount / manHours) * 100) / 100
            : null;
  if (displayPrice == null && hourly > 0) displayPrice = hourly;
  const displayTotal =
    storedTotal > 0
      ? storedTotal
      : lineCost > 0
        ? lineCost
        : manHours > 0 && displayPrice != null
          ? Math.round(manHours * displayPrice * 100) / 100
          : 0;

  const qtyText =
    manHours > 0
      ? Number.isInteger(manHours)
        ? String(manHours)
        : manHours.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
      : "";

  const markupVal = labor?.markup ?? labor?.markUp ?? null;

  return {
    description,
    qtyText,
    lineCost,
    displayPrice,
    markupVal,
    displayTotal,
    manHours,
  };
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

/** Customer Copy invoice summary — strip "(DEANS)" / vendor suffixes from labor labels. */
export function stripLaborReferenceParentheses(text) {
  return String(text ?? "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Customer Copy table/PDF — labor descriptions without vendor text in (...).
 * Materials (non-labor) keep full reference.
 */
export function getCustomerCopyDisplayDescription(item) {
  const ref = String(item?.reference || item?.description || "").trim();
  if (!ref) return "";
  const isLaborLine =
    item?.dataType === "Labor" ||
    String(item?.source || "").toLowerCase() === "labor" ||
    isFieldCopyLaborContext(item);
  if (isLaborLine) {
    return stripLaborReferenceParentheses(ref).toUpperCase();
  }
  return ref.toUpperCase();
}

/**
 * Customer Copy Materials table — merge labor/crew rows when display description matches exactly.
 */
export function getCustomerCopyMaterialsTableMergeKey(item) {
  if (!item) return null;
  const isLaborLine =
    item?.dataType === "Labor" ||
    String(item?.source || "").toLowerCase() === "labor" ||
    isFieldCopyLaborContext(item);
  if (!isLaborLine) return null;
  const desc = getCustomerCopyDisplayDescription(item);
  return desc || null;
}

/** Customer Copy Materials table — LANDSCAPE/HARDSCAPE LABOR rows (hide qty & cost). */
export function isLandscapeOrHardscapeLaborLabel(text) {
  const s = stripLaborReferenceParentheses(text).toUpperCase();
  if (!s.includes("LABOR")) return false;
  return s.includes("LANDSCAPE") || s.includes("HARDSCAPE");
}

export function resolveCustomerCopyInvoiceLaborJobType(item) {
  const jt = resolveFieldCopyDisplayJobType({ jobType: item?.jobType });
  if (jt) return jt;
  const ref = stripLaborReferenceParentheses(item?.reference || "").toUpperCase();
  const m = ref.match(/^([A-Z][A-Z\s]*?)\s+LABOR\b/);
  return m ? String(m[1]).trim().toUpperCase() : "";
}

/** Standard invoice label for a job type, e.g. "LANDSCAPE LABOR". */
export function getStandardJobTypeLaborLabel(jobType) {
  const jt = resolveCustomerCopyInvoiceLaborJobType({ jobType });
  return jt ? `${jt} LABOR` : "";
}

/** Description only — strip "(...)" suffixes; brackets are not compared. */
export function getCustomerCopyInvoiceDescriptionBase(item) {
  if (!item) return "";
  if (item.dataType === "Labor") {
    return getStandardJobTypeLaborLabel(item.jobType);
  }
  const ref = String(item.reference || item.description || "").trim();
  return stripLaborReferenceParentheses(ref).toUpperCase();
}

/**
 * Customer Copy invoice summary — compare description base only (no bracket text).
 * Matches crew job-type line when base equals e.g. "LANDSCAPE LABOR".
 */
export function customerCopyInvoiceDescriptionMatchesLaborType(item) {
  if (!item) return false;
  const standard = getStandardJobTypeLaborLabel(item.jobType);
  if (!standard) return false;
  if (item.dataType === "Labor") return true;
  if (item.dataType === "Material" && String(item.source || "") === "Labor") {
    const base = getCustomerCopyInvoiceDescriptionBase(item);
    return !!base && base === standard;
  }
  return false;
}

/**
 * Customer Copy invoice summary — merge same description base (ignore parentheses).
 * Different base descriptions stay on separate lines.
 */
export function getCustomerCopyInvoiceLaborMergeKey(item) {
  if (!item) return null;
  const isContractor =
    item.dataType === "Material" && String(item.source || "") === "Labor";
  const isCrew = item.dataType === "Labor";
  if (!isContractor && !isCrew) return null;

  const jtKey = normalizeJobTypeKey(resolveCustomerCopyInvoiceLaborJobType(item));
  if (!jtKey) return null;

  const taxable = !!(item.isLaborTaxable ?? item.isTaxable);
  const standard = getStandardJobTypeLaborLabel(item.jobType);
  const base = getCustomerCopyInvoiceDescriptionBase(item);

  if (!base) return null;

  if (item.dataType === "Labor" || base === standard) {
    return `${jtKey}|${taxable}|std`;
  }

  return `${jtKey}|${taxable}|ref:${base.replace(/\s+/g, " ")}`;
}

export function mergeCustomerCopyInvoiceSummaryRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;

  const mergedByKey = new Map();
  const result = [];

  for (const row of rows) {
    const key = getCustomerCopyInvoiceLaborMergeKey(row);
    if (!key) {
      result.push(row);
      continue;
    }

    const price = Number(row.totalPrice) || 0;
    const existing = mergedByKey.get(key);

    if (existing) {
      existing.totalPrice += price;
      if (row.totalCost != null) {
        existing.totalCost =
          (Number(existing.totalCost) || 0) + (Number(row.totalCost) || 0);
      }
      continue;
    }

    const jobType = resolveCustomerCopyInvoiceLaborJobType(row);
    const matchesStd = customerCopyInvoiceDescriptionMatchesLaborType(row);
    const normalized = matchesStd
      ? {
          ...row,
          dataType: "Labor",
          jobType: jobType || row.jobType,
          reference: "",
        }
      : {
          ...row,
          jobType: jobType || row.jobType,
        };
    mergedByKey.set(key, normalized);
    result.push(normalized);
  }

  return result;
}
