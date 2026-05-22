import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { buildCustomerWithTreatments } from "./Treatment";
import { ToastContainer, toast } from "react-toastify";
import { useTableContext } from "../../../../../context/TableContext";

import EditCustomer from "./EditCustomer";
import DeleteCustomer from "./DeleteCustomer";
import ViewTreatmentDetails from "./ViewCustomer";
import ResumeTreatment from "./ResumeTreatment";
import CompleteTreatment from "./CompleteTreatment";
import PauseTreatment from "./PauseTreatment";

export default function CustomerTreatmentList() {
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();
  const { customerId } = useParams();
  const location = useLocation();
  const { tableSize } = useTableContext();
  const [perPageRecords, setPerPageRecords] = useState(10);
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const statusParam = new URLSearchParams(location.search).get("status");

  const getHeading = () => {
    if (!statusParam) return "Scheduled Application Dashboard";
    if (statusParam === "Completed") return "CUSTOMER TREATMENT COMPLETED LIST";
    if (statusParam === "Overdue") return "CUSTOMER OVERDUE TREATMENTS LIST";
    if (statusParam === "Paused") return "CUSTOMER TREATMENT PAUSED LISTS";
    return "Scheduled Application Dashboard";
  };

  const fetchCustomer = async () => {
    if (!customerId) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        setCustomer(null);
        setLoading(false);
        return;
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
        { headers: { token } }
      );
      if (response.data.success && response.data.data) {
        const built = buildCustomerWithTreatments(response.data.data);
        setCustomer(built);
      } else {
        setCustomer(null);
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      toast.error("Failed to load customer");
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  // Debounce search term so it behaves like CHEMICALS / MANAGE CUSTOMERS
  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedTerm(term);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(delay);
  }, [term]);

  // When status changes (Completed / Overdue / Paused), reset paging & sort
  useEffect(() => {
    setCurrentPage(1);
    setSortBy("");
    setSortOrder("asc");
  }, [statusParam]);

  // Update one treatment's status in backend (Complete / Pause / Overdue / etc.)
  // Optional: newDate for rescheduling (ISO date string like "2026-02-15")
  const updateTreatmentStatus = async (item, newStatus, newDate = null) => {
    if (!item?._id) return false;
    const parts = item._id.split("-");
    if (parts.length < 3) return false;
    const index = parseInt(parts[parts.length - 1], 10);
    const type = parts[parts.length - 2]; // "annual" or "other"
    const treatmentCustomerId = parts.slice(0, -2).join("-");
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return false;
      }
      const getRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        { headers: { token } }
      );
      if (!getRes.data.success || !getRes.data.data) {
        toast.error("Customer not found");
        return false;
      }
      const customer = getRes.data.data;
      const payload = {
        customerName: customer.customerName,
        customerEmail: customer.customerEmail || "",
        customerPhone: customer.customerPhone || "",
        jobAddress: customer.jobAddress,
        isChemicalMaintenanceEnabled: !!customer.isChemicalMaintenanceEnabled,
        annualTreatments: (customer.annualTreatments || []).map((t, i) => {
          if (type === "annual" && i === index) {
            const updated = { ...t, status: newStatus };
            if (newDate) updated.scheduleDate = newDate;
            return updated;
          }
          return t;
        }),
        otherTreatments: (customer.otherTreatments || []).map((t, i) => {
          if (type === "other" && i === index) {
            const updated = { ...t, status: newStatus };
            if (newDate) updated.date = newDate;
            return updated;
          }
          return t;
        }),
      };
      const putRes = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        payload,
        { headers: { token, "Content-Type": "application/json" } }
      );
      if (!putRes.data.success) {
        toast.error(putRes.data.message || "Update failed");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Update treatment status error:", err);
      toast.error(err.response?.data?.message || "Failed to update treatment");
      return false;
    }
  };

  // "Soft delete" as requested:
  // - quantity/qty => 0
  // - scheduleDate/date => null
  // - status => "Scheduled"
  // - price/cost => 0
  const resetTreatmentOnDelete = async (item) => {
    if (!item?._id) return false;
    const parts = item._id.split("-");
    if (parts.length < 3) return false;
    const index = parseInt(parts[parts.length - 1], 10);
    const type = parts[parts.length - 2]; // "annual" or "other"
    const treatmentCustomerId = parts.slice(0, -2).join("-");
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return false;
      }

      const getRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        { headers: { token } }
      );
      if (!getRes.data.success || !getRes.data.data) {
        toast.error("Customer not found");
        return false;
      }
      const customer = getRes.data.data;

      const payload = {
        customerName: customer.customerName,
        customerEmail: customer.customerEmail || "",
        customerPhone: customer.customerPhone || "",
        jobAddress: customer.jobAddress,
        isChemicalMaintenanceEnabled: !!customer.isChemicalMaintenanceEnabled,
        annualTreatments: (customer.annualTreatments || []).map((t, i) => {
          if (type === "annual" && i === index) {
            return {
              ...t,
              quantity: 0,
              scheduleDate: null,
              status: "Scheduled",
              price: 0,
              cost: 0,
            };
          }
          return t;
        }),
        otherTreatments: (customer.otherTreatments || []).map((t, i) => {
          if (type === "other" && i === index) {
            return {
              ...t,
              qty: 0,
              date: null,
              status: "Scheduled",
              totalPricePerTank: 0,
              totalCostPerTank: 0,
            };
          }
          return t;
        }),
      };

      const putRes = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        payload,
        { headers: { token, "Content-Type": "application/json" } }
      );
      if (!putRes.data.success) {
        toast.error(putRes.data.message || "Delete failed");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Reset treatment on delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete treatment");
      return false;
    }
  };

  // Update treatment: scheduled date, quantity, and price
  const updateTreatment = async (item, updatedData) => {
    if (!item?._id) return false;
    const parts = item._id.split("-");
    if (parts.length < 3) return false;
    const index = parseInt(parts[parts.length - 1], 10);
    const type = parts[parts.length - 2]; // "annual" or "other"
    const treatmentCustomerId = parts.slice(0, -2).join("-");
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return false;
      }

      const getRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        { headers: { token } }
      );
      if (!getRes.data.success || !getRes.data.data) {
        toast.error("Customer not found");
        return false;
      }
      const customer = getRes.data.data;

      // Convert date string (YYYY-MM-DD) to ISO date string for backend
      const newDateISO = updatedData.scheduledDate ? new Date(updatedData.scheduledDate).toISOString() : null;
      const newQuantity = parseFloat(updatedData.quantity) || 0;
      const newPrice = parseFloat(updatedData.price) || 0;
      const newProjectCode = updatedData.projectCode !== undefined && updatedData.projectCode !== null ? String(updatedData.projectCode).trim() : undefined;

      const payload = {
        customerName: customer.customerName,
        customerEmail: customer.customerEmail || "",
        customerPhone: customer.customerPhone || "",
        jobAddress: customer.jobAddress,
        isChemicalMaintenanceEnabled: !!customer.isChemicalMaintenanceEnabled,
        annualTreatments: (customer.annualTreatments || []).map((t, i) => {
          if (type === "annual" && i === index) {
            const updated = { ...t };
            if (newDateISO) updated.scheduleDate = newDateISO;
            updated.quantity = newQuantity;
            updated.price = newPrice;
            if (newProjectCode !== undefined) updated.projectCode = newProjectCode;
            // Recalculate cost if unitCost exists
            if (t.unitCost && newQuantity > 0) {
              updated.cost = t.unitCost * newQuantity;
            }
            return updated;
          }
          return t;
        }),
        otherTreatments: (customer.otherTreatments || []).map((t, i) => {
          if (type === "other" && i === index) {
            const updated = { ...t };
            if (newDateISO) updated.date = newDateISO;
            updated.qty = newQuantity;
            updated.totalPricePerTank = newPrice;
            if (newProjectCode !== undefined) updated.projectCode = newProjectCode;
            // Recalculate cost if unitCost exists
            if (t.unitCost && newQuantity > 0) {
              updated.totalCostPerTank = t.unitCost * newQuantity;
            }
            return updated;
          }
          return t;
        }),
      };

      const putRes = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${treatmentCustomerId}`,
        payload,
        { headers: { token, "Content-Type": "application/json" } }
      );
      if (!putRes.data.success) {
        toast.error(putRes.data.message || "Update failed");
        return false;
      }
      return true;
    } catch (err) {
      console.error("Update treatment error:", err);
      toast.error(err.response?.data?.message || "Failed to update treatment");
      return false;
    }
  };

  // ===== FILTER + SORT + PAGINATE TREATMENTS (frontend) =====
  const allTreatments = customer
    ? customer.treatments.filter((t) => t.status === statusParam)
    : [];

  // Search by treatment name, date, project code, quantity, price
  let filteredTreatments = [...allTreatments];
  if (debouncedTerm) {
    const t = debouncedTerm.toLowerCase();
    filteredTreatments = filteredTreatments.filter((item) => {
      const treatmentName = (item.treatment || "").toLowerCase();
      const dateText = (item.scheduledDate || "").toLowerCase();
      const project = (item.projectCode || "").toLowerCase();
      const qty = String(item.quantity ?? "");
      const price = String(item.price ?? "");
      return (
        treatmentName.includes(t) ||
        dateText.includes(t) ||
        project.includes(t) ||
        qty.includes(debouncedTerm) ||
        price.includes(debouncedTerm)
      );
    });
  }

  // Sorting similar to CHEMICALS
  if (sortBy) {
    filteredTreatments.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // For dates, sort using raw ISO date when available
      if (sortBy === "scheduledDate") {
        aValue = a.scheduledDateRaw || a.scheduledDate;
        bValue = b.scheduledDateRaw || b.scheduledDate;
      }

      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === "string") aValue = aValue.toLowerCase();
      if (typeof bValue === "string") bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }

  const totalRecords = filteredTreatments.length;
  const totalPages =
    totalRecords === 0 ? 1 : Math.ceil(totalRecords / perPageRecords);
  const startIndex = (currentPage - 1) * perPageRecords;
  const paginatedTreatments = filteredTreatments.slice(
    startIndex,
    startIndex + perPageRecords,
  );

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };
  // const renderActions = (status, t) => {
  //   return (
  //     <div className="flex justify-center gap-4">
  //       {/* Complete */}
  //       {status === "Overdue" && (
  //         <button
  //           // className="w-8 h-8 flex items-center justify-center rounded-full border border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
  //           title="Complete"
  //         >
  //           <i className="fa fa-check"></i>
  //         </button>
  //       )}

  //       {/* Resume (Play) */}
  //       {status === "Paused" && (
  //         <button
  //           // className="w-8 h-8 flex items-center justify-center rounded-full border border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
  //           title="Resume"
  //         >
  //           <i className="fa fa-play"></i>
  //         </button>
  //       )}

  //       {/* Pause */}
  //       {status === "Overdue" && (
  //         <button
  //           // className="w-8 h-8 flex items-center justify-center rounded-full border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white"
  //           title="Pause"
  //         >
  //           <i className="fa fa-pause"></i>
  //         </button>
  //       )}

  //       {/* Edit */}
  //       {(status === "Paused" ||
  //         status === "Completed" ||
  //         status === "Overdue") && (
  //         <button
  //           // className="w-8 h-8 flex items-center justify-center rounded-full border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
  //           title="Edit"
  //         >
  //           <i className="fa fa-pencil"></i>
  //         </button>
  //       )}

  //       {/* Delete */}
  //       {(status === "Paused" || status === "Overdue") && (
  //         <button
  //           // className="w-8 h-8 flex items-center justify-center rounded-full border border-red-600 text-red-600 hover:bg-red-600 hover:text-white"
  //           title="Delete"
  //         >
  //           <i className="fa fa-trash"></i>
  //         </button>
  //       )}

  //       {/* View */}
  //       {(status === "Paused" ||
  //         status === "Completed" ||
  //         status === "Overdue") && (
  //         <button
  //           // className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-700 text-gray-700 hover:bg-gray-700 hover:text-white"
  //           title="View"
  //         >
  //           <i className="fa fa-eye"></i>
  //         </button>
  //       )}
  //     </div>
  //   );
  // };
  const renderActions = (status, t) => {
    const stop = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };
    return (
      <div className="flex justify-center gap-4" onClick={(e) => e.stopPropagation()}>
        {/* SCHEDULED: Mark Complete, Pause, Edit, Delete, View */}
        {status === "Scheduled" && (
          <>
            <button
              type="button"
              title="Mark Complete"
              onClick={(e) => {
                stop(e);
                setSelectedItem(t);
                setCompleteOpen(true);
              }}
            >
              <i className="fa fa-check text-lg"></i>
            </button>

            <button
              type="button"
              title="Pause Treatment"
              onClick={(e) => {
                stop(e);
                setSelectedItem(t);
                setPauseOpen(true);
              }}
            >
              <i className="fa fa-pause"></i>
            </button>

            <button
              type="button"
              title="Edit"
              onClick={(e) => {
                stop(e);
                setEditData(t);
                setEditModalOpen(true);
              }}
            >
              <i className="fa fa-edit"></i>
            </button>

            <button
              type="button"
              title="Delete"
              onClick={(e) => {
                stop(e);
                setDeleteData(t);
                setDeleteModalOpen(true);
              }}
            >
              <i className="fa fa-trash"></i>
            </button>

            <button
              type="button"
              title="View"
              onClick={(e) => {
                stop(e);
                setViewData(t);
                setViewOpen(true);
              }}
            >
              <i className="fa fa-eye"></i>
            </button>
          </>
        )}

        {/* COMPLETED: View and Edit */}
        {status === "Completed" && (
          <>
            <button
              type="button"
              title="View"
              onClick={(e) => {
                stop(e);
                setViewData(t);
                setViewOpen(true);
              }}
            >
              <i className="fa fa-eye"></i>
            </button>
            <button
              type="button"
              title="Edit"
              onClick={(e) => {
                stop(e);
                setEditData(t);
                setEditModalOpen(true);
              }}
            >
              <i className="fa fa-edit"></i>
            </button>
          </>
        )}

        {/* OVERDUE: Resume (with new date), Edit, Delete, View - NO PAUSE */}
        {status === "Overdue" && (
          <>
            <button
              type="button"
              title="Resume with New Date"
              onClick={(e) => {
                stop(e);
                setSelectedItem(t);
                setResumeOpen(true);
              }}
            >
              <i className="fa fa-play"></i>
            </button>

            <button
              type="button"
              title="Edit"
              onClick={(e) => {
                stop(e);
                setEditData(t);
                setEditModalOpen(true);
              }}
            >
              <i className="fa fa-edit"></i>
            </button>

            <button
              type="button"
              title="Delete"
              onClick={(e) => {
                stop(e);
                setDeleteData(t);
                setDeleteModalOpen(true);
              }}
            >
              <i className="fa fa-trash"></i>
            </button>

            <button
              type="button"
              title="View"
              onClick={(e) => {
                stop(e);
                setViewData(t);
                setViewOpen(true);
              }}
            >
              <i className="fa fa-eye"></i>
            </button>
          </>
        )}

        {/* PAUSED: Resume, Edit, Delete, View */}
        {status === "Paused" && (
          <>
            <button
              type="button"
              title="Resume"
              onClick={(e) => {
                stop(e);
                setSelectedItem(t);
                setResumeOpen(true);
              }}
            >
              <i className="fa fa-play"></i>
            </button>

            <button
              type="button"
              title="Edit"
              onClick={(e) => {
                stop(e);
                setEditData(t);
                setEditModalOpen(true);
              }}
            >
              <i className="fa fa-edit"></i>
            </button>

            <button
              type="button"
              title="Delete"
              onClick={(e) => {
                stop(e);
                setDeleteData(t);
                setDeleteModalOpen(true);
              }}
            >
              <i className="fa fa-trash"></i>
            </button>

            <button
              type="button"
              title="View"
              onClick={(e) => {
                stop(e);
                setViewData(t);
                setViewOpen(true);
              }}
            >
              <i className="fa fa-eye"></i>
            </button>
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
        <p className="p-4 text-center">Loading...</p>
      </div>
    );
  }
  if (!customer) {
    return (
      <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
        <p className="p-4 text-center">No Customer Found</p>
      </div>
    );
  }

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        {/* <h2 className="text-lg font-bold mb-3">
          {customer.customerName} — {statusParam} Treatments
        </h2> */}
        <div className="px-4 py-3 flex justify-between items-end border-b">
          {/* <h3 className="card-title">Bid Projects</h3> */}
          <h3 className="text-lg font-bold text-center">
            {" "}
            {customer.customerName} — {statusParam} Treatments
          </h3>
          {/* <h2 className="text-lg font-bold mb-3">
            {customer.customerName} — {statusParam} Treatments
          </h2> */}
          {/* <div className="text-end">
            <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div> */}
          <div className="flex justify-end flex-wrap gap-2 w-auto">
            <select
              name="perPage"
              id=""
              value={perPageRecords}
              onChange={(e) => {
                setPerPageRecords(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-[60px] border p-1 relative top-1 mr-2 outline-none cursor-pointer h-[34px]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>
            <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1 relative top-1 mr-4 lg:mb-1 mb-0"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            {/* <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/office/project/add/1");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Create New Bid
            </button> */}
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate(
                  "/panel/office/chemical-maintenance/treatment?status=Completed",
                );
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              TREATMENT COMPLETED
            </button>

            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                // navigate("/panel/office/project/add/0");
                navigate(
                  "/panel/office/chemical-maintenance/treatment?status=Overdue",
                );
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              OVERDUE
            </button>
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                // navigate("/panel/office/project/add/0");
                navigate(
                  "/panel/office/chemical-maintenance/treatment?status=Paused",
                );
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              PAUSED
            </button>
            {statusParam === "Completed" && (
              <button
                className="btn bg-[#00613e] text-white text-sm relative top-1 ml-2"
                onClick={() => {
                  //  navigate(
                  //   "/panel/office/chemical-maintenance/treatment/:customerId/customerSummary"
                  //  )
                  {
                    navigate(
                      `/panel/office/chemical-maintenance/treatment/${customerId}/customerSummary`,
                      { state: { customer } },
                    );
                  }
                }}
              >
                <i className="fa fa-file-alt mr-2"></i>
                Customer Summary
              </button>
            )}
          </div>
        </div>

        <div className="card-body overflow-x-auto">
          <table className="table table-bordered w-full text-center">
            <thead>
              <tr>
                <th onClick={() => handleSort("serialNo")}>
                  S. No.
                </th>
                <th onClick={() => handleSort("treatment")}>
                  Treatment{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "treatment"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("scheduledDate")}>
                  Scheduled Date{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "scheduledDate"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("price")}>
                  PRICE (PRE-TAX) [USD - $]{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "price"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("projectCode")}>
                  Project Code{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "projectCode"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("quantity")}>
                  Quantity{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "quantity"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("status")}>
                  Status{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "status"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedTreatments.length ? (
                paginatedTreatments.map((t, i) => (
                  <tr key={t._id || i}>
                    <td>{startIndex + i + 1}</td>
                    <td>{t.treatment}</td>
                    <td>{t.scheduledDate}</td>
                    <td>{t.price}</td>
                    <td>{t.projectCode}</td>
                    <td>{t.quantity}</td>
                    <td>{t.status}</td>
                    <td>{renderActions(t.status, t)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">No Treatments Found</td>
                </tr>
              )}
            </tbody>
          </table>
          {/* Pagination + info, same style as other tables */}
          <div className="flex lg:flex-row flex-col lg:items-end items-center justify-between px-1 mt-6">
            <div>
              <p>
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
            <div className="flex justify-end mt-2">
              <button
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={() => {
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  className={`border-x px-[10px] py-1 ${
                    currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                  }`}
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={() => {
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <EditCustomer
        show={editModalOpen}
        data={editData}
        onClose={() => {
          setEditModalOpen(false);
          setEditData(null);
        }}
        onSuccess={async (updatedData) => {
          if (updatedData && editData) {
            const ok = await updateTreatment(editData, updatedData);
            if (ok) {
              toast.success("Treatment updated successfully");
              fetchCustomer();
            }
          } else {
            toast.success("Treatment updated successfully");
            fetchCustomer();
          }
        }}
      />
      <DeleteCustomer
        show={deleteModalOpen}
        data={deleteData}
        isLoading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteModalOpen(false);
            setDeleteData(null);
          }
        }}
        onConfirm={async (item) => {
          if (deleteLoading) return;
          setDeleteLoading(true);
          try {
            const ok = await resetTreatmentOnDelete(item);
            if (ok) {
              toast.success("Treatment deleted successfully");
              setDeleteModalOpen(false);
              setDeleteData(null);
              fetchCustomer();
            }
          } finally {
            setDeleteLoading(false);
          }
        }}
      />
      <ViewTreatmentDetails
        show={viewOpen}
        data={viewData}
        customer={customer}
        onClose={() => setViewOpen(false)}
      />
      <ResumeTreatment
        show={resumeOpen}
        data={selectedItem}
        isLoading={resumeLoading}
        onClose={() => {
          if (!resumeLoading) setResumeOpen(false);
        }}
        onConfirm={async (newDate) => {
          if (resumeLoading) return;
          setResumeLoading(true);
          try {
            const ok = await updateTreatmentStatus(selectedItem, "Scheduled", newDate || null);
            if (ok) {
              toast.success("Treatment resumed successfully");
              setResumeOpen(false);
              fetchCustomer();
            }
          } finally {
            setResumeLoading(false);
          }
        }}
      />

      <CompleteTreatment
        show={completeOpen}
        data={selectedItem}
        isLoading={completeLoading}
        onClose={() => {
          if (!completeLoading) {
            setCompleteOpen(false);
          }
        }}
        onConfirm={async () => {
          if (completeLoading) return;
          setCompleteLoading(true);
          try {
            const ok = await updateTreatmentStatus(selectedItem, "Completed");
            if (ok) {
              toast.success("Treatment marked as completed");
              setCompleteOpen(false);
              fetchCustomer();
            }
          } finally {
            setCompleteLoading(false);
          }
        }}
      />
      <PauseTreatment
        show={pauseOpen}
        data={selectedItem}
        isLoading={pauseLoading}
        onClose={() => {
          if (!pauseLoading) setPauseOpen(false);
        }}
        onConfirm={async () => {
          if (pauseLoading) return;
          setPauseLoading(true);
          try {
            const ok = await updateTreatmentStatus(selectedItem, "Paused");
            if (ok) {
              toast.success("Treatment paused successfully");
              setPauseOpen(false);
              fetchCustomer();
            }
          } finally {
            setPauseLoading(false);
          }
        }}
      />
    </div>
  );
}
