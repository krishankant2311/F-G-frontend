import axios from "axios";
import React, { useEffect, useState } from "react";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ViewArchivedPlan from "./components/ViewArchivedPlan";
import { resolveArchivedPlanBillingDisplay } from "../../../utils/archivedPlanBilling";

const formatMoney = (val) => {
  const n = Number(val);
  if (!Number.isFinite(n)) return "-";
  return `$${n.toFixed(2)}`;
};

const SortIcon = ({ column, sortBy, sortOrder }) => (
  <i
    className={`${
      sortOrder === "asc" && sortBy === column
        ? "fa fa-sort-amount-asc"
        : "fa fa-sort-amount-desc"
    } ml-2`}
  />
);

export default function ArchivedPlansTable() {
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [availableYears, setAvailableYears] = useState([]);
  const [planYearFilter, setPlanYearFilter] = useState("all");
  const [sortBy, setSortBy] = useState("archivedAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [perPageRecords, setPerPageRecords] = useState(50);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [viewPlan, setViewPlan] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState("");

  const { tableSize } = useTableContext();

  useEffect(() => {
    fetchArchivedPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, sortBy, sortOrder, perPageRecords, debouncedTerm, planYearFilter]);

  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedTerm(term);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(delay);
  }, [term]);

  const fetchArchivedPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Please log in again.");
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/archived-plans`,
        {
          headers: { token },
          params: {
            page: currentPage,
            limit: perPageRecords,
            search: debouncedTerm || "",
            planYear: planYearFilter,
            sortby: sortBy,
            sortorder: sortOrder === "asc" ? 1 : -1,
          },
        }
      );

      if (response.data.success && response.data.data) {
        const { plans, totalPages: tp, totalRecords: tr, availableYears: years } =
          response.data.data;
        const mapped = (plans || []).map((item, index) => ({
          ...item,
          serialNo: (currentPage - 1) * perPageRecords + index + 1,
        }));
        setData(mapped);
        setTotalPages(tp || 1);
        setTotalRecords(tr || 0);
        setAvailableYears(Array.isArray(years) ? years : []);
      } else {
        setData([]);
        setTotalPages(0);
        setTotalRecords(0);
      }
    } catch (error) {
      console.error("Failed to load archived plans:", error);
      toast.error(error.response?.data?.message || "Failed to load archived plans");
      setData([]);
      setTotalPages(0);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const openViewModal = async (planId) => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/archived-plans/${planId}`,
        { headers: { token } }
      );
      if (response.data.success) {
        setViewPlan(response.data.data);
        setShowViewModal(true);
      } else {
        toast.error("Failed to load archived plan details");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load archived plan details");
    }
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
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
        fetchArchivedPlans();
      } else {
        toast.error(response.data.message || "Delete failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const handleRestore = async (item) => {
    if (!item?._id || actionLoadingId) return;
    const confirmed = window.confirm(
      `Restore "${item.customerName}" plan to ${item.planYear}?\n\nThis puts the archived treatments and billing back on the active customer and removes this archive entry.`
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(item._id);
      const token = localStorage.getItem("f&gstafftoken");
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/archived-plans/${item._id}/restore`,
        {},
        { headers: { token } }
      );
      if (response.data.success) {
        toast.success(response.data.message || "Plan restored");
        fetchArchivedPlans();
      } else {
        toast.error(response.data.message || "Restore failed");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Restore failed");
    } finally {
      setActionLoadingId("");
    }
  };

  const previousPage = () => {
    if (currentPage <= 1) return;
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) return;
    setCurrentPage(currentPage + 1);
  };

  const yearOptions = [
    { value: "all", label: "All years" },
    ...availableYears.map((y) => ({ value: String(y), label: String(y) })),
  ];

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b flex-wrap gap-3">
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">ARCHIVED PLANS</h3>
          </div>
          <div className="flex justify-end flex-wrap gap-2 w-auto items-center">
            <select
              value={planYearFilter}
              onChange={(e) => {
                setPlanYearFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border p-1 outline-none cursor-pointer h-[34px] min-w-[120px]"
            >
              {yearOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={perPageRecords}
              onChange={(e) => {
                setPerPageRecords(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-[60px] border p-1 outline-none cursor-pointer h-[34px]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
            </select>
            <input
              type="text"
              placeholder="Search customer"
              className="border border-black px-2 outline-none py-1 h-[34px]"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4 py-2 text-sm text-gray-600 border-b">
          Expired / archived customer plans. Use Restore to undo a mistaken rollover, or Delete to remove an archive record.
        </div>

        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th>S. No.</th>
                <th onClick={() => handleSort("customerName")}>
                  Customer
                  <SortIcon column="customerName" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th onClick={() => handleSort("planYear")}>
                  Plan Year
                  <SortIcon column="planYear" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th>Status</th>
                <th onClick={() => handleSort("contractTotal")}>
                  Contract
                  <SortIcon column="contractTotal" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th onClick={() => handleSort("usedAmount")}>
                  Used
                  <SortIcon column="usedAmount" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th>Remaining</th>
                <th onClick={() => handleSort("archivedAt")}>
                  Archived
                  <SortIcon column="archivedAt" sortBy={sortBy} sortOrder={sortOrder} />
                </th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading ? (
                data.length > 0 ? (
                  data.map((item) => {
                    const billing = resolveArchivedPlanBillingDisplay(item);
                    return (
                    <tr key={item._id}>
                      <td>{item.serialNo}</td>
                      <td className="text-left">{item.customerName}</td>
                      <td>{item.planYear}</td>
                      <td>{item.status || "Archived"}</td>
                      <td>{formatMoney(billing.contractTotal)}</td>
                      <td>{formatMoney(billing.usedAmount)}</td>
                      <td>{formatMoney(billing.remainingAmount)}</td>
                      <td>
                        {item.archivedAt
                          ? new Date(item.archivedAt).toLocaleDateString("en-US")
                          : "—"}
                      </td>
                      <td className="flex justify-center gap-4">
                        <button
                          type="button"
                          onClick={() => openViewModal(item._id)}
                          title="View archived plan"
                        >
                          <i className="fa fa-eye text-sm"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestore(item)}
                          disabled={actionLoadingId === item._id}
                          title="Restore plan back to active customer"
                        >
                          <i className="fa fa-refresh"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={actionLoadingId === item._id}
                          title="Delete archive record"
                        >
                          <i className="fa fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-4 text-gray-500">
                      No archived plans found.
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td colSpan={9} className="py-4">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card-footer flex justify-between items-center px-4 py-3">
          <div className="text-sm">
            Total records: {totalRecords}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={previousPage}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span className="text-sm">
              Page {currentPage} of {Math.max(totalPages, 1)}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={nextPage}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ViewArchivedPlan
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewPlan(null);
        }}
        plan={viewPlan}
      />
    </div>
  );
}
