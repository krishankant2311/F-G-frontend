import {
  augmentChemicalMixesWithProgramTreatments,
  DEFAULT_ANNUAL_TREATMENTS,
  findOtherChemicalProgramTreatment,
  normalizeTreatmentNameKey,
} from "./otherTreatmentDefaults";
import { resolveMaterialUnitCost } from "./otherTreatmentDropdown";

export const money2 = (n) =>
  Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function findMixByTreatmentName(name, mixes = []) {
  if (!name) return null;
  const key = normalizeTreatmentNameKey(name);
  if (!key) return null;

  const exact = mixes.find(
    (mix) => normalizeTreatmentNameKey(mix?.mixName) === key
  );
  if (exact) return exact;

  return (
    mixes.find((mix) => {
      const mixKey = normalizeTreatmentNameKey(mix?.mixName);
      if (!mixKey) return false;
      return mixKey.includes(key) || key.includes(mixKey);
    }) || null
  );
}

function findCatalogByTreatmentName(name, catalog = []) {
  if (!name) return null;
  const key = normalizeTreatmentNameKey(name);
  if (!key) return null;

  const exact = catalog.find(
    (item) => normalizeTreatmentNameKey(item?.treatmentName) === key
  );
  if (exact) return exact;

  return (
    catalog.find((item) => {
      const itemKey = normalizeTreatmentNameKey(item?.treatmentName);
      if (!itemKey) return false;
      return itemKey.includes(key) || key.includes(itemKey);
    }) || null
  );
}

function findMaterialByTreatmentName(name, materials = []) {
  if (!name) return null;
  const key = normalizeTreatmentNameKey(name);
  if (!key) return null;

  return (
    materials.find(
      (material) =>
        material?.status === "Active" &&
        normalizeTreatmentNameKey(material?.name) === key
    ) || null
  );
}

function findAnnualProgramDefaultTreatment(name) {
  const key = normalizeTreatmentNameKey(name);
  if (!key) return null;
  return (
    DEFAULT_ANNUAL_TREATMENTS.find(
      (t) => normalizeTreatmentNameKey(t.name) === key
    ) || null
  );
}

/** Same unit-cost sources used when picking from Other / Other Chemical tables. */
export function resolveCatalogUnitCostByName(treatmentName, context) {
  if (!treatmentName || !context) return null;

  const key = normalizeTreatmentNameKey(treatmentName);
  if (!key) return null;

  const catalogItems = context.catalogTreatments || [];

  const augmentedMixes = augmentChemicalMixesWithProgramTreatments(
    context.chemicalMixes || [],
    context.isChemicalMaintenanceEnabled,
    catalogItems
  );

  const catalogExact = catalogItems.find(
    (item) => normalizeTreatmentNameKey(item?.treatmentName) === key
  );
  if (catalogExact && Number(catalogExact.cost) > 0) {
    return money2(catalogExact.cost);
  }

  const annualDefault = findAnnualProgramDefaultTreatment(treatmentName);
  if (annualDefault && Number(annualDefault.cost) > 0) {
    return money2(annualDefault.cost);
  }

  const mixExact = augmentedMixes.find(
    (mix) => normalizeTreatmentNameKey(mix?.mixName) === key
  );
  if (mixExact && Number(mixExact.totalCostPerTank) > 0) {
    return money2(mixExact.totalCostPerTank);
  }

  const catalogFuzzy = findCatalogByTreatmentName(treatmentName, catalogItems);
  if (catalogFuzzy && Number(catalogFuzzy.cost) > 0) {
    return money2(catalogFuzzy.cost);
  }

  const programItem = findOtherChemicalProgramTreatment(treatmentName);
  if (programItem && Number(programItem.cost) > 0) {
    return money2(programItem.cost);
  }

  const mixFuzzy = findMixByTreatmentName(treatmentName, augmentedMixes);
  if (mixFuzzy && Number(mixFuzzy.totalCostPerTank) > 0) {
    return money2(mixFuzzy.totalCostPerTank);
  }

  const material = findMaterialByTreatmentName(
    treatmentName,
    context.materials || []
  );
  if (material) {
    const unitCost = resolveMaterialUnitCost(material);
    if (unitCost > 0) return money2(unitCost);
  }

  return null;
}

