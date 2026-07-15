import {
  findOtherChemicalProgramTreatment,
  isOtherChemicalProgramTreatment,
  normalizeTreatmentNameKey,
  augmentChemicalMixesWithProgramTreatments,
  findCatalogTreatmentByName,
  formatCatalogTreatmentDisplayName,
} from "./otherTreatmentDefaults";
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
  if (isOtherChemicalProgramTreatment(
    ot.treatment || ot.mixName || ot.treatmentName || ""
  )) {
    return true;
  }
  if (ot.mixId || ot.mixName) return true;
  if (Array.isArray(ot.chemicals) && ot.chemicals.length > 0) return true;
  if (ot.treatmentCatalogId) return true;
  return false;
}

export function resolveOtherTreatmentDate(ot) {
  if (!ot) return null;
  return ot.date ?? ot.scheduleDate ?? ot.scheduledDate ?? null;
}

/** Form rows use `quantity`; saved/API rows use `qty`. Prefer non-empty form quantity. */
export function resolveOtherTreatmentQuantity(row) {
  const formQty = row?.quantity;
  if (formQty !== "" && formQty != null) {
    const n = Number(formQty);
    return Number.isFinite(n) ? n : 0;
  }
  const n = Number(row?.qty ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function resolveOtherTreatmentFormDates(row) {
  if (!row) return [];
  if (Array.isArray(row.dates) && row.dates.length) return row.dates.filter(Boolean);
  if (row.date) return [row.date];
  if (Array.isArray(row.scheduledDates) && row.scheduledDates.length) {
    return row.scheduledDates.filter(Boolean);
  }
  if (row.scheduledDate) return [row.scheduledDate];
  return [];
}

export function hasValidOtherTreatmentDate(dateVal) {
  if (dateVal == null || dateVal === "") return false;
  const d = new Date(
    typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)
      ? `${dateVal}T12:00:00`
      : dateVal
  );
  return !isNaN(d.getTime());
}

export function isActiveOtherTreatmentEntry(ot) {
  if (hasValidOtherTreatmentDate(resolveOtherTreatmentDate(ot))) return true;
  return resolveOtherTreatmentQuantity(ot) > 0;
}

export function getOtherTreatmentIdentityKey(ot) {
  if (!ot) return "";
  if (ot.materialId) return `material:${String(ot.materialId)}`;
  if (ot.mixId) return `mix:${String(ot.mixId)}`;
  if (ot.treatmentCatalogId) return `catalog:${String(ot.treatmentCatalogId)}`;
  const name = String(
    ot.treatment || ot.mixName || ot.treatmentName || ""
  )
    .trim()
    .toLowerCase();
  return name ? `name:${name}` : "";
}

export function resolveOtherTreatmentName(ot) {
  if (!ot) return "";
  return (
    ot.treatment ||
    ot.mixName ||
    ot.treatmentName ||
    ""
  );
}

/** Convert an annual-program row (other-chemical bag/bottle) into otherTreatments shape. */
export function annualTreatmentRowToOtherTreatment(at) {
  if (!at?.name || !isOtherChemicalProgramTreatment(at.name)) return null;

  const qty = Number(at.quantity || 0);
  const qtySafe = Number.isFinite(qty) && qty > 0 ? qty : 0;
  const savedPrice = Number(at.price || 0);
  const savedCost = Number(at.cost || 0);
  const programDef = findOtherChemicalProgramTreatment(at.name);
  const unitPrice =
    qtySafe > 0 && savedPrice > 0
      ? savedPrice / qtySafe
      : Number(programDef?.price || 100);
  const unitCost =
    qtySafe > 0 && savedCost > 0
      ? savedCost / qtySafe
      : Number(programDef?.cost || 80);

  const scheduleDates =
    Array.isArray(at.scheduleDates) && at.scheduleDates.length
      ? at.scheduleDates.filter(Boolean)
      : at.scheduleDate
        ? [at.scheduleDate]
        : [];
  const date = scheduleDates[0] || at.scheduleDate || null;

  const payload = {
    treatment: String(at.name).trim(),
    qty: qtySafe,
    totalPricePerTank: unitPrice,
    totalCostPerTank: unitCost,
    isChemicalTreatment: true,
    projectCode: at.projectCode || "",
    status: at.status || "Scheduled",
  };

  if (date) {
    return withOtherTreatmentDates(payload, date);
  }
  return { ...payload, date: null, scheduleDate: null };
}

/** Annual rows for bag/bottle program chemicals → otherTreatments entries. */
export function migrateAnnualOtherChemicalToOtherTreatments(annualRows = []) {
  return (annualRows || [])
    .map(annualTreatmentRowToOtherTreatment)
    .filter(Boolean);
}

export function withOtherTreatmentDates(ot, dateVal) {
  const normalized = normalizeOtherTreatmentDateForApi(dateVal) ?? dateVal;
  return {
    ...ot,
    date: normalized,
    scheduleDate: normalized,
  };
}

export function otherTreatmentFormRowIsReady(row) {
  const ds = resolveOtherTreatmentFormDates(row);
  if (!ds.length) return false;

  if (resolveOtherTreatmentQuantity(row) <= 0) return false;

  if (row?.treatment === "Other") return !!String(row?.treatmentName || "").trim();
  return !!(
    String(row?.treatment || "").trim() ||
    row?.materialData ||
    row?.mixData ||
    row?.catalogData
  );
}

export function cloneOtherTreatmentFormRow(row) {
  if (!row) return row;
  return {
    ...row,
    scheduledDates: Array.isArray(row.scheduledDates) ? [...row.scheduledDates] : [],
    dates: Array.isArray(row.dates) ? [...row.dates] : [],
    materialData: row.materialData ? { ...row.materialData } : null,
    mixData: row.mixData ? { ...row.mixData, chemicals: row.mixData.chemicals || [] } : null,
    catalogData: row.catalogData ? { ...row.catalogData } : null,
  };
}

const otherTreatmentDateKey = (dateVal) => {
  if (!hasValidOtherTreatmentDate(dateVal)) return "";
  const d = new Date(
    typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)
      ? `${dateVal}T12:00:00`
      : dateVal
  );
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Merge form-saved other rows; same treatment + same date updates, different date adds new row. */
export function mergeFormOtherTreatmentsIntoList(existingList, newRows) {
  const output = [...(existingList || [])];
  (newRows || []).forEach((newOt) => {
    const newKey = getOtherTreatmentIdentityKey(newOt);
    const newDateKey = otherTreatmentDateKey(resolveOtherTreatmentDate(newOt));
    if (!newKey || !newDateKey) return;

    const duplicateIdx = output.findIndex((existingOt) => {
      if (getOtherTreatmentIdentityKey(existingOt) !== newKey) return false;
      return otherTreatmentDateKey(resolveOtherTreatmentDate(existingOt)) === newDateKey;
    });

    if (duplicateIdx >= 0) {
      output[duplicateIdx] = {
        ...output[duplicateIdx],
        ...newOt,
        status: output[duplicateIdx].status || newOt.status || "Scheduled",
      };
    } else {
      output.push(newOt);
    }
  });
  return output;
}

export function normalizeOtherTreatmentDateForApi(dateVal) {
  if (!hasValidOtherTreatmentDate(dateVal)) return null;
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
    return new Date(`${dateVal}T12:00:00`).toISOString();
  }
  const d = new Date(dateVal);
  return isNaN(d.getTime()) ? dateVal : d.toISOString();
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
  catalogTreatments = [],
  isKeyTaken = () => false,
}) {
  const mixNames = new Set(
    (chemicalMixes || [])
      .map((mix) => String(mix?.mixName || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const materialOptions = (materials || [])
    .filter((m) => m?.status === "Active" && m?.name)
    .filter((m) => !mixNames.has(String(m.name).trim().toLowerCase()))
    .map((m) => ({
      key: `${MATERIAL_OPTION_PREFIX}${m._id}`,
      label: m.name,
      kind: "material",
    }))
    .filter((m) => !isKeyTaken(m.key));

  const catalogOptions = (catalogTreatments || [])
    .filter((c) => c?.treatmentName)
    .map((c) => ({
      key: `${CATALOG_OPTION_PREFIX}${c._id}`,
      label: formatCatalogTreatmentDisplayName(c),
      kind: "catalog",
    }))
    .filter((c) => !isKeyTaken(c.key));

  return [...materialOptions, ...catalogOptions].sort((a, b) =>
    String(a.label).localeCompare(String(b.label))
  );
}

export function buildChemicalOtherTreatmentDropdownOptions({
  chemicalMixes = [],
  catalogTreatments = [],
  isChemicalMaintenanceEnabled = false,
  isKeyTaken = () => false,
}) {
  const mixesForDropdown = augmentChemicalMixesWithProgramTreatments(
    chemicalMixes,
    isChemicalMaintenanceEnabled,
    catalogTreatments
  );

  const catalogNameKeys = new Set(
    (catalogTreatments || []).map((c) =>
      normalizeTreatmentNameKey(c.treatmentName)
    )
  );

  const mixOptions = mixesForDropdown
    .filter((mix) => mix?.mixName && !isKeyTaken(mix.mixName))
    .filter(
      (mix) => !catalogNameKeys.has(normalizeTreatmentNameKey(mix.mixName))
    )
    .map((mix) => ({
      key: mix.mixName,
      label: mix.mixName,
      kind: "mix",
    }));

  const catalogOptions = (catalogTreatments || [])
    .filter((c) => c?.treatmentName)
    .map((c) => ({
      key: `${CATALOG_OPTION_PREFIX}${c._id}`,
      label: formatCatalogTreatmentDisplayName(c),
      kind: "catalog",
    }))
    .filter((c) => !isKeyTaken(c.key));

  return [...mixOptions, ...catalogOptions].sort((a, b) =>
    String(a.label).localeCompare(String(b.label))
  );
}

export function formatOtherTreatmentRowsForApi(
  rows,
  {
    isChemicalSection,
    isChemicalMaintenanceEnabled,
    toQuantity,
    catalogTreatments = [],
  }
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
    .filter(otherTreatmentFormRowIsReady)
    .flatMap((row) => {
      const uniqDates = Array.from(new Set(resolveOtherTreatmentFormDates(row)));
      const qty = toQuantity(resolveOtherTreatmentQuantity(row));

      if (row.treatment === "Other") {
        return uniqDates.map((d) =>
          withOtherTreatmentDates(
            {
              treatment: row.treatmentName.trim(),
              qty,
              status: "Scheduled",
              totalPricePerTank: Number(row.price || 0),
              totalCostPerTank: Number(row.cost || 0),
              isChemicalTreatment: isChemicalSection,
            },
            d
          )
        );
      }

      const baseData = {
        treatment:
          row.treatment ||
          row.materialData?.name ||
          row.catalogData?.treatmentName ||
          row.mixData?.mixName ||
          "",
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
        return uniqDates.map((d) =>
          withOtherTreatmentDates(
            {
              ...baseData,
              treatment: row.materialData.name,
              totalCostPerTank: unitCost,
              totalPricePerTank: pricePerTank,
              materialId: row.materialData._id,
              isChemicalTreatment: false,
            },
            d
          )
        );
      }

      if (row.catalogData) {
        const pricePerTank =
          row.price !== "" && row.price != null
            ? Number(row.price)
            : Number(row.catalogData.price ?? 0);
        const unitCost =
          row.cost !== "" && row.cost != null
            ? Number(row.cost)
            : row.catalogData.cost || 0;
        return uniqDates.map((d) =>
          withOtherTreatmentDates(
            {
              ...baseData,
              treatment: formatCatalogTreatmentDisplayName(row.catalogData) || row.catalogData.treatmentName,
              totalCostPerTank: unitCost,
              totalPricePerTank: pricePerTank,
              treatmentCatalogId: row.catalogData._id,
              isChemicalTreatment: true,
            },
            d
          )
        );
      }

      if (row.mixData) {
        const pricePerTank =
          row.price !== "" && row.price != null
            ? Number(row.price)
            : Number(row.mixData.totalPricePerTank ?? 0);
        const unitCost =
          row.cost !== "" && row.cost != null
            ? Number(row.cost)
            : row.mixData.totalCostPerTank || 0;
        const programFromMix = findOtherChemicalProgramTreatment(row.mixData.mixName);
        const mixPayload = programFromMix
          ? {
              ...baseData,
              treatment: row.mixData.mixName,
              totalCostPerTank: unitCost,
              totalPricePerTank: pricePerTank,
              isChemicalTreatment: true,
            }
          : {
              ...baseData,
              treatment: row.mixData.mixName,
              mixName: row.mixData.mixName,
              chemicals: row.mixData.chemicals || [],
              totalCostPerTank: unitCost,
              totalPricePerTank: pricePerTank,
              mixId: row.mixData._id,
              isChemicalTreatment: true,
            };
        return uniqDates.map((d) => withOtherTreatmentDates(mixPayload, d));
      }

      const programItem = findOtherChemicalProgramTreatment(row.treatment);
      if (programItem) {
        const catalogMatch = findCatalogTreatmentByName(
          programItem.name,
          catalogTreatments
        );
        const pricePerTank =
          row.price !== "" && row.price != null
            ? Number(row.price)
            : Number(catalogMatch?.price ?? programItem.price ?? 0);
        const unitCost =
          row.cost !== "" && row.cost != null
            ? Number(row.cost)
            : Number(catalogMatch?.cost ?? programItem.cost ?? 0);
        return uniqDates.map((d) =>
          withOtherTreatmentDates(
            {
              ...baseData,
              treatment: programItem.name,
              totalCostPerTank: unitCost,
              totalPricePerTank: pricePerTank,
              isChemicalTreatment: true,
            },
            d
          )
        );
      }

      return uniqDates.map((d) => withOtherTreatmentDates(baseData, d));
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
    if (value.startsWith(CATALOG_OPTION_PREFIX)) {
      const catalogId = value.slice(CATALOG_OPTION_PREFIX.length);
      const catalogItem = catalogTreatments.find((c) => c._id === catalogId);
      return {
        ...row,
        ...baseReset,
        treatment: formatCatalogTreatmentDisplayName(catalogItem) || catalogItem?.treatmentName || "",
        mixData: null,
        catalogData: catalogItem || null,
        materialData: null,
        price: catalogItem?.price ?? "",
        cost: catalogItem?.cost ?? "",
      };
    }
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
      treatment: formatCatalogTreatmentDisplayName(catalogItem) || catalogItem?.treatmentName || "",
      mixData: null,
      catalogData: catalogItem || null,
      materialData: null,
      price: catalogItem?.price ?? "",
      cost: catalogItem?.cost ?? "",
    };
  }

  const catalogMatch = findCatalogTreatmentByName(value, catalogTreatments);
  if (catalogMatch) {
    return {
      ...row,
      ...baseReset,
      treatment: formatCatalogTreatmentDisplayName(catalogMatch) || catalogMatch.treatmentName || "",
      mixData: null,
      catalogData: catalogMatch,
      materialData: null,
      price: catalogMatch.price ?? "",
      cost: catalogMatch.cost ?? "",
    };
  }

  const programItem = findOtherChemicalProgramTreatment(value);
  if (programItem) {
    return {
      ...row,
      ...baseReset,
      treatment: programItem.name,
      mixData: null,
      catalogData: null,
      materialData: null,
      price: programItem.price ?? "",
      cost: programItem.cost ?? "",
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

function toInputDate(dateVal) {
  if (!dateVal) return null;
  try {
    const d =
      typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)
        ? new Date(`${dateVal}T12:00:00`)
        : new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return null;
  }
}

function savedOtherTreatmentToFormRow(ot) {
  const qty = resolveOtherTreatmentQuantity(ot);
  const resolvedDate = resolveOtherTreatmentDate(ot);
  const formattedDate = toInputDate(resolvedDate);
  const scheduledDates = formattedDate ? [formattedDate] : [];

  return {
    ...EMPTY_OTHER_TREATMENT_ROW,
    treatment: resolveOtherTreatmentName(ot),
    quantity: qty > 0 ? String(qty) : "",
    scheduledDate: formattedDate || "",
    scheduledDates,
    price: ot.totalPricePerTank ?? "",
    cost: ot.totalCostPerTank ?? "",
  };
}

/** Build OTHER CHEMICAL TREATMENTS form rows from saved customer data only. */
export function buildOtherChemicalFormRowsFromCustomer(
  annualTreatments = [],
  otherTreatments = [],
  isChemicalMaintenanceEnabled = false,
  emptyRow = null
) {
  const rows = [];
  const seen = new Set();

  const addRow = (row) => {
    const key = normalizeTreatmentNameKey(row.treatment);
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  };

  (otherTreatments || [])
    .filter(isChemicalOtherTreatment)
    .forEach((ot) => addRow(savedOtherTreatmentToFormRow(ot)));

  if (rows.length) return rows;
  return [emptyRow || { ...EMPTY_OTHER_TREATMENT_ROW, quantity: "", scheduledDate: "", scheduledDates: [] }];
}
