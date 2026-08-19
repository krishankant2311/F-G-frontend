/** Both set in DB → show stored; otherwise show defaults from price (half / 100%). */
export function materialHasCustomCostMarkup(item) {
  const c = item?.cost;
  const mu = item?.markUp ?? item?.markup;
  const nonempty = (v) =>
    v !== null && v !== undefined && String(v).trim() !== "";
  return nonempty(c) && nonempty(mu);
}

export function formatMarkupDisplay(mu) {
  if (mu === null || mu === undefined || String(mu).trim() === "") {
    return "N/A";
  }
  const s = String(mu).trim();
  if (s.endsWith("%")) return s;
  return `${s}%`;
}

const catalogValueNonempty = (v) =>
  v !== null && v !== undefined && String(v).trim() !== "";

/** Job Types list — stored cost, else half of price (no markup). */
export function resolveJobTypeDisplayCost(item) {
  if (catalogValueNonempty(item?.cost)) return item.cost;
  const p = Number(item?.price);
  if (Number.isFinite(p)) return (p / 2).toFixed(2);
  return "N/A";
}

/** Job Types save — default cost to half of price when blank. */
export function resolveJobTypeCostForSave(price, cost) {
  const p = parseFloat(price);
  let costVal = (cost ?? "").trim();
  if (!costVal && Number.isFinite(p) && p >= 0) {
    costVal = (p / 2).toFixed(2);
  }
  return costVal;
}

function parseMaterialMoneyInput(value) {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const num = parseFloat(text);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function formatMaterialMoney2(num) {
  return Number(num).toFixed(2);
}

export const DEFAULT_MATERIAL_MARKUP = "100";

function isMaterialFieldEmpty(value) {
  return String(value ?? "").trim() === "";
}

/** price = cost + (cost × markup / 100) — same rule as field copy lines. */
export function calcMaterialPriceFromCostMarkup(cost, markupPct) {
  const c = parseMaterialMoneyInput(cost);
  const m = parseMaterialMoneyInput(markupPct);
  if (c === null || m === null) return null;
  return formatMaterialMoney2(c * (1 + m / 100));
}

export function calcMaterialCostFromPriceMarkup(price, markupPct) {
  const p = parseMaterialMoneyInput(price);
  const m = parseMaterialMoneyInput(markupPct);
  if (p === null || m === null || m <= -100) return null;
  return formatMaterialMoney2(p / (1 + m / 100));
}

export function calcMaterialMarkupFromCostPrice(cost, price) {
  const c = parseMaterialMoneyInput(cost);
  const p = parseMaterialMoneyInput(price);
  if (c === null || p === null || c <= 0 || p <= 0) return null;
  const markup = ((p / c) - 1) * 100;
  if (!Number.isFinite(markup)) return null;
  const rounded = Math.round(markup * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function formatMaterialMarkupValue(markup) {
  return String(markup);
}

function withDefaultMarkup(fields) {
  return { ...fields, markUp: DEFAULT_MATERIAL_MARKUP };
}

function effectiveMaterialMarkup(fields) {
  return (
    parseMaterialMoneyInput(fields.markUp) ??
    parseMaterialMoneyInput(DEFAULT_MATERIAL_MARKUP)
  );
}

/** Auto-fill cost, price, or markup — last edited field drives the calculation. */
export function applyMaterialFormPricing(fields, changedField) {
  if (!fields || !changedField) return fields;

  let next = { ...fields };
  if (isMaterialFieldEmpty(next.markUp)) {
    next.markUp = DEFAULT_MATERIAL_MARKUP;
  }

  const cost = parseMaterialMoneyInput(next.cost);
  const price = parseMaterialMoneyInput(next.price);
  const markup = effectiveMaterialMarkup(next);

  if (changedField === "cost") {
    if (isMaterialFieldEmpty(next.cost)) {
      return { ...withDefaultMarkup(next), price: "" };
    }
    if (cost !== null && markup !== null) {
      const nextPrice = calcMaterialPriceFromCostMarkup(cost, markup);
      if (nextPrice != null) {
        return {
          ...next,
          markUp: formatMaterialMarkupValue(markup),
          price: nextPrice,
        };
      }
    }
    if (cost !== null && price !== null && price > 0) {
      const nextMarkup = calcMaterialMarkupFromCostPrice(cost, price);
      if (nextMarkup != null) {
        return { ...next, markUp: nextMarkup };
      }
    }
    return next;
  }

  if (changedField === "price") {
    if (isMaterialFieldEmpty(next.price) || price === 0) {
      return withDefaultMarkup(next);
    }
    if (cost !== null && price > 0) {
      const nextMarkup = calcMaterialMarkupFromCostPrice(cost, price);
      if (nextMarkup != null) {
        return { ...next, markUp: nextMarkup };
      }
    }
    if (price > 0 && markup !== null) {
      const nextCost = calcMaterialCostFromPriceMarkup(price, markup);
      if (nextCost != null) {
        return {
          ...next,
          markUp: formatMaterialMarkupValue(markup),
          cost: nextCost,
        };
      }
    }
    return next;
  }

  if (changedField === "markUp") {
    if (isMaterialFieldEmpty(fields.markUp)) {
      return withDefaultMarkup(next);
    }
    if (markup !== null && cost !== null) {
      const nextPrice = calcMaterialPriceFromCostMarkup(cost, markup);
      if (nextPrice != null) {
        return { ...next, price: nextPrice };
      }
    }
    if (markup !== null && price !== null && price > 0) {
      const nextCost = calcMaterialCostFromPriceMarkup(price, markup);
      if (nextCost != null) {
        return { ...next, cost: nextCost };
      }
    }
  }

  return next;
}
