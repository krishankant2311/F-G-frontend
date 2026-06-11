import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { planChemicalsImportFromMixes } from "../../../../utils/chemicalMixSync";

const SyncChemicalsFromMixes = ({ show, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [plan, setPlan] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });

  useEffect(() => {
    if (!show) return;
    loadPlan();
  }, [show]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      setPlan(null);
      setSelectedKeys(new Set());

      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Please log in again.");
        onClose?.();
        return;
      }

      const headers = { token };
      const base = process.env.REACT_APP_API_BASE_URL;

      const [mixRes, chemRes] = await Promise.all([
        axios.get(`${base}/chemical-maintenance/mixes`, { headers }),
        axios.get(`${base}/chemical-maintenance/get-all-chemical`, {
          headers,
          params: { page: 1, limit: 5000, search: "" },
        }),
      ]);

      const mixes = mixRes.data?.success ? mixRes.data.data || [] : [];
      const master =
        chemRes.data?.statusCode === 200
          ? chemRes.data.result?.chemicals || []
          : [];

      if (!mixRes.data?.success) {
        toast.error(mixRes.data?.message || "Failed to load chemical mixes");
        return;
      }

      const importPlan = planChemicalsImportFromMixes(mixes, master);
      setPlan(importPlan);
      setSelectedKeys(
        new Set(importPlan.toImport.map((row) => row.key))
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message ||
          "Failed to load mixes and chemicals for import"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (!plan?.toImport?.length) return;
    const allSelected = selectedKeys.size === plan.toImport.length;
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(plan.toImport.map((r) => r.key)));
    }
  };

  const runImport = async () => {
    if (!plan?.toImport?.length || importing) return;

    const rows = plan.toImport.filter((r) => selectedKeys.has(r.key));
    if (!rows.length) {
      toast.info("Select at least one chemical to import.");
      return;
    }

    const token = localStorage.getItem("f&gstafftoken");
    if (!token) {
      toast.error("Please log in again.");
      return;
    }

    setImporting(true);
    setImportProgress({ done: 0, total: rows.length });

    let added = 0;
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/add-chemical`,
          row.payload,
          { headers: { token } }
        );
        if (res.data?.success) {
          added += 1;
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        console.error("Import failed for", row.chemicalName, error);
      }
      setImportProgress({ done: i + 1, total: rows.length });
    }

    setImporting(false);

    if (added > 0) {
      toast.success(
        `Added ${added} chemical${added === 1 ? "" : "s"} to master list.${
          failed > 0 ? ` ${failed} failed.` : ""
        }`
      );
      onSuccess?.();
      await loadPlan();
    } else {
      toast.error("No chemicals were imported. Check errors in console.");
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h4 className="text-lg font-bold m-0">Import chemicals from mixes</h4>
          <button
            type="button"
            className="text-2xl leading-none px-2"
            onClick={onClose}
            disabled={importing}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 text-sm">
          <p className="text-gray-700 mb-3">
            Pulls every unique chemical name from all <strong>Chemical Mixes</strong> and
            adds missing ones to this master <strong>Chemicals</strong> list (no
            duplicates by name). Cost and price are imported as <strong>per-ounce</strong>{" "}
            values from the mix (price = 2× cost).
          </p>

          {loading && <p>Loading mixes and chemicals…</p>}

          {!loading && plan && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <div className="border rounded p-2 bg-gray-50">
                  <div className="font-semibold">In mixes (unique)</div>
                  <div className="text-xl">{plan.extractedCount}</div>
                </div>
                <div className="border rounded p-2 bg-green-50">
                  <div className="font-semibold">Already in Chemicals</div>
                  <div className="text-xl">{plan.alreadyInMaster.length}</div>
                </div>
                <div className="border rounded p-2 bg-amber-50">
                  <div className="font-semibold">Ready to import</div>
                  <div className="text-xl">{plan.toImport.length}</div>
                </div>
              </div>

              {plan.toImport.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <label className="font-semibold flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={
                          plan.toImport.length > 0 &&
                          selectedKeys.size === plan.toImport.length
                        }
                        onChange={toggleAll}
                        disabled={importing}
                      />
                      Select all to import ({selectedKeys.size} selected)
                    </label>
                  </div>
                  <div className="overflow-x-auto border rounded max-h-[40vh]">
                    <table className="table table-sm table-bordered mb-0 text-xs">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th />
                          <th>Chemical name</th>
                          <th>Brand</th>
                          <th>Type</th>
                          <th>Cost (per oz)</th>
                          <th>Price (per oz)</th>
                          <th>Used in mixes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plan.toImport.map((row) => (
                          <tr key={row.key}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedKeys.has(row.key)}
                                onChange={() => toggleRow(row.key)}
                                disabled={importing}
                              />
                            </td>
                            <td className="text-start">{row.chemicalName}</td>
                            <td>{row.payload.brandName}</td>
                            <td>{row.payload.type}</td>
                            <td>{row.payload.cost}</td>
                            <td>{row.payload.price}</td>
                            <td className="text-start max-w-[200px] truncate" title={(row.sourceMixNames || []).join(", ")}>
                              {(row.sourceMixNames || []).join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-green-700 font-medium">
                  All chemicals from mixes are already in the master Chemicals list.
                </p>
              )}

              {plan.alreadyInMaster.length > 0 && (
                <details className="mt-4">
                  <summary className="cursor-pointer font-semibold">
                    Already in master ({plan.alreadyInMaster.length}) — click to view
                  </summary>
                  <ul className="mt-2 max-h-32 overflow-y-auto text-xs list-disc pl-5">
                    {plan.alreadyInMaster.map((row) => (
                      <li key={row.key}>{row.chemicalName}</li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}

          {importing && (
            <p className="mt-3 text-[#00613e] font-medium">
              Importing… {importProgress.done} / {importProgress.total}
            </p>
          )}
        </div>

        <div className="px-4 py-3 border-t flex justify-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={importing}
          >
            Close
          </button>
          <button
            type="button"
            className="btn bg-[#00613e] text-white"
            onClick={runImport}
            disabled={
              loading ||
              importing ||
              !plan?.toImport?.length ||
              selectedKeys.size === 0
            }
          >
            {importing
              ? "Importing…"
              : `Import selected (${selectedKeys.size})`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SyncChemicalsFromMixes;
