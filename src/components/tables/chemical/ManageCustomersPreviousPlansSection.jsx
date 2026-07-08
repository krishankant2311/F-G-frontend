import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import ViewArchivedPlan from "./components/ViewArchivedPlan";
import { resolveArchivedPlanBillingDisplay } from "../../../utils/archivedPlanBilling";
import { consumeHighlightedArchivedPlan } from "../../../utils/archivedPlanHighlight";

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
};

const formatArchivedDate = (val) => {
  if (!val) return "—";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const reasonLabel = (plan) => {
  if (plan?.archiveReason === "schedule_update") return "Schedule update";
  if (plan?.status === "Expired") return "Year expired";
  return "Year rollover";
};

const buildTreatmentPreviewRows = (plan) => {
  const rows = [];
  (plan?.annualTreatments || []).forEach((at) => {
    const dates = Array.isArray(at.scheduleDates)
      ? at.scheduleDates.filter(Boolean)
      : at.scheduleDate
        ? [at.scheduleDate]
        : [];
    rows.push({
      treatment: at.name || "—",
      qty: at.quantity ?? 0,
      date: dates[0] || "—",
      price: Number(at.price || 0),
      type: "Annual",
    });
  });
  (plan?.otherTreatments || []).forEach((ot) => {
    const qty = Number(ot.qty || 0);
    const pricePerTank = Number(ot.totalPricePerTank || 0);
    rows.push({
      treatment: ot.treatment || ot.mixName || "Other",
      qty,
      date: ot.date || ot.scheduleDate || "—",
      price: qty * pricePerTank,
      type: "Other",
    });
  });
  return rows;
};

export default function ManageCustomersPreviousPlansSection({ refreshToken = 0 }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [perPageRecords] = useState(10);
  const [highlightPlanId, setHighlightPlanId] = useState(null);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [viewPlan, setViewPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const fetchRecentArchivedPlans = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/archived-plans`,
        {
          headers: { token },
          params: {
            page: currentPage,
            limit: perPageRecords,
            sortby: "archivedAt",
            sortorder: -1,
          },
        }
      );

      if (response.data.success) {
        const data = response.data.data || {};
        setPlans(data.plans || []);
        setTotalPages(data.totalPages || 1);
        setTotalRecords(data.totalRecords || 0);
      }
    } catch (error) {
      console.error("Failed to load previous plans:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, perPageRecords]);

  useEffect(() => {
    setCurrentPage(1);
  }, [refreshToken]);

  useEffect(() => {
    const highlight = consumeHighlightedArchivedPlan();
    if (highlight?.id) {
      setHighlightPlanId(highlight.id);
      setExpandedPlanId(highlight.id);
    }
    fetchRecentArchivedPlans();
  }, [fetchRecentArchivedPlans, refreshToken]);

  const openViewModal = async (planId) => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Please log in again.");
        return;
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/archived-plans/${planId}`,
        { headers: { token } }
      );
      if (response.data.success && response.data.data) {
        setViewPlan(response.data.data);
        setShowViewModal(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load archived plan");
    }
  };

  const handleDelete = async (item) => {
    if (!item?._id || actionLoadingId) return;
    const confirmed = window.confirm(
      `Delete archived plan for "${item.customerName}" (${item.planYear})?\n\nThis only removes the archive record. The active customer plan is not changed.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(item._id);
      const token = localStorage.getItem("f&gstafftoken");
      const response = await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/archived-plans/${item._id}`,
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success(response.data.message || "Archived plan deleted");
        if (expandedPlanId === item._id) setExpandedPlanId(null);
        if (highlightPlanId === item._id) setHighlightPlanId(null);
        fetchRecentArchivedPlans();
      } else {
        toast.error(response.data.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const previousPage = () => {
    if (currentPage <= 1) return;
    setExpandedPlanId(null);
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) return;
    setExpandedPlanId(null);
    setCurrentPage(currentPage + 1);
  };

  if (!loading && totalRecords === 0) {
    return (
      <div className="card mt-6">
        <div className="card-header bg-[#00613e] text-white py-3 px-4">
          <h3 className="text-lg font-semibold m-0 pl-4">Previous Customer Plans</h3>
        </div>
        <div className="p-6 text-center text-gray-500 text-sm">
          No archived plans yet.
        </div>
      </div>
    );
  }

  return (
    <div className="card mt-6">
      <div className="card-header bg-[#00613e] text-white py-3 px-4">
        <h3 className="text-lg font-semibold m-0 pl-4">Previous Customer Plans</h3>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-500">Loading previous plans...</div>
      ) : (
        <div className="card-body overflow-x-auto p-0">
          <table className="table table-bordered table-striped text-center mb-0">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan Year</th>
                <th>Source</th>
                <th>Contract</th>
                <th>Used</th>
                <th>Archived</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((item) => {
                const billing = resolveArchivedPlanBillingDisplay(item);
                const isHighlighted = highlightPlanId === item._id;
                const isExpanded = expandedPlanId === item._id;
                const previewRows = buildTreatmentPreviewRows(item);

                return (
                  <React.Fragment key={item._id}>
                    <tr className={isHighlighted ? "bg-green-50" : undefined}>
                      <td>{item.customerName}</td>
                      <td>{item.planYear}</td>
                      <td>{reasonLabel(item)}</td>
                      <td>{formatMoney(billing.contractTotal)}</td>
                      <td>{formatMoney(billing.usedAmount)}</td>
                      <td>{formatArchivedDate(item.archivedAt)}</td>
                      <td className="flex justify-center gap-3 py-2">
                        <button
                          type="button"
                          title="Show plan snapshot"
                          onClick={() =>
                            setExpandedPlanId(isExpanded ? null : item._id)
                          }
                        >
                          <i className={`fa ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"}`} />
                        </button>
                        <button
                          type="button"
                          title="View full archived plan"
                          onClick={() => openViewModal(item._id)}
                        >
                          <i className="fa fa-eye" />
                        </button>
                        <button
                          type="button"
                          title="Delete archive record"
                          onClick={() => handleDelete(item)}
                          disabled={actionLoadingId === item._id}
                        >
                          <i className="fa fa-trash" />
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="text-left bg-gray-50 p-4">
                          <div className="text-sm font-semibold text-[#00613e] mb-2">
                            Plan snapshot — {item.customerName} ({item.planYear})
                          </div>
                          {previewRows.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full min-w-[640px] border text-sm">
                                <thead className="bg-[#00613e] text-white">
                                  <tr>
                                    <th className="p-2 border">Type</th>
                                    <th className="p-2 border">Treatment</th>
                                    <th className="p-2 border">Qty</th>
                                    <th className="p-2 border">Date</th>
                                    <th className="p-2 border">Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {previewRows.map((row, idx) => (
                                    <tr key={`${item._id}-row-${idx}`}>
                                      <td className="p-2 border">{row.type}</td>
                                      <td className="p-2 border">{row.treatment}</td>
                                      <td className="p-2 border">{row.qty}</td>
                                      <td className="p-2 border">
                                        {row.date === "—"
                                          ? "—"
                                          : formatArchivedDate(row.date)}
                                      </td>
                                      <td className="p-2 border">
                                        {formatMoney(row.price)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm mb-0">
                              No treatment rows in this archive snapshot.
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          <div className="flex lg:flex-row flex-col lg:items-end items-center justify-between px-4 py-3">
            <div>
              <p className="mb-0">
                Showing{" "}
                {totalRecords === 0
                  ? 0
                  : perPageRecords * currentPage - (perPageRecords - 1)}{" "}
                to{" "}
                {currentPage * perPageRecords > totalRecords
                  ? totalRecords
                  : currentPage * perPageRecords}{" "}
                of {totalRecords} entries
              </p>
            </div>
            <div className="flex justify-end mt-2 lg:mt-0">
              <button
                type="button"
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={previousPage}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  type="button"
                  className={`border-x px-[10px] py-1 ${
                    currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                  }`}
                  key={i}
                  onClick={() => {
                    setExpandedPlanId(null);
                    setCurrentPage(i + 1);
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={nextPage}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <ViewArchivedPlan
        show={showViewModal}
        plan={viewPlan}
        onClose={() => {
          setShowViewModal(false);
          setViewPlan(null);
        }}
      />
    </div>
  );
}
