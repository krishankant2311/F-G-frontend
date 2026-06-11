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
    name: "FUNGAL TREATMENT (Headway G -BAG)",
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
