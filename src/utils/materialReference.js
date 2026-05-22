/**
 * When a line has a vendor, stored/display reference is: "Material name (vendor)".
 */

export function formatMaterialReferenceWithVendor(materialName, vendorName) {
  const m = (materialName ?? "").trim();
  const v = (vendorName ?? "").trim();
  if (!m) return m;
  if (!v) return m;
  return `${m} (${v})`;
}

/** Strip trailing " (vendor)" if it matches the given vendor, else last "(...)" at end. */
export function materialNameBaseForEdit(storedReference, vendorName) {
  const ref = (storedReference ?? "").trim();
  if (!ref) return "";
  const v = (vendorName ?? "").trim();
  if (v) {
    const suffix = ` (${v})`;
    if (ref.endsWith(suffix)) {
      return ref.slice(0, -suffix.length);
    }
  }
  return ref.replace(/\s+\([^()]*\)\s*$/, "").trim();
}

/** Form row: keep reference as full stored string; referenceBase = material name only for inputs. */
export function applyReferenceVendorToForm(form) {
  if (!form) return form;
  const v = (form.vendorName && String(form.vendorName).trim()) || "";
  const base =
    form.referenceBase !== undefined && form.referenceBase !== null
      ? String(form.referenceBase)
      : materialNameBaseForEdit(String(form.reference || ""), form.vendorName);
  const next = { ...form, referenceBase: base };
  next.reference = v ? formatMaterialReferenceWithVendor(base, v) : base;
  return next;
}

/**
 * Field Copy line with source "Other":
 * - User enters unit **Price** (sell / correct price, e.g. 30).
 * - **Cost** = half of that price (e.g. 15).
 * - `totalCost` = unit cost × qty; `totalPrice` = unit price × qty.
 */
export function recalcOtherFieldCopyLine(form) {
  if (!form || form.source !== "Other") return { ...form };
  const f = { ...form };
  const qty = parseFloat(f.quantity) || 0;
  const markupPct = parseFloat(f.markup ?? f.markUp) || 0;
  const unitSell = parseFloat(f.price) || 0;
  const unitCost =
    unitSell > 0 ? Math.round((unitSell / 2) * 10000) / 10000 : 0;
  f.cost = unitCost > 0 ? unitCost : "";
  f.markUp = markupPct;
  f.markup = markupPct;
  f.unitSellPrice = Number.isFinite(unitSell) ? unitSell : "";
  if (qty > 0 && unitSell > 0 && unitCost > 0) {
    f.totalCost = Math.round(unitCost * qty * 100) / 100;
    f.totalPrice = Math.round(unitSell * qty * 100) / 100;
  } else {
    f.totalCost = "";
    f.totalPrice = "";
  }
  return f;
}

/**
 * Field Copy line with source "F&G":
 * When admin material has no unit cost from backend, use half of unit price.
 */
export function ensureFgCostFromPrice(form) {
  if (!form || form.source !== "F&G") return { ...form };
  const f = { ...form };
  const unitPrice = parseFloat(f.price) || 0;
  if (unitPrice <= 0) return f;
  const existing = parseFloat(f.cost);
  const hasBackendCost =
    f.cost !== "" &&
    f.cost !== null &&
    f.cost !== undefined &&
    !Number.isNaN(existing) &&
    existing > 0;
  if (hasBackendCost) return f;
  const unitCost = Math.round((unitPrice / 2) * 10000) / 10000;
  return { ...f, cost: unitCost };
}

/** Load saved Other row: DB `cost` = unit cost, `price` = unit sell. */
export function hydrateOtherFieldCopyFromApi(form) {
  if (!form || form.source !== "Other") return form;
  const f = { ...form };
  const ucDb = parseFloat(f.cost) || 0;
  const usDb = parseFloat(f.price) || 0;
  const unitSell = usDb > 0 ? usDb : ucDb > 0 ? ucDb * 2 : 0;
  const unitCost = unitSell > 0 ? unitSell / 2 : ucDb;
  f.price = unitSell > 0 ? unitSell : f.price;
  f.cost = unitCost > 0 ? unitCost : f.cost;
  f.unitSellPrice = unitSell > 0 ? unitSell : "";
  const qty = parseFloat(f.quantity) || 0;
  if (qty > 0 && unitCost > 0) {
    f.totalCost = Math.round(unitCost * qty * 100) / 100;
  }
  if (qty > 0 && unitSell > 0) {
    f.totalPrice = Math.round(unitSell * qty * 100) / 100;
  }
  return f;
}

/** API payload: sync reference, drop referenceBase. */
export function toPersistedCopy(form) {
  const synced = applyReferenceVendorToForm({ ...form });
  const { referenceBase, ...rest } = synced;
  if (rest.source === "Other") {
    const { unitSellPrice: _drop, ...base } = rest;
    const unitSell = parseFloat(base.price) || 0;
    const unitCost =
      unitSell > 0
        ? Math.round((unitSell / 2) * 10000) / 10000
        : parseFloat(base.cost) || 0;
    return {
      ...base,
      cost: unitCost,
      price: unitSell,
    };
  }
  return rest;
}

/** Empty Cost input for Other rows so placeholder "Enter Cost" is visible (not 0). */
export function otherFieldCopyCostDisplayValue(cost) {
  if (cost === "" || cost === null || cost === undefined) return "";
  const n = parseFloat(cost);
  if (Number.isNaN(n) || n === 0) return "";
  return cost;
}

/** Shown in Description / material name fields (no vendor suffix while typing). */
export function getMaterialNameInputValue(form) {
  if (!form) return "";
  if (form.referenceBase !== undefined && form.referenceBase !== null) {
    return String(form.referenceBase);
  }
  return materialNameBaseForEdit(String(form.reference || ""), form.vendorName);
}
