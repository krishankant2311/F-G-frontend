import React, { useEffect, useState } from "react";
import {
  formatPreviewMoney,
  getMaterialDisplayName,
  mergeAllDuplicateMaterials,
  unmergeAllMaterials,
} from "../../../utils/customerCopyMaterialMerge";

const fieldClass = "border-b border-[grey] outline-none w-full bg-gray-50 px-1 py-1";

export default function CustomerSalesOrderPreviewModal({
  show,
  materialRows,
  onClose,
  onGenerateMergeCopy,
  isGenerating = false,
}) {
  const [previewRows, setPreviewRows] = useState([]);

  useEffect(() => {
    if (!show) return;
    const initial = (materialRows || []).map((row) =>
      JSON.parse(JSON.stringify(row))
    );
    setPreviewRows(initial);
    // Only reset preview when the modal opens — not on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  const hasMergedRows = previewRows.some((row) => row.isMergedMaterial);

  const handleMergeDuplicates = () => {
    setPreviewRows((rows) => mergeAllDuplicateMaterials(rows));
  };

  const handleUnmergeAll = () => {
    setPreviewRows((rows) => unmergeAllMaterials(rows));
  };

  const handleGenerateMergeCopy = async () => {
    await onGenerateMergeCopy?.(previewRows);
  };

  const stopModalEvent = (event) => {
    event.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={stopModalEvent}
      onClick={stopModalEvent}
    >
      <div
        className="bg-white w-full max-w-6xl max-h-[92vh] overflow-y-auto rounded shadow-lg"
        onMouseDown={stopModalEvent}
        onClick={stopModalEvent}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-xl font-semibold text-red-600 w-full text-center">
            Customer Sales Order Preview
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-600 hover:text-black text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-6">
          {previewRows.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              No F&amp;G or Other material lines to preview.
            </p>
          ) : (
            previewRows.map((row, index) => (
              <div key={`preview-row-${index}`} className="border-b pb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="font-semibold text-sm">Source *</label>
                    <input
                      className={fieldClass}
                      value={row.source || ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Material Type *</label>
                    <input
                      className={fieldClass}
                      value={row.type || ""}
                      readOnly
                    />
                  </div>
                  {row.source === "Other" && (
                    <div>
                      <label className="font-semibold text-sm">Vendor Name</label>
                      <input
                        className={fieldClass}
                        value={row.vendorName || ""}
                        readOnly
                      />
                    </div>
                  )}
                  <div className={row.source === "Other" ? "" : "md:col-span-2"}>
                    <label className="font-semibold text-sm">Material Name *</label>
                    <input
                      className={fieldClass}
                      value={getMaterialDisplayName(row)}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Measure *</label>
                    <input
                      className={fieldClass}
                      value={row.measure || ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Quantity *</label>
                    <input
                      className={fieldClass}
                      value={row.quantity ?? ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Cost *</label>
                    <input
                      className={fieldClass}
                      value={formatPreviewMoney(row.cost)}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">
                      {row.source === "Other" ? "Mark up" : "Markup *"}
                    </label>
                    <input
                      className={fieldClass}
                      value={row.markup ?? row.markUp ?? ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Price *</label>
                    <input
                      className={fieldClass}
                      value={formatPreviewMoney(row.price)}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Total Price *</label>
                    <input
                      className={fieldClass}
                      value={formatPreviewMoney(row.totalPrice)}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-sm">Taxable</label>
                    <input
                      className={fieldClass}
                      value={
                        row.isTaxable === true || row.isTaxable === "true"
                          ? "Yes"
                          : "No"
                      }
                      readOnly
                    />
                  </div>
                  {row.source === "Other" && (
                    <>
                      <div>
                        <label className="font-semibold text-sm">Invoice</label>
                        <input
                          className={fieldClass}
                          value={row.invoice || ""}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-sm">P.O.</label>
                        <input
                          className={fieldClass}
                          value={row.PO || ""}
                          readOnly
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {hasMergedRows ? (
            <button
              type="button"
              className="btn bg-[#1e3a8a] text-white"
              onClick={handleUnmergeAll}
            >
              Unmerge
            </button>
          ) : (
            <button
              type="button"
              className="btn bg-[#1e3a8a] text-white"
              onClick={handleMergeDuplicates}
            >
              Merge Duplicate Materials
            </button>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn border px-4" onClick={onClose}>
              Close
            </button>
            {hasMergedRows && (
              <button
                type="button"
                className="btn bg-[#00613e] text-white"
                onClick={handleGenerateMergeCopy}
                disabled={isGenerating}
              >
                {isGenerating ? "Please wait..." : "Generate Merge Copy"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
