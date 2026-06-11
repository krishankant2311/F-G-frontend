import {
  calcChemicalMixCostPerOz,
  calcChemicalMixPricePerOz,
} from "./chemicalMixPricing";

const MASTER_MEASURES = ["FT", "SACK", "UNIT"];

const EPA_NOISE_RE = /\bepa\s*(?:not\s*)?required\b/gi;
const OZ_PER_100_GAL_RE = /\boz\s*\/\s*100\s*gal\b/gi;

export function normalizeChemicalKey(name) {
  return String(name ?? "")
    .trim()
    .replace(/\([^)]*\)/g, "")
    .replace(EPA_NOISE_RE, "")
    .replace(OZ_PER_100_GAL_RE, "")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function mapMeasureForMaster(measure) {
  const u = String(measure ?? "")
    .trim()
    .toUpperCase();
  if (MASTER_MEASURES.includes(u)) return u;
  return "UNIT";
}

function cleanMixLineText(text) {
  return String(text ?? "")
    .replace(OZ_PER_100_GAL_RE, "")
    .replace(EPA_NOISE_RE, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** e.g. ARCHERARCHER → ARCHER */
function collapseDuplicatedToken(name) {
  const s = String(name ?? "").trim();
  if (s.length < 4 || s.length % 2 !== 0) return s;
  const half = s.slice(0, s.length / 2);
  if (half.toUpperCase() === s.slice(s.length / 2).toUpperCase()) {
    return half;
  }
  return s;
}

/**
 * Mix rows store product in brandName; chemicalName is often the master-list label.
 * Import uses the clean product name only.
 */
export function resolveMasterChemicalNameFromMixLine(line) {
  const rawBrand = String(line?.brandName || "").trim();
  const rawChem = String(line?.chemicalName || "").trim();

  let name = "";
  if (rawBrand) {
    name = cleanMixLineText(rawBrand);
  }

  if (!name && rawChem) {
    const firstSegment = rawChem.split("|")[0];
    name = cleanMixLineText(firstSegment) || cleanMixLineText(rawChem);
  }

  if (!name && rawChem) {
    name = cleanMixLineText(rawChem);
  }

  name = collapseDuplicatedToken(name);
  return name.trim();
}

function pickBetterValue(current, candidate) {
  const c = current != null ? String(current).trim() : "";
  const n = candidate != null ? String(candidate).trim() : "";
  if (!c && n) return n;
  if (!n) return c;
  if (n.length > c.length && n.length <= 80) return n;
  return c;
}

function parseMoney(value) {
  const n = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(n) ? n : null;
}

function roundMoney2(value) {
  const n = parseMoney(value);
  if (n == null) return null;
  return Math.round(n * 100) / 100;
}

/**
 * Per-oz cost from a mix line (not line total cost).
 * Mix rows store line totals; master chemicals use per-1-OZ cost + price = 2× cost.
 */
export function deriveMixLineCostPerOz(line) {
  const fromField = parseMoney(line?.costPerOz);
  if (fromField != null && fromField >= 0) return fromField;

  const computed = calcChemicalMixCostPerOz(line?.cost, line?.quantity);
  if (computed !== "") return parseFloat(computed);

  return null;
}

function pickHigherCostPerOz(current, candidate) {
  const a = parseMoney(current);
  const b = parseMoney(candidate);
  if (a == null || a <= 0) return b;
  if (b == null || b <= 0) return a;
  return Math.max(a, b);
}

function mergeMixChemicalRecord(existing, incoming) {
  const incomingCostPerOz = deriveMixLineCostPerOz(incoming);
  const mergedCostPerOz = pickHigherCostPerOz(
    existing.costPerOz,
    incomingCostPerOz
  );
  const mergedPricePerOz =
    mergedCostPerOz != null && mergedCostPerOz > 0
      ? parseFloat(calcChemicalMixPricePerOz(mergedCostPerOz))
      : null;

  return {
    chemicalName: pickBetterValue(existing.chemicalName, incoming.chemicalName),
    brandName: pickBetterValue(existing.brandName, incoming.brandName),
    type: pickBetterValue(existing.type, incoming.type),
    measure: pickBetterValue(existing.measure, incoming.measure),
    costPerOz: mergedCostPerOz,
    pricePerOz: mergedPricePerOz,
    sourceMixNames: Array.from(
      new Set([...(existing.sourceMixNames || []), incoming.sourceMixName].filter(Boolean))
    ),
  };
}

/**
 * Collect unique chemicals from all mixes (by normalized product name).
 */
export function extractUniqueChemicalsFromMixes(mixes = []) {
  const byKey = new Map();

  for (const mix of mixes || []) {
    const mixName = mix?.mixName || mix?.name || "";
    for (const line of mix?.chemicals || []) {
      const chemicalName = resolveMasterChemicalNameFromMixLine(line);
      if (!chemicalName || chemicalName.length < 2) continue;

      const key = normalizeChemicalKey(chemicalName);
      if (!key) continue;

      const brandForMaster =
        cleanMixLineText(line?.brandName) || chemicalName;

      const costPerOz = deriveMixLineCostPerOz(line);
      const pricePerOz =
        costPerOz != null && costPerOz >= 0
          ? parseFloat(calcChemicalMixPricePerOz(costPerOz))
          : null;

      const incoming = {
        chemicalName,
        brandName: brandForMaster,
        type: line?.type || "",
        measure: line?.measure || "",
        costPerOz,
        pricePerOz,
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
    for (const field of [c?.chemicalName, c?.brandName]) {
      const key = normalizeChemicalKey(field);
      if (key) keys.add(key);
    }
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
  const name = String(item.chemicalName || "").trim();
  const brand = String(item.brandName || name || "").trim() || name;

  const costPerOz = parseMoney(item?.costPerOz);
  const pricePerOz =
    parseMoney(item?.pricePerOz) ??
    (costPerOz != null && costPerOz >= 0
      ? parseFloat(calcChemicalMixPricePerOz(costPerOz))
      : null);

  const cost = roundMoney2(costPerOz) ?? 0;
  const price = roundMoney2(pricePerOz) ?? (cost > 0 ? roundMoney2(cost * 2) : 0);

  return {
    chemicalName: name,
    measure: mapMeasureForMaster(item?.measure),
    brandName: brand || "N/A",
    type: String(item?.type || "N/A").trim() || "N/A",
    cost,
    price,
    isTaxable: false,
  };
}
