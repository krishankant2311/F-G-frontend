import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTableContext } from "../../../../context/TableContext";
import { resolveArchivedPlanBillingDisplay } from "../../../../utils/archivedPlanBilling";

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
};

const formatDisplayDate = (dateVal) => {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const formatDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const ViewArchivedPlan = ({ show, onClose, plan }) => {
  const { tableSize } = useTableContext();
  const sidebarLeftClass =
    tableSize === 250 ? "md:left-[250px]" : "md:left-[90px]";

  useEffect(() => {
    if (!show) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [show]);

  if (!show || !plan) return null;

  const completedRows = Array.isArray(plan.completedTreatments)
    ? plan.completedTreatments
    : [];

  const { contractTotal, usedAmount, remainingAmount } =
    resolveArchivedPlanBillingDisplay(plan);
  const usedPct =
    contractTotal > 0 ? Math.min(100, (usedAmount / contractTotal) * 100) : 0;

  const totalPrice = completedRows.reduce(
    (sum, row) => sum + (Number(row.price) || 0),
    0
  );

  return createPortal(
    <div
      className={`fixed inset-0 left-0 ${sidebarLeftClass} z-[1200] flex items-start sm:items-center justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="archived-plan-modal-title"
    >
      <div
        className="bg-white rounded shadow-lg w-full max-w-5xl max-h-[min(92vh,calc(100dvh-1rem))] flex flex-col my-2 sm:my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#00613e] text-white px-3 sm:px-4 py-3 flex justify-between items-start sm:items-center gap-2 shrink-0">
          <h3 id="archived-plan-modal-title" className="font-semibold m-0 text-sm sm:text-base leading-snug pr-2">
            Archived Plan — {plan.customerName} ({plan.planYear})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white text-2xl leading-none shrink-0 hover:opacity-80"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-gray-500">Plan year</div>
              <div className="font-semibold">{plan.planYear}</div>
            </div>
            <div>
              <div className="text-gray-500">Status</div>
              <div className="font-semibold">{plan.status || "Archived"}</div>
            </div>
            <div>
              <div className="text-gray-500">Archived on</div>
              <div className="font-semibold">{formatDate(plan.archivedAt)}</div>
            </div>
            <div>
              <div className="text-gray-500">Expired on</div>
              <div className="font-semibold">{formatDate(plan.expiredAt)}</div>
            </div>
          </div>

          <div className="border rounded p-3">
            <div className="text-sm font-semibold mb-2">Usage and Billing Summary</div>
            <div className="w-full bg-gray-200 rounded h-3 mb-2">
              <div
                className="bg-[#00613e] h-3 rounded"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-gray-500">Contract total</div>
                <div className="font-semibold">{formatMoney(contractTotal)}</div>
              </div>
              <div>
                <div className="text-gray-500">Used at year end</div>
                <div className="font-semibold">{formatMoney(usedAmount)}</div>
              </div>
              <div>
                <div className="text-gray-500">Remaining</div>
                <div className="font-semibold">{formatMoney(remainingAmount)}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Completed treatments (read-only)</div>
            {completedRows.length > 0 && (
              <div className="text-sm text-right font-semibold text-green-700 mb-2">
                Total Amount: {formatMoney(totalPrice)}
              </div>
            )}
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[640px] border text-sm table-bordered text-center">
              <thead className="bg-[#00613e] text-white">
                <tr>
                  <th className="p-2 border">S. No.</th>
                  <th className="p-2 border">Treatment</th>
                  <th className="p-2 border">Scheduled Date</th>
                  <th className="p-2 border">Price (USD)</th>
                  <th className="p-2 border">Project Code</th>
                  <th className="p-2 border">Quantity</th>
                  <th className="p-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {completedRows.length > 0 ? (
                  completedRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border">{idx + 1}</td>
                      <td className="p-2 border text-left">{row.treatment || "—"}</td>
                      <td className="p-2 border">{formatDisplayDate(row.date)}</td>
                      <td className="p-2 border">
                        {row.price != null && row.price !== ""
                          ? Number(row.price).toFixed(2)
                          : "-"}
                      </td>
                      <td className="p-2 border">{row.projectCode || "-"}</td>
                      <td className="p-2 border">{row.qty ?? "-"}</td>
                      <td className="p-2 border">{row.status || "Completed"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-gray-500">
                      No completed treatments recorded for this plan year.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-0">
            Read-only archive snapshot. Active plan edits happen on Manage Customers.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewArchivedPlan;
