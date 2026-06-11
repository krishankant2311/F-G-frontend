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
