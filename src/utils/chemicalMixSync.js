const MASTER_MEASURES = ["FT", "SACK", "UNIT"];

export function normalizeChemicalKey(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

export function mapMeasureForMaster(measure) {
  const u = String(measure ?? "")
    .trim()
    .toUpperCase();
  if (MASTER_MEASURES.includes(u)) return u;
  return "UNIT";
}

function pickBetterValue(current, candidate) {
  const c = current != null ? String(current).trim() : "";
  const n = candidate != null ? String(candidate).trim() : "";
  if (!c && n) return n;
  if (!n) return c;
  return n.length > c.length ? n : c;
}

function parseMoney(value) {
  const n = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function mergeMixChemicalRecord(existing, incoming) {
  const cost = parseMoney(incoming.cost);
  const price = parseMoney(incoming.price);
  const existingCost = parseMoney(existing.cost);
  const existingPrice = parseMoney(existing.price);

  return {
    chemicalName: pickBetterValue(existing.chemicalName, incoming.chemicalName),
    brandName: pickBetterValue(existing.brandName, incoming.brandName),
    type: pickBetterValue(existing.type, incoming.type),
    measure: pickBetterValue(existing.measure, incoming.measure),
    cost: existingCost != null && existingCost > 0 ? existingCost : cost ?? 0,
    price:
      existingPrice != null && existingPrice > 0 ? existingPrice : price ?? 0,
    sourceMixNames: Array.from(
      new Set([...(existing.sourceMixNames || []), incoming.sourceMixName].filter(Boolean))
    ),
  };
}

/**
 * Collect unique chemicals from all mixes (by normalized name).
 */
export function extractUniqueChemicalsFromMixes(mixes = []) {
  const byKey = new Map();

  for (const mix of mixes || []) {
    const mixName = mix?.mixName || mix?.name || "";
    for (const line of mix?.chemicals || []) {
      const chemicalName = String(line?.chemicalName || line?.brandName || "").trim();
      if (!chemicalName) continue;

      const key = normalizeChemicalKey(chemicalName);
      if (!key) continue;

      const incoming = {
        chemicalName,
        brandName: line?.brandName || "",
        type: line?.type || "",
        measure: line?.measure || "",
        cost: line?.cost,
        price: line?.price,
        sourceMixName: mixName,
      };

      if (byKey.has(key)) {
        byKey.set(key, mergeMixChemicalRecord(byKey.get(key), incoming));
      } else {
        byKey.set(key, {
          ...incoming,
          sourceMixNames: mixName ? [mixName] : [],
        });
      }
    }
  }

  return Array.from(byKey.values());
}

export function buildMasterChemicalKeySet(masterChemicals = []) {
  const keys = new Set();
  for (const c of masterChemicals) {
    const key = normalizeChemicalKey(c?.chemicalName);
    if (key) keys.add(key);
  }
  return keys;
}

/**
 * Compare mix-derived chemicals with master list.
 */
export function planChemicalsImportFromMixes(mixes = [], masterChemicals = []) {
  const extracted = extractUniqueChemicalsFromMixes(mixes);
  const existingKeys = buildMasterChemicalKeySet(masterChemicals);

  const alreadyInMaster = [];
  const toImport = [];

  for (const item of extracted) {
    const key = normalizeChemicalKey(item.chemicalName);
    const row = {
      ...item,
      key,
      payload: buildAddChemicalPayload(item),
    };
    if (existingKeys.has(key)) {
      alreadyInMaster.push(row);
    } else {
      toImport.push(row);
    }
  }

  toImport.sort((a, b) =>
    String(a.chemicalName).localeCompare(String(b.chemicalName))
  );
  alreadyInMaster.sort((a, b) =>
    String(a.chemicalName).localeCompare(String(b.chemicalName))
  );

  return {
    extractedCount: extracted.length,
    alreadyInMaster,
    toImport,
  };
}

export function buildAddChemicalPayload(item) {
  const cost = parseMoney(item?.cost);
  const price = parseMoney(item?.price);

  return {
    chemicalName: String(item.chemicalName).trim(),
    measure: mapMeasureForMaster(item?.measure),
    brandName: String(item?.brandName || "N/A").trim() || "N/A",
    type: String(item?.type || "N/A").trim() || "N/A",
    cost: cost != null && cost >= 0 ? cost : 0,
    price: price != null && price >= 0 ? price : 0,
    isTaxable: false,
  };
}
