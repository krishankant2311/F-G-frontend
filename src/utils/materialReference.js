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

/** Material name for edit/display — strip only a trailing " (vendor)" when vendor matches. */
export function materialNameBaseForEdit(storedReference, vendorName) {
  const ref = (storedReference ?? "").trim();
  if (!ref) return "";
  const v = (vendorName ?? "").trim();
  if (v) {
    const suffix = ` (${v})`;
    if (ref.toUpperCase().endsWith(suffix.toUpperCase())) {
      return ref.slice(0, -suffix.length).trim();
    }
  }
  return ref;
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
  // Source=Labor: vendor stays in vendorName column only (not merged into reference).
  const mergeVendorIntoReference =
    v && String(form.source || "").trim() !== "Labor";
  next.reference = mergeVendorIntoReference
    ? formatMaterialReferenceWithVendor(base, v)
    : base;
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
  } else if (syncFrom === "markup") {
    unitCost = parseFloat(f.cost) || 0;
    const markupRaw = f.markup ?? f.markUp;
    const hasMarkupValue =
      markupRaw !== "" && markupRaw !== null && markupRaw !== undefined;
    const markupPct = hasMarkupValue ? parseFloat(markupRaw) : 0;
    if (unitCost > 0 && Number.isFinite(markupPct) && markupPct >= 0) {
      unitSell =
        Math.round(unitCost * (1 + markupPct / 100) * 10000) / 10000;
      f.price = unitSell > 0 ? unitSell : "";
    }
  }

  if (
    syncFrom !== "markup" &&
    syncFrom !== "preserve" &&
    unitCost > 0 &&
    unitSell > 0
  ) {
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

/** F&G — line totals from unit cost/price × quantity (does not overwrite markup). */
export function recalcFgFieldCopyLineTotals(form) {
  if (!form || form.source !== "F&G") return { ...form };
  const f = { ...form };
  const unitCost = parseFloat(f.cost) || 0;
  const unitPrice = parseFloat(f.price) || 0;
  const qty = parseFloat(f.quantity) || 0;
  if (qty > 0) {
    const roundedPrice = unitPrice > 0 ? roundFgUnitAmount(unitPrice) : 0;
    f.totalCost = unitCost > 0 ? Math.round(unitCost * qty * 100) / 100 : "";
    f.totalPrice =
      roundedPrice > 0 ? Math.round(roundedPrice * qty * 100) / 100 : "";
  } else {
    f.totalCost = "";
    f.totalPrice = "";
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
      f.cost = "";
      f.price = "";
      f.totalCost = "";
      f.totalPrice = "";
      return f;
    }
    const c = parseFloat(f.cost);
    if (Number.isNaN(c)) return f;
    if (c > 0) {
      f.cost = roundFgUnitAmount(c);
      f.price = roundFgUnitAmount(c * 2);
      f.markup = 100;
      f.markUp = 100;
    } else {
      f.cost = "";
      f.price = "";
      f.totalCost = "";
      f.totalPrice = "";
      return f;
    }
  } else if (changedField === "price") {
    if (f.price === "" || f.price === null || f.price === undefined) {
      f.cost = "";
      f.price = "";
      f.totalCost = "";
      f.totalPrice = "";
      return f;
    }
    const p = parseFloat(f.price);
    if (Number.isNaN(p)) return f;
    if (p > 0) {
      f.price = roundFgUnitAmount(p);
      f.cost = roundFgUnitAmount(p / 2);
      f.markup = 100;
      f.markUp = 100;
    } else {
      f.cost = "";
      f.price = "";
      f.totalCost = "";
      f.totalPrice = "";
      return f;
    }
  }

  return recalcFgFieldCopyLineTotals(f);
}

