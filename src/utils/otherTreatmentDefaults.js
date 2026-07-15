/** Fallback when API has no annual program treatments yet. */
export const DEFAULT_ANNUAL_TREATMENTS = [
  {
    name: "ROOT DRENCH (PER 100 GAL. TANK)",
    qty: "",
    price: 100,
    lowerPrice: 70,
    cost: 80,
  },
  {
    name: "FUNGAL TREATMENT - LIQUID (PER 100 GAL. TANK)",
    qty: "",
    price: 100,
    lowerPrice: 70,
    cost: 80,
  },
  {
    name: "INSECTICIDE TREATMENT (PER 100G GAL.TANK)",
    qty: "",
    price: 100,
    lowerPrice: 70,
    cost: 80,
  },
];

/** Bag/bottle/unit chemicals — shown under OTHER CHEMICAL TREATMENTS, not the main schedule table. */
export const OTHER_CHEMICAL_PROGRAM_TREATMENTS = [
  {
    name: "FUNGAL TREATMENT (Headway G -BAG)",
    qty: "",
    price: 100,
    lowerPrice: 70,
    cost: 80,
  },
  {
    name: "OSMOCOTE FERTILIZER (PER 40LBS. BAG)",
    qty: "",
    price: 100,
    lowerPrice: 70,
    cost: 80,
  },
  {
    name: "HERBICIDE (PER 2 GAL. BOTTLE)",
    qty: "",
    price: 100,
    lowerPrice: 70,
    cost: 80,
  },
  {
    name: "TOP CHOICE -ANT CONTROL",
    qty: "",
    price: 100,
    lowerPrice: 70,
    cost: 80,
  },
];

