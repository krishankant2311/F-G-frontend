/** COST/OZ from line cost and tank quantity (OZ / 100 GAL). */
export function calcChemicalMixCostPerOz(cost, quantity) {
  const qty = parseFloat(quantity);
  const c = parseFloat(cost);
  if (!(qty > 0) || !Number.isFinite(c) || c < 0) return "";
  return (c / qty).toFixed(2);
}

/** PRICE/OZ = 2 × COST/OZ (chemical mix pricing rule). */
export function calcChemicalMixPricePerOz(costPerOz) {
  const c = parseFloat(costPerOz);
  if (!Number.isFinite(c) || c < 0) return "";
  return (c * 2).toFixed(2);
}

/** Sync per-oz and line price from cost + quantity. */
export function applyChemicalMixPerOzPricing(row) {
  if (!row) return row;
  const costPerOz = calcChemicalMixCostPerOz(row.cost, row.quantity);
  if (!costPerOz) {
    return { ...row, costPerOz: "", pricePerOz: "" };
  }
  const pricePerOz = calcChemicalMixPricePerOz(costPerOz);
  const qty = parseFloat(row.quantity);
  const price =
    Number.isFinite(qty) && qty > 0
      ? (parseFloat(pricePerOz) * qty).toFixed(2)
      : row.price;
  return { ...row, costPerOz, pricePerOz, price };
}

/** List view — derive display values (fixes legacy saved pricePerOz). */
export function resolveChemicalMixLinePricing(item) {
  const costPerOz =
    calcChemicalMixCostPerOz(item?.cost, item?.quantity) ||
    (item?.costPerOz != null && String(item.costPerOz).trim() !== ""
      ? Number(item.costPerOz).toFixed(2)
      : "0.00");
  const pricePerOz = calcChemicalMixPricePerOz(costPerOz) || "0.00";
  const qty = parseFloat(item?.quantity) || 0;
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
