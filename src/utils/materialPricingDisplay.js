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
