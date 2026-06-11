import axios from "axios";

export const MATERIAL_OPTION_PREFIX = "__material__";
export const CATALOG_OPTION_PREFIX = "__catalog__";

export function resolveMaterialUnitCost(material) {
  const cost = Number(material?.cost);
  if (Number.isFinite(cost) && cost >= 0) return cost;
  const price = Number(material?.price);
  if (Number.isFinite(price) && price >= 0) {
    return Math.round((price / 2 + Number.EPSILON) * 100) / 100;
  }
  return 0;
}

export function resolveMaterialUnitPrice(material, useLowerPrice) {
  if (useLowerPrice) return resolveMaterialUnitCost(material);
  const price = Number(material?.price);
  return Number.isFinite(price) && price >= 0 ? price : 0;
}

export function getOtherTreatmentSelectionKey(row) {
  if (row?.materialData?._id) {
    return `${MATERIAL_OPTION_PREFIX}${row.materialData._id}`;
  }
  if (row?.catalogData?._id) {
    return `${CATALOG_OPTION_PREFIX}${row.catalogData._id}`;
  }
  if (row?.mixData?._id) return row.mixData.mixName;
  if (row?.treatment === "Other") return "";
  return row?.treatment || "";
}

export function buildOtherTreatmentDropdownOptions({
  chemicalMixes = [],
  materials = [],
  isKeyTaken = () => false,
}) {
  const mixOptions = (chemicalMixes || [])
    .filter((mix) => mix?.mixName && !isKeyTaken(mix.mixName))
    .map((mix) => ({
      key: mix.mixName,
      label: mix.mixName,
      kind: "mix",
    }));

  const materialOptions = (materials || [])
    .filter((m) => m?.status === "Active" && m?.name)
    .map((m) => ({
      key: `${MATERIAL_OPTION_PREFIX}${m._id}`,
      label: m.name,
      kind: "material",
    }))
    .filter((m) => !isKeyTaken(m.key));

  return [...mixOptions, ...materialOptions].sort((a, b) =>
    String(a.label).localeCompare(String(b.label))
  );
}

export async function fetchActiveMaterials(apiBaseUrl, token) {
  if (!token) return [];
  const res = await axios.get(`${apiBaseUrl}/project/get-materials-dpd`, {
    headers: { token },
  });
  if (res.data?.statusCode === 200) {
    return Array.isArray(res.data.result) ? res.data.result : [];
  }
  return [];
}
