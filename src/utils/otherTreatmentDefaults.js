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

/** Show bag/bottle program treatments inside the same list as chemical mixes. */
export function augmentChemicalMixesWithProgramTreatments(
  chemicalMixes = [],
  isChemicalMaintenanceEnabled = false
) {
  const maintenance =
    isChemicalMaintenanceEnabled === true ||
    isChemicalMaintenanceEnabled === "true" ||
    isChemicalMaintenanceEnabled === "Yes" ||
    isChemicalMaintenanceEnabled === "yes" ||
    isChemicalMaintenanceEnabled === 1 ||
    isChemicalMaintenanceEnabled === "1";

  const existingNames = new Set(
    (chemicalMixes || []).map((mix) => normalizeTreatmentNameKey(mix?.mixName))
  );

  const programAsMixes = OTHER_CHEMICAL_PROGRAM_TREATMENTS.filter(
    (t) => !existingNames.has(normalizeTreatmentNameKey(t.name))
  ).map((t) => ({
    _id: `program-treatment-${normalizeTreatmentNameKey(t.name)}`,
    mixName: t.name,
    totalPricePerTank: maintenance ? t.lowerPrice ?? t.price ?? 0 : t.price ?? 0,
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
  return {
    name: item.treatmentName || item.name || "",
    qty: "",
    price: Number(item.price) || 0,
    lowerPrice: Number(item.lowerPrice) || 0,
    cost: Number(item.cost) || 0,
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

export function formatProgramTypeLabel(programType) {
  return programType === "annual_program" ? "Annual Program" : "Other";
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
