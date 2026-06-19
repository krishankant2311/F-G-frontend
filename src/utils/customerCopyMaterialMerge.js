import {
  applyReferenceVendorToForm,
  getMaterialNameInputValue,
  materialNameBaseForEdit,
  recalcOtherFieldCopyLine,
} from "./materialReference";

export function isMergeableMaterialRow(form) {
  return (
    form &&
    (form.source === "F&G" || form.source === "Other") &&
    !form.isMergedMaterial
  );
}

export function getMaterialMergeKey(form) {
  if (!form) return "";
  const base = materialNameBaseForEdit(
    String(form.referenceBase || form.reference || ""),
    form.vendorName
  )
    .trim()
    .toUpperCase();
  const type = String(form.type || "").trim().toUpperCase();
  const measure = String(form.measure || "").trim().toUpperCase();
  if (!base || !type) return "";
  return `${type}||${base}||${measure}`;
}

export function extractMaterialRows(forms = []) {
  return forms.filter(
    (row) =>
      row?.source === "F&G" ||
      row?.source === "Other" ||
      row?.isMergedMaterial
  );
}

export function replaceMaterialRowsInForms(allForms = [], newMaterialRows = []) {
  const isMaterialRow = (row) =>
    row?.source === "F&G" ||
    row?.source === "Other" ||
    row?.isMergedMaterial;

  let materialInserted = false;
  const result = [];

  for (const row of allForms) {
    if (isMaterialRow(row)) {
      if (!materialInserted) {
        result.push(...newMaterialRows);
        materialInserted = true;
      }
      continue;
    }
    result.push(row);
  }

  if (!materialInserted) {
    result.push(...newMaterialRows);
  }

  return result;
}

export function mergeMaterialRowsIntoOne(group = []) {
  if (!group.length) return null;

  const quantity = group.reduce(
    (sum, row) => sum + (parseFloat(row.quantity) || 0),
    0
  );
  const highestPrice = Math.max(
    ...group.map((row) => parseFloat(row.price) || 0)
  );
  const highestCost = Math.max(
    ...group.map((row) => parseFloat(row.cost) || 0)
  );
  const otherRow = group.find((row) => row.source === "Other");
  const template = otherRow || group[0];
  const vendorName =
    group.map((row) => String(row.vendorName || "").trim()).find(Boolean) || "";
  const referenceBase = materialNameBaseForEdit(
    String(template.referenceBase || template.reference || ""),
    template.vendorName
  );

  const merged = applyReferenceVendorToForm({
    ...template,
    source: "Other",
    vendorName,
    referenceBase,
    quantity,
    price: highestPrice,
    cost:
      highestCost > 0
        ? highestCost
        : highestPrice > 0
          ? Math.round((highestPrice / 2) * 10000) / 10000
          : "",
    markup: template.markup ?? template.markUp ?? 100,
    markUp: template.markUp ?? template.markup ?? 100,
    isTaxable: group.some(
      (row) => row.isTaxable === true || row.isTaxable === "true"
    ),
    invoice: group.map((row) => row.invoice).find(Boolean) || "",
    PO: group.map((row) => row.PO).find(Boolean) || "",
    isMergedMaterial: true,
    mergedMaterialBackup: group.map((row) => JSON.parse(JSON.stringify(row))),
    mergeKey: getMaterialMergeKey(group[0]),
  });

  return recalcOtherFieldCopyLine(merged, highestCost > 0 ? "cost" : "price");
}

export function mergeAllDuplicateMaterials(forms = []) {
  const next = [...forms];
  const groups = new Map();

  next.forEach((row, index) => {
    if (!isMergeableMaterialRow(row)) return;
    const key = getMaterialMergeKey(row);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  });

  const indicesToRemove = new Set();
  const replacements = new Map();

  for (const indices of groups.values()) {
    if (indices.length < 2) continue;
    const groupRows = indices.map((i) => next[i]);
    const merged = mergeMaterialRowsIntoOne(groupRows);
    if (!merged) continue;
    replacements.set(indices[0], merged);
    indices.slice(1).forEach((i) => indicesToRemove.add(i));
  }

  if (!replacements.size) return forms;

  return next
    .map((row, index) => (replacements.has(index) ? replacements.get(index) : row))
    .filter((_, index) => !indicesToRemove.has(index));
}

export function unmergeMaterialAtIndex(forms = [], index) {
  const row = forms[index];
  if (!row?.isMergedMaterial || !Array.isArray(row.mergedMaterialBackup)) {
    return forms;
  }
  const restored = row.mergedMaterialBackup.map((item) => ({ ...item }));
  return [...forms.slice(0, index), ...restored, ...forms.slice(index + 1)];
}

export function unmergeAllMaterials(forms = []) {
  const result = [];
  for (const row of forms) {
    if (row?.isMergedMaterial && Array.isArray(row.mergedMaterialBackup)) {
      result.push(...row.mergedMaterialBackup.map((item) => ({ ...item })));
    } else {
      result.push(row);
    }
  }
  return result;
}

export function getMaterialDisplayName(form) {
  return getMaterialNameInputValue(form) || form?.reference || "";
}

export function formatPreviewMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toFixed(2);
}