/** F&G — user edits markup %: derive unit price from unit cost, then line totals. */
export function syncFgLineFromMarkupEdit(form) {
  if (!form || form.source !== "F&G") return { ...form };
  const f = { ...form };
  const unitCost = parseFloat(f.cost);
  const markupRaw = f.markup ?? f.markUp;
  const hasMarkupValue =
    markupRaw !== "" && markupRaw !== null && markupRaw !== undefined;
  const markup = hasMarkupValue ? parseFloat(markupRaw) : 0;
  const qty = parseFloat(f.quantity) || 0;

  if (!Number.isFinite(unitCost) || unitCost <= 0) {
    return f;
  }
  if (!Number.isFinite(markup) || markup < 0) {
    return f;
  }

  if (hasMarkupValue) {
    f.markup = roundFgUnitAmount(markup);
    f.markUp = f.markup;
  }
  f.price = roundFgUnitAmount(unitCost * (1 + markup / 100));

  if (qty > 0) {
    f.totalCost = Math.round(unitCost * qty * 100) / 100;
    f.totalPrice = Math.round(parseFloat(f.price) * qty * 100) / 100;
  } else {
    f.totalCost = "";
    f.totalPrice = "";
  }
  return f;
}

/** Load saved Other row: DB `cost` = unit cost, `price` = unit sell. */
export function hydrateOtherFieldCopyFromApi(form) {
  if (!form || form.source !== "Other") return form;
  const f = { ...form };
  const ucDb = parseFloat(f.cost) || 0;
  const usDb = parseFloat(f.price) || 0;
  let unitCost = ucDb > 0 ? ucDb : 0;
  let unitSell = usDb > 0 ? usDb : 0;
  if (!(unitCost > 0) && unitSell > 0) {
    unitCost = Math.round((unitSell / 2) * 10000) / 10000;
  }
  if (!(unitSell > 0) && unitCost > 0) {
    unitSell = Math.round(unitCost * 2 * 10000) / 10000;
  }
  if (unitCost > 0) f.cost = unitCost;
  if (unitSell > 0) {
    f.price = unitSell;
    f.unitSellPrice = unitSell;
  }
  const qty = parseFloat(f.quantity) || 0;
  const storedTotalCost = parseFloat(f.totalCost) || 0;
  const storedTotalPrice = parseFloat(f.totalPrice) || 0;
  if (storedTotalCost > 0) {
    f.totalCost = storedTotalCost;
  } else if (qty > 0 && unitCost > 0) {
    f.totalCost = Math.round(unitCost * qty * 100) / 100;
  }
  if (storedTotalPrice > 0) {
    f.totalPrice = storedTotalPrice;
  } else if (qty > 0 && unitSell > 0) {
    f.totalPrice = Math.round(unitSell * qty * 100) / 100;
  }
  return f;
}

/**
 * Display-only (Customer/Office/PDF) Labor summary rows.
 * Prefer stored/merged totalPrice — never wipe multi-line Labor sums by
 * recalculating from a single line's unit cost/price.
 * Cost is derived from full sell total when stored cost only covers part of merge.
 */
