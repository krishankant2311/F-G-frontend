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
 * - Default: unit **Price** drives **Cost** (cost = price ÷ 2).
 * - When user edits **Cost**: price = cost × 2.
 * - `syncFrom`: "price" | "cost" | "preserve" (only line totals).
 */
export function recalcOtherFieldCopyLine(form, syncFrom = "price") {
  if (!form || form.source !== "Other") return { ...form };
  const f = { ...form };
  const qty = parseFloat(f.quantity) || 0;

  let unitCost = parseFloat(f.cost) || 0;
  let unitSell = parseFloat(f.price) || 0;

  if (syncFrom === "cost") {
    unitCost = parseFloat(f.cost) || 0;
    unitSell =
      unitCost > 0 ? Math.round(unitCost * 2 * 10000) / 10000 : 0;
    f.cost = unitCost > 0 ? unitCost : "";
    f.price = unitSell > 0 ? unitSell : "";
  } else if (syncFrom === "price") {
    unitSell = parseFloat(f.price) || 0;
    unitCost =
      unitSell > 0 ? Math.round((unitSell / 2) * 10000) / 10000 : 0;
    f.cost = unitCost > 0 ? unitCost : "";
    f.price = unitSell > 0 ? unitSell : f.price;
  }

  if (unitCost > 0 && unitSell > 0) {
    const autoMarkup = ((unitSell - unitCost) / unitCost) * 100;
    f.markup = Math.round(autoMarkup * 100) / 100;
    f.markUp = f.markup;
  }

  f.unitSellPrice = unitSell > 0 ? unitSell : "";
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

function roundFgUnitAmount(n) {
  return Math.round(n * 10000) / 10000;
}

/** F&G cost/price input — empty while typing; strip leading zeros (025 → 25). */
export function normalizeFgEditableUnitValue(raw) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (s === "" || s === ".") return "";
  const n = parseFloat(s);
  if (Number.isNaN(n) || n < 0) return "";
  return roundFgUnitAmount(n);
}

/** F&G — line totals + markup from unit cost/price × quantity. */
export function recalcFgFieldCopyLineTotals(form) {
  if (!form || form.source !== "F&G") return { ...form };
  const f = { ...form };
  const unitCost = parseFloat(f.cost) || 0;
  const unitPrice = parseFloat(f.price) || 0;
  const qty = parseFloat(f.quantity) || 0;
  if (qty > 0) {
    f.totalCost = unitCost > 0 ? Math.round(unitCost * qty * 100) / 100 : "";
    f.totalPrice = unitPrice > 0 ? Math.round(unitPrice * qty * 100) / 100 : "";
  }
  if (unitCost > 0 && unitPrice > 0) {
    f.markup = Math.round(((unitPrice - unitCost) / unitCost) * 10000) / 100;
    f.markUp = f.markup;
  }
  return f;
}

/**
 * F&G only — user edits cost or price: price = 2×cost, cost = ½×price.
 * Do not use on material select / API load (keep backend values).
 */
export function syncFgCostPriceOnUserEdit(form, changedField) {
  if (!form || form.source !== "F&G") return { ...form };
  const f = { ...form };

  if (changedField === "cost") {
    if (f.cost === "" || f.cost === null || f.cost === undefined) {
      return recalcFgFieldCopyLineTotals(f);
    }
    const c = parseFloat(f.cost);
    if (Number.isNaN(c)) return f;
    if (c > 0) {
      f.cost = roundFgUnitAmount(c);
      f.price = roundFgUnitAmount(c * 2);
    } else {
      f.cost = "";
      f.price = "";
    }
  } else if (changedField === "price") {
    if (f.price === "" || f.price === null || f.price === undefined) {
      return recalcFgFieldCopyLineTotals(f);
    }
    const p = parseFloat(f.price);
    if (Number.isNaN(p)) return f;
    if (p > 0) {
      f.price = roundFgUnitAmount(p);
      f.cost = roundFgUnitAmount(p / 2);
    } else {
      f.cost = "";
      f.price = "";
    }
  }

  return recalcFgFieldCopyLineTotals(f);
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

/**
 * Display-only (Customer/Office/PDF): unit sell = cost × (1 + markup%);
 * line total = unit sell × qty × (1 + markup%).
 * Add/Edit form still uses: totalPrice = cost + (cost × markup / 100).
 */
export function finalizeLaborSummaryRow(row) {
  if (!row || row.source !== "Labor") return row;
  const qty = parseFloat(row.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  const markupPct = parseFloat(row.markup ?? row.markUp) || 0;
  const lineCostTotal = parseFloat(row.cost) || 0;
  const unitCost =
    lineCostTotal > 0 && qtySafe > 0
      ? lineCostTotal / qtySafe
      : parseFloat(row.cost) || 0;
  const explicitPrice = parseFloat(row.price);
  const unitSell =
    explicitPrice > 0
      ? explicitPrice
      : unitCost > 0
        ? Math.round(unitCost * (1 + markupPct / 100) * 10000) / 10000
        : 0;
  const totalPrice =
    unitSell > 0
      ? Math.round(unitSell * qtySafe * (1 + markupPct / 100) * 100) / 100
      : parseFloat(row.totalPrice) || 0;
  return {
    ...row,
    quantity: qtySafe,
    cost: unitCost,
    price: unitSell,
    totalPrice,
    markup: markupPct,
    markUp: markupPct,
  };
}

/** Generate Customer Copy only: same as Add Field Copy Labor — cost + (cost × markup / 100). */
export function recalcLaborGenerateCustomerLine(form) {
  if (!form || form.source !== "Labor") return form;
  const cost = parseFloat(form.cost) || 0;
  const markupPct = parseFloat(form.markup ?? form.markUp) || 0;
  const totalPrice = cost + (cost * markupPct) / 100;
  return {
    ...form,
    totalCost: cost,
    totalPrice,
    markup: markupPct,
    markUp: markupPct,
  };
}

/** API payload: sync reference, drop referenceBase. */
export function toPersistedCopy(form) {
  const synced = applyReferenceVendorToForm({ ...form });
  const { referenceBase, ...rest } = synced;
  if (rest.source === "Other") {
    const { unitSellPrice: _drop, ...base } = rest;
    const unitSell = parseFloat(base.price) || 0;
    const storedCost = parseFloat(base.cost) || 0;
    const unitCost =
      storedCost > 0
        ? storedCost
        : unitSell > 0
          ? Math.round((unitSell / 2) * 10000) / 10000
          : 0;
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

/** Labor / Lump Sum — allow decimal typing in cost & total price (e.g. 1.25, 1.). */
export function normalizeLaborLumpSumEditableAmount(raw) {
  if (raw === "" || raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (s === "" || s === ".") return s;
  if (/^\d*\.?\d*$/.test(s)) return s;
  let out = "";
  let sawDot = false;
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !sawDot) {
      out += ".";
      sawDot = true;
    }
  }
  return out;
}

/** Shown in Description / material name fields (no vendor suffix while typing). */
export function getMaterialNameInputValue(form) {
  if (!form) return "";
  if (form.referenceBase !== undefined && form.referenceBase !== null) {
    return String(form.referenceBase);
  }
  return materialNameBaseForEdit(String(form.reference || ""), form.vendorName);
}
