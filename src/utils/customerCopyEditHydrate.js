import {
  ensureFgCostFromPrice,
  hydrateOtherFieldCopyFromApi,
  materialNameBaseForEdit,
  recalcFgFieldCopyLineTotals,
  recalcLaborGenerateCustomerLine,
} from "./materialReference";

/** Job-type labor totals from get-customer-copy → EditCustomerFieldCopy labor inputs. */
export function hydrateLaborDataFromCustomerCopy(laborRows = []) {
  return (laborRows || []).map((row) => ({
    jobType: row.jobType,
    totalPrice: Number(row.totalPrice) || 0,
    isLaborTaxable: row.isLaborTaxable ?? false,
  }));
}

/**
 * Lump Sum generate/edit: restore cost + markup when office/customer copy
 * only has totalPrice (or markup stored as schema default 0).
 */
export function recoverLumpSumCostAndMarkup(form) {
  if (
    !form ||
    (form.source !== "Lump Sum" &&
      !String(form.source || "").includes("Lump Sum"))
  ) {
    return form;
  }

  const row = { ...form };
  let cost = parseFloat(row.cost);
  if (!Number.isFinite(cost) || cost < 0) cost = 0;
  let totalPrice = parseFloat(row.totalPrice);
  if (!Number.isFinite(totalPrice) || totalPrice < 0) totalPrice = 0;
  // Schema default markup is 0 — treat 0 as missing when recovering from totalPrice.
  let markupPct = parseFloat(row.markUp ?? row.markup);
  if (!Number.isFinite(markupPct) || markupPct <= 0) markupPct = NaN;

  if (!Number.isFinite(markupPct) && cost > 0 && totalPrice > 0) {
    markupPct = Math.round(((totalPrice - cost) / cost) * 10000) / 100;
  }
  if (!(cost > 0) && totalPrice > 0 && Number.isFinite(markupPct) && markupPct > 0) {
    cost = Math.round((totalPrice / (1 + markupPct / 100)) * 100) / 100;
  }
  // Common generate case: only total kept → assume 100% markup.
  if (!(cost > 0) && totalPrice > 0 && !(markupPct > 0)) {
    markupPct = 100;
    cost = Math.round((totalPrice / 2) * 100) / 100;
  }

  if (Number.isFinite(markupPct) && markupPct > 0) {
    row.markup = markupPct;
    row.markUp = markupPct;
  } else {
    const synced = row.markUp ?? row.markup;
    row.markup = synced;
    row.markUp = synced;
  }
  if (cost > 0) {
    row.cost = cost;
    row.totalCost = cost;
  }
  return row;
}

/** Flat customerCopiesData lines → editable form rows (Generate Customer Copy shape). */
export function hydrateFormsFromCustomerCopyData(copyLines = []) {
  return (copyLines || []).map((form) => {
    const row = {
      ...form,
      type: form.type || form.jobType || "",
      referenceBase: materialNameBaseForEdit(
        String(form.reference || ""),
        form.vendorName
      ),
      intialReference: form.reference,
      initialJobType: form.type || form.jobType,
    };

    if (form.source === "F&G") {
      Object.assign(row, ensureFgCostFromPrice(row));
      const fgCost = parseFloat(row.cost) || 0;
      const fgPrice = parseFloat(row.price) || 0;
      if (fgCost > 0 && fgPrice > 0) {
        row.markup = Math.round(((fgPrice - fgCost) / fgCost) * 10000) / 100;
        row.markUp = row.markup;
      }
      return recalcFgFieldCopyLineTotals(row);
    }

    if (form.source === "Other") {
      const cost = parseFloat(form.cost) || 0;
      const price = parseFloat(form.price) || 0;
      if (cost > 0 && price > 0) {
        row.markup = Math.round(((price - cost) / cost) * 10000) / 100;
        row.markUp = row.markup;
      }
      return hydrateOtherFieldCopyFromApi(row);
    }

    if (form.source === "Labor") {
      return recalcLaborGenerateCustomerLine(row);
    }

    if (
      form.source === "Lump Sum" ||
      String(form.source || "").includes("Lump Sum")
    ) {
      return recoverLumpSumCostAndMarkup(row);
    }

    const syncedMarkup = row.markUp ?? row.markup;
    if (syncedMarkup !== undefined && syncedMarkup !== null && syncedMarkup !== "") {
      row.markup = syncedMarkup;
      row.markUp = syncedMarkup;
    }
    return row;
  });
}
