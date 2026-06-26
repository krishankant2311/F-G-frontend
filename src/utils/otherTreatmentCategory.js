import {
  CATALOG_OPTION_PREFIX,
  MATERIAL_OPTION_PREFIX,
  resolveMaterialUnitCost,
  resolveMaterialUnitPrice,
} from "./otherTreatmentDropdown";

export const EMPTY_OTHER_TREATMENT_ROW = {
  treatment: "",
  qty: 0,
  date: "",
  dates: [],
  mixData: null,
  catalogData: null,
  materialData: null,
  treatmentName: "",
  price: "",
  cost: "",
};

/** True when other treatment should include chemical labor ($45 cost / $100 price). */
export function isChemicalOtherTreatment(ot) {
  if (!ot) return false;
  if (ot.isChemicalTreatment === false) return false;
  if (ot.isChemicalTreatment === true) return true;
  if (ot.materialId) return false;
  if (ot.mixId || ot.mixName) return true;
  if (Array.isArray(ot.chemicals) && ot.chemicals.length > 0) return true;
  if (ot.treatmentCatalogId) return true;
  return false;
}

export function scheduleItemAppliesLabor(item) {
  if (!item) return false;
  if (item.type === "annual") return true;
  if (item.type === "other" || item.type === "other-new") {
    if (item.isChemicalTreatment === false) return false;
    if (item.isChemicalTreatment === true) return true;
    return isChemicalOtherTreatment(item);
  }
  return false;
}