export function resolveAnnualUnitPrice({
  price = 0,
  quantity = 0,
  defaultUnitPrice = 100,
} = {}) {
  const qty = Number(quantity) || 0;
  const totalPrice = Number(price) || 0;
  if (qty > 0 && totalPrice > 0) return money2(totalPrice / qty);
  return defaultUnitPrice;
}

export function resolveAnnualUnitCost(
  { cost = 0, price = 0, quantity = 0, treatmentName = "", defaultUnitCost = 80 } = {},
  context = null
) {
  const qty = Number(quantity) || 0;
  const totalCost = Number(cost) || 0;
  const totalPrice = Number(price) || 0;

  const catalogUnitCost = resolveCatalogUnitCostByName(treatmentName, context);
  if (catalogUnitCost != null && catalogUnitCost > 0) {
    return catalogUnitCost;
  }

  if (qty > 0 && totalCost > 0) return money2(totalCost / qty);

  if (qty > 0 && totalPrice > 0) {
    return money2(totalPrice / 2 / qty);
  }

  return defaultUnitCost;
}

export function resolveOtherTreatmentCostPerTank(
  {
    totalCostPerTank = 0,
    treatmentName = "",
    mixId = null,
    materialId = null,
    treatmentCatalogId = null,
  } = {},
  context = null
) {
  const stored = Number(totalCostPerTank) || 0;
  if (stored > 0) return money2(stored);
  if (!context) return 0;

  if (mixId) {
    const mix = (context.chemicalMixes || []).find(
      (item) => String(item._id) === String(mixId)
    );
    if (mix && Number(mix.totalCostPerTank) > 0) {
      return money2(mix.totalCostPerTank);
    }
  }

  if (treatmentCatalogId) {
    const catalogItem = (context.catalogTreatments || []).find(
      (item) => String(item._id) === String(treatmentCatalogId)
    );
    if (catalogItem && Number(catalogItem.cost) > 0) {
      return money2(catalogItem.cost);
    }
  }

  if (materialId) {
    const material = (context.materials || []).find(
      (item) => String(item._id) === String(materialId)
    );
    if (material) {
      const unitCost = resolveMaterialUnitCost(material);
      if (unitCost > 0) return money2(unitCost);
    }
  }

  const fromName = resolveCatalogUnitCostByName(treatmentName, context);
  return fromName != null && fromName > 0 ? fromName : 0;
}

export function resolveScheduleRowUnitCost(item, context = null) {
  if (!item) return 0;

  if (item.type === "other" || item.type === "other-new") {
    if (item.unitCost != null && Number(item.unitCost) > 0) {
      return money2(Number(item.unitCost));
    }

    const baseQty = Number(item.quantity) || 0;
    const baseCost = Number(item.cost) || 0;
    if (baseQty > 0 && baseCost > 0) return money2(baseCost / baseQty);

    return resolveOtherTreatmentCostPerTank(
      {
        totalCostPerTank: item.unitCost,
        treatmentName: item.treatment,
        mixId: item.mixId,
        materialId: item.materialId,
        treatmentCatalogId: item.treatmentCatalogId,
      },
      context
    );
  }

  return resolveAnnualUnitCost(
    {
      cost: item.cost,
      price: item.price,
      quantity: item.quantity,
      treatmentName: item.treatment,
    },
    context
  );
}

export function resolveScheduleRowUnitPrice(item) {
  if (!item) return 0;
  if (item.unitPrice != null && Number(item.unitPrice) > 0) {
    return money2(item.unitPrice);
  }
  const baseQty = Number(item.quantity) || 0;
  const basePrice = Number(item.price) || 0;
  if (baseQty > 0 && basePrice > 0) return money2(basePrice / baseQty);
  return item.type === "annual" ? 100 : 0;
}