export function finalizeLaborSummaryRow(row) {
  if (!row || row.source !== "Labor") return row;
  const qty = parseFloat(row.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;
  let markupPct = parseFloat(row.markup ?? row.markUp);
  if (!Number.isFinite(markupPct) || markupPct < 0) markupPct = 0;

  const storedTotal = parseFloat(row.totalPrice) || 0;
  const storedLineCost = parseFloat(row.totalCost) || 0;
  const unitCostRaw = parseFloat(row.cost) || 0;

  let lineCost =
    storedLineCost > 0
      ? storedLineCost
      : unitCostRaw > 0
        ? unitCostRaw * (Number.isFinite(qty) && qty > 0 ? qty : 1)
        : 0;
  let unitCost =
    lineCost > 0 && qtySafe > 0 ? lineCost / qtySafe : unitCostRaw > 0 ? unitCostRaw : 0;

  const explicitPrice = parseFloat(row.price);
  let unitSell =
    explicitPrice > 0
      ? explicitPrice
      : unitCost > 0
        ? Math.round(unitCost * (1 + markupPct / 100) * 10000) / 10000
        : 0;

  // Unit-derived total (Add-form style: cost + cost×markup) — not double markup.
  const fromCost =
    unitCost > 0
      ? Math.round((unitCost + (unitCost * markupPct) / 100) * qtySafe * 100) / 100
      : unitSell > 0
        ? Math.round(unitSell * qtySafe * 100) / 100
        : 0;

  // Keep merged/saved sell total when present; only fall back to cost math if missing.
  let totalPrice = storedTotal > 0 ? storedTotal : fromCost;

  // After merge, cost may be from only one contractor line while totalPrice is summed.
  // Rebuild cost from full sell when cost is missing or far too small vs sell.
  if (totalPrice > 0) {
    const m = markupPct > 0 ? markupPct : 100;
    const expectedCost = Math.round((totalPrice / (1 + m / 100)) * 100) / 100;
    if (!(lineCost > 0) || lineCost < expectedCost * 0.85) {
      lineCost = expectedCost;
      unitCost = qtySafe > 0 ? lineCost / qtySafe : lineCost;
      markupPct = m;
    }
  }

  if (!(unitSell > 0) && totalPrice > 0 && qtySafe > 0) {
    unitSell = Math.round((totalPrice / qtySafe) * 10000) / 10000;
  } else if (unitCost > 0 && markupPct >= 0) {
    unitSell = Math.round(unitCost * (1 + markupPct / 100) * 10000) / 10000;
  }

  return {
    ...row,
    quantity: qtySafe,
    cost: unitCost,
    totalCost: lineCost > 0 ? lineCost : row.totalCost,
    price: unitSell,
    totalPrice,
    markup: markupPct,
    markUp: markupPct,
  };
}

/** Generate Customer Copy only: saved cost/markup as-is; else cost = half of total, markup 100%. */
export function recalcLaborGenerateCustomerLine(form) {
  if (!form || form.source !== "Labor") return form;

  const rawCost = form.cost;
  const parsedCost = parseFloat(rawCost);
  const hasExplicitCost =
    rawCost !== "" &&
    rawCost != null &&
    rawCost !== undefined &&
    Number.isFinite(parsedCost) &&
    parsedCost >= 0;

  let cost = Number.isFinite(parsedCost) ? parsedCost : 0;
  let markupPct = parseFloat(form.markup ?? form.markUp);
  if (!Number.isFinite(markupPct) || markupPct < 0) markupPct = 0;

  const storedTotal = parseFloat(form.totalPrice);
  const storedPrice = parseFloat(form.price);
  const qty = parseFloat(form.quantity);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 1;

  let totalPrice = 0;

  if (hasExplicitCost) {
    totalPrice =
      cost === 0
        ? 0
        : Math.round((cost + (cost * markupPct) / 100) * 100) / 100;
    // Never wipe field-copy / merged sell totals with a smaller cost-based amount.
    if (Number.isFinite(storedTotal) && storedTotal > 0) {
      if (!(totalPrice > 0) || storedTotal > totalPrice * 1.01) {
        totalPrice = storedTotal;
        if (!(cost > 0) || cost < (storedTotal / (1 + (markupPct > 0 ? markupPct : 100) / 100)) * 0.85) {
          const m = markupPct > 0 ? markupPct : 100;
          cost = Math.round((storedTotal / (1 + m / 100)) * 100) / 100;
          markupPct = m;
        }
      }
    }
  } else {
    if (Number.isFinite(storedTotal) && storedTotal > 0) {
      totalPrice = storedTotal;
    } else if (Number.isFinite(storedPrice) && storedPrice > 0) {
      totalPrice = storedPrice * qtySafe;
    }
    if (totalPrice > 0) {
      cost = Math.round((totalPrice / 2) * 100) / 100;
      markupPct = 100;
    }
  }

  return {
    ...form,
    cost,
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
