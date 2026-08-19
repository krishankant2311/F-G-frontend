function formatMoney2(n) {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}

/** COST/OZ from line cost and tank quantity (OZ / 100 GAL). */
export function calcChemicalMixCostPerOz(cost, quantity) {
  const qty = parseFloat(quantity);
  const c = parseFloat(cost);
  if (!(qty > 0) || !Number.isFinite(c) || c < 0) return "";
  return (c / qty).toFixed(2);
}

/** PRICE/OZ from line price and tank quantity. */
export function calcChemicalMixPricePerOzFromLine(price, quantity) {
  const qty = parseFloat(quantity);
  const p = parseFloat(price);
  if (!(qty > 0) || !Number.isFinite(p) || p < 0) return "";
  return (p / qty).toFixed(2);
}

/** Default PRICE/OZ = 2 × COST/OZ when DB has no price. */
export function calcChemicalMixPricePerOz(costPerOz) {
  const c = parseFloat(costPerOz);
  if (!Number.isFinite(c) || c < 0) return "";
  return (c * 2).toFixed(2);
}

/** Chemical master row has a stored sell price (per OZ). */
export function chemicalMasterHasPrice(selected) {
  if (!selected) return false;
  const p = selected.pricePerOz ?? selected.price;
  return p !== undefined && p !== null && String(p).trim() !== "";
}

function hasPricePerOzValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function applyDefaultPricePerOzIfMissing(next) {
  if (
    !next.pricePerOzFromDb &&
    !hasPricePerOzValue(next.pricePerOz) &&
    hasPricePerOzValue(next.costPerOz)
  ) {
    next.pricePerOz = calcChemicalMixPricePerOz(next.costPerOz);
  }
}

/**
 * Sync cost / price / per-oz fields based on which input changed.
 * costPerOz & pricePerOz are independently editable.
 */
export function applyChemicalMixPricing(row, changedField = "sync") {
  if (!row) return row;
  const next = { ...row };
  const qty = parseFloat(next.quantity);

  const syncCostFromPerOz = () => {
    const cpoRaw = next.costPerOz;
    if (cpoRaw === "" || cpoRaw == null) {
      next.cost = "";
      return;
    }
    const cpo = parseFloat(cpoRaw);
    if (qty > 0 && Number.isFinite(cpo) && cpo >= 0) {
      next.cost = formatMoney2(cpo * qty);
    } else if (!(qty > 0)) {
      next.cost = "";
    }
  };

  const syncPriceFromPerOz = () => {
    const ppoRaw = next.pricePerOz;
    if (ppoRaw === "" || ppoRaw == null) {
      next.price = "";
      return;
    }
    const ppo = parseFloat(ppoRaw);
    if (qty > 0 && Number.isFinite(ppo) && ppo >= 0) {
      next.price = formatMoney2(ppo * qty);
    } else if (!(qty > 0)) {
      next.price = "";
    }
  };

  const syncCostPerOzFromCost = () => {
    const c = parseFloat(next.cost);
    if (qty > 0 && Number.isFinite(c) && c >= 0) {
      next.costPerOz = formatMoney2(c / qty);
    } else if (next.cost === "" || next.cost == null) {
      next.costPerOz = "";
    }
  };

  const syncPricePerOzFromPrice = () => {
    const p = parseFloat(next.price);
    if (qty > 0 && Number.isFinite(p) && p >= 0) {
      next.pricePerOz = formatMoney2(p / qty);
    } else if (next.price === "" || next.price == null) {
      next.pricePerOz = "";
    }
  };

  switch (changedField) {
    case "costPerOz":
      next.pricePerOzFromDb = false;
      if (next.costPerOz !== "" && next.costPerOz != null) {
        next.pricePerOz = calcChemicalMixPricePerOz(next.costPerOz);
      } else {
        next.pricePerOz = "";
      }
      syncCostFromPerOz();
      syncPriceFromPerOz();
      break;
    case "pricePerOz":
      next.pricePerOzFromDb = false;
      syncPriceFromPerOz();
      break;
    case "cost":
      syncCostPerOzFromCost();
      break;
    case "price":
      syncPricePerOzFromPrice();
      break;
    case "quantity":
      if (!(qty > 0)) {
        next.cost = "";
        next.price = "";
        break;
      }
      if (next.costPerOz !== "" && next.costPerOz != null) {
        syncCostFromPerOz();
      } else {
        syncCostPerOzFromCost();
      }
      if (next.pricePerOz !== "" && next.pricePerOz != null) {
        syncPriceFromPerOz();
      } else {
        applyDefaultPricePerOzIfMissing(next);
        syncPriceFromPerOz();
      }
      break;
    case "chemicalSelect":
      applyDefaultPricePerOzIfMissing(next);
      if (qty > 0) {
        syncCostFromPerOz();
        syncPriceFromPerOz();
      } else {
        next.cost = "";
        next.price = "";
      }
      break;
    default:
      if (next.costPerOz !== "" && next.costPerOz != null) {
        syncCostFromPerOz();
      } else {
        syncCostPerOzFromCost();
      }
      if (next.pricePerOz !== "" && next.pricePerOz != null) {
        syncPriceFromPerOz();
      } else if (next.price !== "" && next.price != null) {
        syncPricePerOzFromPrice();
      } else {
        applyDefaultPricePerOzIfMissing(next);
        syncPriceFromPerOz();
      }
      break;
  }

  return next;
}

/** Remove UI-only flags before API payload. */
export function normalizeChemicalMixRowForSave(row) {
  const priced = applyChemicalMixPricing(row, "sync");
  const { pricePerOzFromDb, ...rest } = priced;
  return rest;
}

/** @deprecated Use applyChemicalMixPricing — kept for callers that only sync from cost. */
export function applyChemicalMixPerOzPricing(row) {
  return applyChemicalMixPricing(row, "cost");
}

/** List view — derive display values (uses saved per-oz when present). */
export function resolveChemicalMixLinePricing(item) {
  const qty = parseFloat(item?.quantity) || 0;
  let costPerOz =
    item?.costPerOz != null && String(item.costPerOz).trim() !== ""
      ? Number(item.costPerOz).toFixed(2)
      : calcChemicalMixCostPerOz(item?.cost, item?.quantity) || "0.00";
  let pricePerOz =
    item?.pricePerOz != null && String(item.pricePerOz).trim() !== ""
      ? Number(item.pricePerOz).toFixed(2)
      : calcChemicalMixPricePerOzFromLine(item?.price, item?.quantity) ||
        calcChemicalMixPricePerOz(costPerOz) ||
        "0.00";
  return {
    costPerOz,
    pricePerOz,
    totalCost: qty * (parseFloat(costPerOz) || 0),
    totalPrice: qty * (parseFloat(pricePerOz) || 0),
  };
}

export function sumChemicalMixTankTotals(chemicals) {
  return (chemicals || []).reduce(
    (acc, item) => {
      const line = resolveChemicalMixLinePricing(item);
      acc.totalCostPerTank += line.totalCost;
      acc.totalPricePerTank += line.totalPrice;
      return acc;
    },
    { totalCostPerTank: 0, totalPricePerTank: 0 }
  );
}
