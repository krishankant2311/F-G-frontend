import { normalizeProgramType } from "./otherTreatmentDefaults";



const STORAGE_KEY = "fandg_other_treatments_custom";



const readRaw = () => {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];

  } catch {

    return [];

  }

};



const writeRaw = (items) => {

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

};



export function getCustomLocalTreatments() {

  return readRaw();

}



export function addCustomLocalTreatment(item) {

  const next = {

    _id: `local-custom-${Date.now()}`,

    treatmentName: item.treatmentName,

    cost: Number(item.cost) || 0,

    price: Number(item.price) || 0,

    lowerPrice: Number(item.lowerPrice) || 0,

    quantity: String(item.quantity || "").trim(),

    unit: String(item.unit || "").trim(),

    programType: normalizeProgramType(item.programType),

    sortOrder: Number(item.sortOrder) || 0,

    _isLocalOnly: true,

  };

  const items = [...readRaw(), next];

  writeRaw(items);

  return next;

}



export function updateCustomLocalTreatment(id, patch) {

  const items = readRaw().map((item) =>

    item._id === id

      ? {

          ...item,

          ...patch,

          cost: Number(patch.cost ?? item.cost) || 0,

          price: Number(patch.price ?? item.price) || 0,

          lowerPrice: Number(patch.lowerPrice ?? item.lowerPrice) || 0,

          quantity: String(patch.quantity ?? item.quantity ?? "").trim(),

          unit: String(patch.unit ?? item.unit ?? "").trim(),

          programType: normalizeProgramType(patch.programType ?? item.programType),

          sortOrder: Number(patch.sortOrder ?? item.sortOrder) || 0,

        }

      : item

  );

  writeRaw(items);

  return items.find((item) => item._id === id) || null;

}



export function deleteCustomLocalTreatment(id) {

  const items = readRaw().filter((item) => item._id !== id);

  writeRaw(items);

}



export function isApiUnavailableError(error) {

  if (!error?.response) return true;

  const status = error.response.status;

  return status === 404 || status >= 500;

}