export function buildMaterialOtherTreatmentDropdownOptions({
  materials = [],
  chemicalMixes = [],
  isKeyTaken = () => false,
}) {
  const mixNames = new Set(
    (chemicalMixes || [])
      .map((mix) => String(mix?.mixName || "").trim().toLowerCase())
      .filter(Boolean)
  );

  return (materials || [])
    .filter((m) => m?.status === "Active" && m?.name)
    .filter((m) => !mixNames.has(String(m.name).trim().toLowerCase()))
    .map((m) => ({
      key: `${MATERIAL_OPTION_PREFIX}${m._id}`,
      label: m.name,
      kind: "material",
    }))
    .filter((m) => !isKeyTaken(m.key))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

export function buildChemicalOtherTreatmentDropdownOptions({
  chemicalMixes = [],
  catalogTreatments = [],
  isKeyTaken = () => false,
}) {
  const mixOptions = (chemicalMixes || [])
    .filter((mix) => mix?.mixName && !isKeyTaken(mix.mixName))
    .map((mix) => ({
      key: mix.mixName,
      label: mix.mixName,
      kind: "mix",
    }));

  const catalogOptions = (catalogTreatments || [])
    .filter((c) => c?.treatmentName)
    .map((c) => ({
      key: `${CATALOG_OPTION_PREFIX}${c._id}`,
      label: c.treatmentName,
      kind: "catalog",
    }))
    .filter((c) => !isKeyTaken(c.key));

  return [...mixOptions, ...catalogOptions].sort((a, b) =>
    String(a.label).localeCompare(String(b.label))
  );
}

export function formatOtherTreatmentRowsForApi(
  rows,
  { isChemicalSection, isChemicalMaintenanceEnabled, toQuantity }
) {
  const uniqueRows = rows.filter((row, index, self) => {
    if (row.treatment === "Other") return true;
    const rowKey = row.materialData?._id
      ? `material:${row.materialData._id}`
      : row.catalogData?._id
        ? `catalog:${row.catalogData._id}`
        : row.mixData?._id
          ? `mix:${row.mixData._id}`
          : `name:${row.treatment}`;
    const firstIndex = self.findIndex((r) => {
      const k = r.materialData?._id
        ? `material:${r.materialData._id}`
        : r.catalogData?._id
          ? `catalog:${r.catalogData._id}`
          : r.mixData?._id
            ? `mix:${r.mixData._id}`
            : `name:${r.treatment}`;
      return k === rowKey && r.treatment !== "Other";
    });
    return index === firstIndex;
  });

  return uniqueRows
    .filter((row) => {
      const ds = Array.isArray(row.dates)
        ? row.dates
        : row.date
          ? [row.date]
          : Array.isArray(row.scheduledDates)
            ? row.scheduledDates
            : row.scheduledDate
              ? [row.scheduledDate]
              : [];
      if (row.treatment === "Other") {
        return row.treatmentName?.trim() && ds.length > 0;
      }
      return row.treatment && ds.length > 0;
    })
    .flatMap((row) => {
      const ds = Array.isArray(row.dates)
        ? row.dates
        : row.date
          ? [row.date]
          : Array.isArray(row.scheduledDates)
            ? row.scheduledDates
            : row.scheduledDate
              ? [row.scheduledDate]
              : [];
      const uniqDates = Array.from(new Set(ds.filter(Boolean)));
      const qty = toQuantity(row.qty ?? row.quantity ?? 0);

      if (row.treatment === "Other") {
        return uniqDates.map((d) => ({
          treatment: row.treatmentName.trim(),
          qty,
          date: d,
          status: "Scheduled",
          totalPricePerTank: Number(row.price || 0),
          totalCostPerTank: Number(row.cost || 0),
          isChemicalTreatment: isChemicalSection,
        }));
      }

      const baseData = {
        treatment: row.treatment,
        qty,
        status: "Scheduled",
        isChemicalTreatment: isChemicalSection,
      };

      if (row.materialData) {
        const pricePerTank =
          row.price !== "" && row.price != null
            ? Number(row.price)
            : resolveMaterialUnitPrice(row.materialData, false);
        const unitCost =
          row.cost !== "" && row.cost != null
            ? Number(row.cost)
            : resolveMaterialUnitCost(row.materialData);
        return uniqDates.map((d) => ({
          ...baseData,
          date: d,
          treatment: row.materialData.name,
          totalCostPerTank: unitCost,
          totalPricePerTank: pricePerTank,
          materialId: row.materialData._id,
          isChemicalTreatment: false,
        }));
      }

      if (row.catalogData) {
        const defaultPrice = isChemicalMaintenanceEnabled
          ? row.catalogData.lowerPrice ?? row.catalogData.price ?? 0
          : row.catalogData.price ?? 0;
        const pricePerTank =
          row.price !== "" && row.price != null ? Number(row.price) : defaultPrice;
        const unitCost =
          row.cost !== "" && row.cost != null
            ? Number(row.cost)
            : row.catalogData.cost || 0;
        return uniqDates.map((d) => ({
          ...baseData,
          date: d,
          treatment: row.catalogData.treatmentName,
          totalCostPerTank: unitCost,
          totalPricePerTank: pricePerTank,
          treatmentCatalogId: row.catalogData._id,
          isChemicalTreatment: true,
        }));
      }

      if (row.mixData) {
        const defaultPrice = isChemicalMaintenanceEnabled
          ? row.mixData.totalCostPerTank ?? 0
          : row.mixData.totalPricePerTank ?? 0;
        const pricePerTank =
          row.price !== "" && row.price != null ? Number(row.price) : defaultPrice;
        const unitCost =
          row.cost !== "" && row.cost != null
            ? Number(row.cost)
            : row.mixData.totalCostPerTank || 0;
        return uniqDates.map((d) => ({
          ...baseData,
          date: d,
          mixName: row.mixData.mixName,
          chemicals: row.mixData.chemicals || [],
          totalCostPerTank: unitCost,
          totalPricePerTank: pricePerTank,
          mixId: row.mixData._id,
          isChemicalTreatment: true,
        }));
      }

      return uniqDates.map((d) => ({ ...baseData, date: d }));
    });
}

export function applyOtherTreatmentSelection(
  row,
  value,
  { materials, catalogTreatments, chemicalMixes, isChemicalSection, isChemicalMaintenanceEnabled }
) {
  const baseReset = {
    date: "",
    dates: [],
    treatmentName: "",
  };

  if (!isChemicalSection) {
    if (!value.startsWith(MATERIAL_OPTION_PREFIX)) {
      return row;
    }
    const materialId = value.slice(MATERIAL_OPTION_PREFIX.length);
    const materialItem = materials.find((m) => m._id === materialId);
    return {
      ...row,
      ...baseReset,
      treatment: materialItem?.name || "",
      mixData: null,
      catalogData: null,
      materialData: materialItem || null,
      price: materialItem ? resolveMaterialUnitPrice(materialItem, false) : "",
      cost: materialItem ? resolveMaterialUnitCost(materialItem) : "",
    };
  }

  if (value.startsWith(MATERIAL_OPTION_PREFIX)) {
    return row;
  }

  if (value.startsWith(CATALOG_OPTION_PREFIX)) {
    const catalogId = value.slice(CATALOG_OPTION_PREFIX.length);
    const catalogItem = catalogTreatments.find((c) => c._id === catalogId);
    return {
      ...row,
      ...baseReset,
      treatment: catalogItem?.treatmentName || "",
      mixData: null,
      catalogData: catalogItem || null,
      materialData: null,
      price: catalogItem
        ? isChemicalMaintenanceEnabled
          ? catalogItem.lowerPrice ?? catalogItem.price ?? ""
          : catalogItem.price ?? ""
        : "",
      cost: catalogItem?.cost ?? "",
    };
  }

  const selectedMix = chemicalMixes.find((mix) => mix.mixName === value);
  return {
    ...row,
    ...baseReset,
    treatment: value,
    mixData: selectedMix || null,
    catalogData: null,
    materialData: null,
    price: selectedMix ? selectedMix.totalPricePerTank ?? "" : "",
    cost: selectedMix ? selectedMix.totalCostPerTank ?? "" : "",
  };
}