export function normalizeTreatmentNameKey(name) {
  return String(name || "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

const OTHER_CHEMICAL_PROGRAM_NAME_KEYS = new Set(
  OTHER_CHEMICAL_PROGRAM_TREATMENTS.map((t) => normalizeTreatmentNameKey(t.name))
);

export function isOtherChemicalProgramTreatment(name) {
  return OTHER_CHEMICAL_PROGRAM_NAME_KEYS.has(normalizeTreatmentNameKey(name));
}

export function findOtherChemicalProgramTreatment(name) {
  const key = normalizeTreatmentNameKey(name);
  return (
    OTHER_CHEMICAL_PROGRAM_TREATMENTS.find(
      (t) => normalizeTreatmentNameKey(t.name) === key
    ) || null
  );
}

export function findCatalogTreatmentByName(name, catalogTreatments = []) {
  const key = normalizeTreatmentNameKey(name);
  if (!key) return null;
  return (
    (catalogTreatments || []).find(
      (item) => normalizeTreatmentNameKey(item?.treatmentName) === key
    ) || null
  );
}

/** Display label: append catalog quantity/unit when set (e.g. "OSMOCOTE (PER 40 lbs bags)"). */
export function formatCatalogTreatmentDisplayName(item = {}) {
  const baseName = String(item.treatmentName ?? item.name ?? "").trim();
  if (!baseName) return "";

  const quantity = String(item.quantity ?? "").trim();
  const unit = String(item.unit ?? "").trim();
  if (!quantity && !unit) return baseName;

  return `${baseName} (PER ${[quantity, unit].filter(Boolean).join(" ")})`;
}

/** Show bag/bottle program treatments inside the same list as chemical mixes. */
export function augmentChemicalMixesWithProgramTreatments(
  chemicalMixes = [],
  _isChemicalMaintenanceEnabled = false,
  catalogTreatments = []
) {
  const existingNames = new Set(
    (chemicalMixes || []).map((mix) => normalizeTreatmentNameKey(mix?.mixName))
  );
  const catalogNames = new Set(
    (catalogTreatments || []).map((c) =>
      normalizeTreatmentNameKey(c?.treatmentName)
    )
  );

  const programAsMixes = OTHER_CHEMICAL_PROGRAM_TREATMENTS.filter(
    (t) =>
      !existingNames.has(normalizeTreatmentNameKey(t.name)) &&
      !catalogNames.has(normalizeTreatmentNameKey(t.name))
  ).map((t) => ({
    _id: `program-treatment-${normalizeTreatmentNameKey(t.name)}`,
    mixName: t.name,
    totalPricePerTank: t.price ?? 0,
    totalCostPerTank: t.cost ?? 0,
    chemicals: [],
    _isProgramTreatment: true,
  }));

  return [...(chemicalMixes || []), ...programAsMixes];
}

export function filterAnnualProgramTreatments(rows = []) {
  return (rows || []).filter((row) => !isOtherChemicalProgramTreatment(row?.name));
}

export function mapApiTreatmentToAnnualRow(item) {
  const treatmentName = item.treatmentName || item.name || "";
  return {
    name: formatCatalogTreatmentDisplayName(item),
    treatmentName,
    qty: "",
    price: Number(item.price) || 0,
    lowerPrice: Number(item.lowerPrice) || 0,
    cost: Number(item.cost) || 0,
    quantity: String(item.quantity ?? "").trim(),
    unit: String(item.unit ?? "").trim(),
    sortOrder: Number(item.sortOrder) || 0,
    _id: item._id,
  };
}

/** Annual program rows from API + browser-stored catalog (deduped, sorted). */
export function buildAnnualTreatmentsFromCatalog(apiItems = [], localItems = []) {
  const norm = (s) => String(s || "").trim().toUpperCase();
  const seen = new Set();
  const rows = [];

  const apiAnnual = (apiItems || [])
    .filter((t) => t.programType === "annual_program")
    .sort(
      (a, b) =>
        (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
        String(a.treatmentName || "").localeCompare(String(b.treatmentName || ""))
    );

  for (const item of apiAnnual) {
    const name = String(item.treatmentName || "").trim();
    if (!name) continue;
    if (isOtherChemicalProgramTreatment(name)) continue;
    const key = norm(name);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(mapApiTreatmentToAnnualRow(item));
  }

  const localAnnual = (localItems || [])
    .filter((t) => t.programType === "annual_program")
    .sort(
      (a, b) =>
        (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0) ||
        String(a.treatmentName || "").localeCompare(String(b.treatmentName || ""))
    );

  for (const item of localAnnual) {
    const name = String(item.treatmentName || "").trim();
    if (!name) continue;
    if (isOtherChemicalProgramTreatment(name)) continue;
    const key = norm(name);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(mapApiTreatmentToAnnualRow(item));
  }

  return rows;
}

export const PROGRAM_TYPE_ANNUAL = "annual_program";
export const PROGRAM_TYPE_OTHER = "other";
export const PROGRAM_TYPE_OTHER_CHEMICAL = "other_chemical";

export function normalizeProgramType(value) {
  if (value === PROGRAM_TYPE_ANNUAL) return PROGRAM_TYPE_ANNUAL;
  if (value === PROGRAM_TYPE_OTHER_CHEMICAL) return PROGRAM_TYPE_OTHER_CHEMICAL;
  return PROGRAM_TYPE_OTHER;
}

export function filterTreatmentsByProgramType(items = [], programType) {
  const target = normalizeProgramType(programType);
  return (items || []).filter(
    (item) => normalizeProgramType(item?.programType) === target
  );
}

export function formatProgramTypeLabel(programType) {
  const normalized = normalizeProgramType(programType);
  if (normalized === PROGRAM_TYPE_ANNUAL) return "Annual Program";
  if (normalized === PROGRAM_TYPE_OTHER_CHEMICAL) return "Other Chemical Treatment";
  return "Other Treatment";
}

/** Table rows when API is empty or unavailable — same 7 landscaping defaults. */
export function buildDefaultTreatmentTableRows(page = 1, perPage = 50) {
  return DEFAULT_ANNUAL_TREATMENTS.map((t, index) => ({
    _id: `local-default-${index}`,
    treatmentName: t.name,
    programType: "annual_program",
    cost: t.cost,
    lowerPrice: t.lowerPrice,
    price: t.price,
    sortOrder: index + 1,
    serialNo: (page - 1) * perPage + index + 1,
    _isLocalDefault: true,
  }));
}

export function mergeDefaultAndCustomTreatments(customItems = [], search = "") {
  const term = String(search || "").trim().toLowerCase();
  const defaults = buildDefaultTreatmentTableRows(1, 500);
  const defaultNames = new Set(
    defaults.map((d) => d.treatmentName.trim().toUpperCase())
  );

  const custom = (customItems || []).filter((item) => {
    const name = String(item.treatmentName || "").trim();
    if (!name) return false;
    if (defaultNames.has(name.toUpperCase())) return false;
    if (!term) return true;
    return name.toLowerCase().includes(term);
  });

  const filteredDefaults = term
    ? defaults.filter((d) =>
        d.treatmentName.toLowerCase().includes(term)
      )
    : defaults;

  return [...filteredDefaults, ...custom].map((item, index) => ({
    ...item,
    serialNo: index + 1,
  }));
}
