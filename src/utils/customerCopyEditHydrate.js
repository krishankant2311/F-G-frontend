import {
  ensureFgCostFromPrice,
  hydrateOtherFieldCopyFromApi,
  materialNameBaseForEdit,
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
      return row;
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

    return row;
  });
}
