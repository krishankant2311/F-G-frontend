import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import parse from "html-react-parser";
import EditCustomer from "./components/Dashboard/EditCustomer";
import DeleteCustomer from "./components/Dashboard/DeleteCustomer";
import ViewTreatmentDetails from "./components/Dashboard/ViewCustomer";
import ResumeTreatment from "./components/Dashboard/ResumeTreatment";
import CompleteTreatment from "./components/Dashboard/CompleteTreatment";
import PauseTreatment from "./components/Dashboard/PauseTreatment";

// Format date for display (e.g. "12 Jan 2026")
const formatDisplayDate = (dateVal) => {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const isPastDate = (dateVal) => {
  if (!dateVal) return false;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return false;
  // compare by date only (ignore time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
};

const computeStatus = (status, dateVal) => {
  const s = (status || "Scheduled").trim();
  if (s === "Scheduled" && isPastDate(dateVal)) return "Overdue";
  return s;
};

// Days difference between scheduled date and today (date-only).
// 0 = today, 1 = tomorrow, -1 = yesterday.
const dayDiffFromToday = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = a.getTime() - today.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};

// Parse encoded dashboard row id into customerId/type/index/dateIndex
// Formats:
// - annual: `${customerId}-annual-${index}-${dateIndex}`
// - other:  `${customerId}-other-${index}`
const parseTreatmentRowId = (rawId) => {
  const id = String(rawId || "");
  // customerId contains "-" so we match from the end
  const m = id.match(/^(.*)-(annual|other)-(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  return {
    customerId: m[1],
    type: m[2], // "annual" | "other"
    index: Number(m[3]),
    dateIndex: m[4] != null ? Number(m[4]) : null,
  };
};

// Build flat treatment rows from MANAGE CUSTOMERS API data (annualTreatments + otherTreatments).
// Only include treatments that are "taken" / scheduled: must have date set and quantity > 0.
const buildTreatmentRowsFromCustomers = (customers) => {
  if (!Array.isArray(customers)) return [];
  const rows = [];
  customers.forEach((customer) => {
    const customerName = customer.customerName || "-";
    const customerId = customer._id;

    (customer.annualTreatments || []).forEach((t, index) => {
      const hasQty = (t.quantity ?? 0) > 0;
      if (!hasQty) return; // jo treatment liya he nhi hai vo yha nahi aana chahiye

      const ds =
        Array.isArray(t.scheduleDates) && t.scheduleDates.length > 0
          ? t.scheduleDates
          : t.scheduleDate
            ? [t.scheduleDate]
            : [];
      const validDates = ds
        .filter(Boolean)
        .map((d) => new Date(d))
        .filter((d) => !isNaN(d.getTime()))
        .map((d) => d.toISOString());
      if (validDates.length === 0) return;

      validDates.forEach((dateISO, dateIndex) => {
        rows.push({
          _id: `${customerId}-annual-${index}-${dateIndex}`,
          customerId,
          customerName,
          scheduledDate: formatDisplayDate(dateISO),
          scheduledDateRaw: dateISO,
          treatment: t.name || "-",
          quantity: t.quantity ?? "-",
          status: computeStatus(t.status, dateISO),
          price: t.price != null ? String(t.price) : "-",
          projectCode: t.projectCode ?? "",
        });
      });
    });

    (customer.otherTreatments || []).forEach((t, index) => {
      const hasDate = t.date != null && !isNaN(new Date(t.date).getTime());
      const hasQty = (t.qty ?? 0) > 0;
      if (!hasDate || !hasQty) return;

      rows.push({
        _id: `${customerId}-other-${index}`,
        customerId,
        customerName,
        scheduledDate: formatDisplayDate(t.date),
        scheduledDateRaw: t.date,
        treatment: t.treatment || "-",
        quantity: t.qty ?? "-",
        status: computeStatus(t.status, t.date),
        price: t.totalPricePerTank != null ? String(t.totalPricePerTank) : "-",
        projectCode: t.projectCode ?? "",
      });
    });
  });
  return rows;
};

export default function ChemicalDashboardTable() {
  const { pageNo } = useParams();
  const [data, setData] = useState([]);
  const [allTreatmentRows, setAllTreatmentRows] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(pageNo || 1);
  const [totalRecords, settotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const navigate = useNavigate("");
  const [loading, setLoading] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [deletedId, setDeletedId] = useState("");
  const [perPageRecords, setPerPageRecords] = useState(10);
  /** all = current dashboard (next 14 days + overdue); upcoming = today onward; past = before today; completed / paused = by status */
  const [scheduleFilter, setScheduleFilter] = useState("all");
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

  const { tableSize } = useTableContext();

  useEffect(() => {
    if (pageNo) {
      setCurrentPage(Number(pageNo));
    }
  }, []);

  useEffect(() => {
    if (pageNo) {
      setCurrentPage(Number(pageNo));
    }
  }, [pageNo]);

  // Same API as MANAGE CUSTOMERS – fetch customers and use in dashboard
  const getAllProjects = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers`,
        {
          headers: { token },
          params: {
            // Mirror MANAGE CUSTOMERS params so backend can also sort/search
            search: debouncedTerm || "",
            sortby: sortBy || "customerName",
            sortorder: sortOrder === "asc" ? 1 : -1,
          },
        }
      );

      if (response.data.success && response.data.data) {
        const customers = response.data.data;
        const flattened = buildTreatmentRowsFromCustomers(customers);
        setAllTreatmentRows(flattened);
      } else {
        setAllTreatmentRows([]);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load treatment data");
      setAllTreatmentRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllProjects();
  }, [sortBy, sortOrder, debouncedTerm]);

  // Debounce search term like CHEMICALS / MANAGE CUSTOMERS
  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedTerm(term);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(delay);
  }, [term]);

  // Update one treatment's status in backend (Complete / Pause / Overdue / etc.)
  // Optional: newDate for rescheduling (ISO date string like "2026-02-15")
  const updateTreatmentStatus = async (item, newStatus, newDate = null) => {
    const parsed = parseTreatmentRowId(item?._id);
    if (!parsed) return false;
    const { customerId, type, index, dateIndex } = parsed;
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return false;
      }
      const getRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
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
            if (newDate) {
              if (
                Array.isArray(t.scheduleDates) &&
                t.scheduleDates.length > 0 &&
                dateIndex != null &&
                dateIndex >= 0 &&
                dateIndex < t.scheduleDates.length
              ) {
                const nextDates = [...t.scheduleDates];
                nextDates[dateIndex] = newDate;
                updated.scheduleDates = nextDates;
                updated.scheduleDate = nextDates[0] || null; // backward compat
              } else {
                updated.scheduleDate = newDate;
              }
            }
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
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
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

  // Update treatment: scheduled date, quantity, and price
  const updateTreatment = async (item, updatedData) => {
    const parsed = parseTreatmentRowId(item?._id);
    if (!parsed) return false;
    const { customerId, type, index, dateIndex } = parsed;
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return false;
      }

      const getRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
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
            if (newDateISO) {
              if (
                Array.isArray(t.scheduleDates) &&
                t.scheduleDates.length > 0 &&
                dateIndex != null &&
                dateIndex >= 0 &&
                dateIndex < t.scheduleDates.length
              ) {
                const nextDates = [...t.scheduleDates];
                nextDates[dateIndex] = newDateISO;
                updated.scheduleDates = nextDates;
                updated.scheduleDate = nextDates[0] || null; // backward compat
              } else {
                updated.scheduleDate = newDateISO;
              }
            }
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
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
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

  // "Soft delete" as requested:
  // - quantity/qty => 0
  // - scheduleDate/date => null
  // - status => "Scheduled"
  // - price/cost => 0
  const resetTreatmentOnDelete = async (item) => {
    const parsed = parseTreatmentRowId(item?._id);
    if (!parsed) return false;
    const { customerId, type, index, dateIndex } = parsed;
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return false;
      }

      const getRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
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
            const cleared = {
              ...t,
              quantity: 0,
              scheduleDate: null,
              status: "Scheduled",
              price: 0,
              cost: 0,
            };
            // Keep other dates if multi-date is used; clear only this row's date when possible
            if (
              Array.isArray(t.scheduleDates) &&
              t.scheduleDates.length > 0 &&
              dateIndex != null &&
              dateIndex >= 0 &&
              dateIndex < t.scheduleDates.length
            ) {
              const nextDates = [...t.scheduleDates];
              nextDates[dateIndex] = null;
              cleared.scheduleDates = nextDates.filter(Boolean);
              cleared.scheduleDate = cleared.scheduleDates[0] || null;
            }
            return cleared;
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
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
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

  // Filter, sort, and paginate from MANAGE CUSTOMERS data (no extra API)
  useEffect(() => {
    let filtered =
      debouncedTerm.trim() === ""
        ? [...allTreatmentRows]
        : allTreatmentRows.filter((row) => {
            const search = debouncedTerm.toLowerCase();
            const name = (row.customerName || "").toLowerCase();
            const treatment = (row.treatment || "").toLowerCase();
            const dateText = (row.scheduledDate || "").toLowerCase();
            const qty = String(row.quantity ?? "");
            const status = (row.status || "").toLowerCase();
            const code = (row.projectCode || "").toLowerCase();
            return (
              name.includes(search) ||
              treatment.includes(search) ||
              dateText.includes(search) ||
              qty.includes(debouncedTerm) ||
              status.includes(search) ||
              code.includes(search)
            );
          });

    // Dashboard rules:
    // - Show items scheduled within next 14 days (inclusive) OR overdue (past).
    // - Order: farthest upcoming (14 days out) down to today, then most-recent overdue.
    const withDiff = filtered.map((row) => ({
      ...row,
      __dayDiff: dayDiffFromToday(row.scheduledDateRaw),
    }));

    if (scheduleFilter === "all") {
      filtered = withDiff.filter(
        (row) => row.__dayDiff != null && row.__dayDiff <= 14,
      );
    } else if (scheduleFilter === "upcoming") {
      filtered = withDiff.filter(
        (row) => row.__dayDiff != null && row.__dayDiff >= 0,
      );
    } else if (scheduleFilter === "past") {
      filtered = withDiff.filter(
        (row) => row.__dayDiff != null && row.__dayDiff < 0,
      );
    } else if (scheduleFilter === "completed") {
      filtered = withDiff.filter(
        (row) => (row.status || "").trim().toLowerCase() === "completed",
      );
    } else if (scheduleFilter === "paused") {
      filtered = withDiff.filter(
        (row) => (row.status || "").trim().toLowerCase() === "paused",
      );
    }

    // Sorting (frontend) – like CHEMICALS / MANAGE CUSTOMERS
    if (sortBy === "scheduledDate") {
      // Force dashboard rule order regardless of asc/desc clicks
      filtered.sort((a, b) => {
        const ad = a.__dayDiff;
        const bd = b.__dayDiff;
        const aUpcoming = ad >= 0;
        const bUpcoming = bd >= 0;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1; // upcoming first
        // Descending dayDiff: 14..0, then -1..-N
        return bd - ad;
      });
    } else if (sortBy) {
      filtered.sort((a, b) => {
        let aValue = a[sortBy];
        let bValue = b[sortBy];

        // For scheduled date, use raw date when available
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
    } else {
      // Default dashboard order
      filtered.sort((a, b) => {
        const ad = a.__dayDiff;
        const bd = b.__dayDiff;
        const aUpcoming = ad >= 0;
        const bUpcoming = bd >= 0;
        if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        return bd - ad;
      });
    }

    const startIndex = (currentPage - 1) * perPageRecords;
    const endIndex = startIndex + perPageRecords;
    const paginated = filtered.slice(startIndex, endIndex);
    const updated = paginated.map((item, index) => ({
      ...item,
      serialNo: startIndex + index + 1,
    }));

    setData(updated);
    settotalRecords(filtered.length);
    setTotalPages(Math.ceil(filtered.length / perPageRecords) || 1);
  }, [
    allTreatmentRows,
    debouncedTerm,
    currentPage,
    perPageRecords,
    sortBy,
    sortOrder,
    scheduleFilter,
  ]);

  const searchProjects = async () => {
    try {
      // if (term.length > 0) {
      //   navigate("/panel/office/bid-projects/1");
      // }
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const formdata = new FormData();
      formdata.append("term", term);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/search-bid-project?page=${currentPage}`,
        formdata,
        { headers: headers },
      );
      if (response.data.statusCode === 200) {
        if (response.data.result.projects.length === 0) {
          setData([]);
          setLoading(false);
          settotalRecords(0);
          return;
        }
        const updatedData = response.data.result.projects.map((item, index) => {
          return {
            ...item,
            serialNo: (currentPage - 1) * 10 + index + 1,
          };
        });
        setData(updatedData);
        setTotalPages(response.data.result.totalPages);
        settotalRecords(response.data.result.totalRecords);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
    setLoading(false);
  };

  // const moveToEditForm = (id) => {
  //   navigate(`/panel/office/chemical-maintenance/dashboard/:customerId`, {
  //     state: { data: pageNo },
  //   });
  // };
  const moveToEditForm = (item) => {
    setEditData(item);
    setEditModalOpen(true);
  };

  const viewProject = (id) => {
    navigate(`/panel/office/project/view-bid/${id}/1`, {
      state: { data: pageNo },
    });
  };

  // useEffect(() => {
  //   navigate(`/panel/office/bid-projects/1`);
  //   if (pageNo == 1) {
  //     getAllProjects();
  //   }
  // }, [sortBy, sortOrder, term, perPageRecords]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
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

  const handleStatus = async (e, id, status) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("status", status);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
        formdata,
        {
          headers: headers,
        },
      );

      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        if (data.length === 1 && status == "Delete") {
          if (currentPage === 1) {
            getAllProjects();
          } else {
            const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
            navigate(`/panel/office/bid-projects/${page}`);
          }
        } else {
          getAllProjects();
        }
        // getAllProjects();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          {/* <h3 className="card-title">Bid Projects</h3> */}
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">Scheduled Application Dashboard</h3>
          </div>
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
            <select
              aria-label="Filter by schedule or status"
              value={scheduleFilter}
              onChange={(e) => {
                setScheduleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="min-w-[180px] border p-1 relative top-1 mr-2 outline-none cursor-pointer h-[34px] text-sm"
            >
              <option value="all">All (default)</option>
              <option value="upcoming">Schedule dates</option>
              <option value="past">Past dates</option>
              <option value="completed">Complete treatment</option>
              <option value="paused">Paused treatment</option>
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
                navigate(
                  "/panel/office/chemical-maintenance/treatment?status=Paused",
                );
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              PAUSED
            </button>
          </div>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th onClick={() => handleSort("serialNo")}>
                  S. No.{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "serialNo"
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

                <th onClick={() => handleSort("customerName")}>
                  Customer Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("scheduledDate")}>
                  Scheduled Dates{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "scheduledDate"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
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

                {/* <th onClick={() => handleSort("description")}>
                  Description{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "description"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}
                {/* <th onClick={() => handleSort("jobName")}>
                  Job Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "jobName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}
                {/* <th onClick={() => handleSort("billingType")}>
                  Billing Type{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "billingType"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading ? (
                data.length > 0 ? (
                  data.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{item.serialNo}</td>
                        <td>{item.projectCode ? item.projectCode : "-"}</td>
                        <td>{item.customerName}</td>
                        {/* <td>{item.customerEmail}</td> */}
                        {/* <td className="flex justify-center text-center">
                          <div
                            className="text-center"
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              // textOverflow: "ellipsis",
                              maxWidth: "140px",
                            }}
                          >
                            <span>{parse(item.description)}</span>
                          </div>
                          <span>...</span>
                        </td> */}
                        {/* <td className="">{item.jobName ? item.jobName : "-"}</td> */}
                        <td className="">
                          {item.scheduledDate ? item.scheduledDate : "-"}
                        </td>
                        <td>{item.treatment}</td>
                        <td>{item.quantity ?? "-"}</td>
                        <td>
                          {item.status === "Active"
                            ? "Not Started"
                            : item.status}
                        </td>
                        {/* <td className="flex justify-center gap-4">
                          <button
                            onClick={() => {
                              moveToEditForm(item._id);
                            }}
                            title="Edit Project"
                          >
                            <i className="fa fa-edit"></i>
                          </button>
                          {item.status === "Active" ||
                          item.status === "Ongoing" ||
                          item.status === "Completed" ? (
                            <button
                              type="button"
                              className=""
                              data-toggle="modal"
                              data-target="#exampleModalCenter"
                              onClick={() => {
                                setDeletedId(item._id);
                              }}
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                handleStatus(e, item._id, "Active");
                              }}
                              disabled={disableBtn}
                              title="Change Status to Active"
                            >
                              <i className="fa fa-refresh"></i>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              viewProject(item._id);
                            }}
                            title="View Project"
                          >
                            <i className="fa fa-eye text-sm"></i>
                          </button>
                        </td> */}
                        <td className="flex justify-center gap-4" onClick={(e) => e.stopPropagation()}>
                          {/* SCHEDULED: Mark Complete, Pause, Edit, Delete, View */}
                          {item.status === "Scheduled" && (
                            <>
                              <button
                                type="button"
                                title="Mark Complete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSelectedItem(item);
                                  setCompleteOpen(true);
                                }}
                              >
                                <i className="fa fa-check text-lg "></i>
                              </button>

                              <button
                                type="button"
                                title="Pause Treatment"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSelectedItem(item);
                                  setPauseOpen(true);
                                }}
                              >
                                <i className="fa fa-pause"></i>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  moveToEditForm(item);
                                }}
                                title="Edit"
                              >
                                <i className="fa fa-edit"></i>
                              </button>

                              <button
                                type="button"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setDeleteData(item);
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <i className="fa fa-trash"></i>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setViewData(item);
                                  setViewOpen(true);
                                }}
                                title="View"
                              >
                                <i className="fa fa-eye"></i>
                              </button>
                            </>
                          )}

                          {/* COMPLETED: Only View */}
                          {item.status === "Completed" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setViewData(item);
                                setViewOpen(true);
                              }}
                              title="View"
                            >
                              <i className="fa fa-eye"></i>
                            </button>
                          )}

                          {/* OVERDUE: Resume (with new date), Edit, Delete, View - NO PAUSE */}
                          {item.status === "Overdue" && (
                            <>
                              <button
                                type="button"
                                title="Resume with New Date"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSelectedItem(item);
                                  setResumeOpen(true);
                                }}
                              >
                                <i className="fa fa-play "></i>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  moveToEditForm(item);
                                }}
                                title="Edit"
                              >
                                <i className="fa fa-edit"></i>
                              </button>

                              <button
                                type="button"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setDeleteData(item);
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <i className="fa fa-trash"></i>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setViewData(item);
                                  setViewOpen(true);
                                }}
                                title="View"
                              >
                                <i className="fa fa-eye"></i>
                              </button>
                            </>
                          )}

                          {/* PAUSED: Resume, Edit, Delete, View */}
                          {item.status === "Paused" && (
                            <>
                              <button
                                type="button"
                                title="Resume"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setSelectedItem(item);
                                  setResumeOpen(true);
                                }}
                              >
                                <i className="fa fa-play"></i>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  moveToEditForm(item);
                                }}
                                title="Edit"
                              >
                                <i className="fa fa-edit"></i>
                              </button>

                              <button
                                type="button"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setDeleteData(item);
                                  setDeleteModalOpen(true);
                                }}
                              >
                                <i className="fa fa-trash"></i>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setViewData(item);
                                  setViewOpen(true);
                                }}
                                title="View"
                              >
                                <i className="fa fa-eye"></i>
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="text-center" colSpan="8">
                      No Data Available
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="text-center" colSpan="8">
                    Loading ...
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>S. No.</th>
                <th>Project Code</th>
                <th>Customer Name</th>
                <th>Scheduled Dates </th>
                <th>Treatment</th>
                <th>Quantiy</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </tfoot>
          </table>
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
                onClick={previousPage}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => {
                return (
                  <button
                    className={`border-x px-[10px] py-1 ${
                      currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                    }`}
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                );
              })}
              <button
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={nextPage}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal fade"
        id="exampleModalCenter"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exampleModalCenterTitle"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLongTitle">
                Delete Project
              </h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="modal-body">Are you sure ?</div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Close
              </button>
              <button
                onClick={(e) => {
                  handleStatus(e, deletedId, "Delete");
                }}
                disabled={disableBtn}
                title="Change Status to Delete"
                type="button"
                className="btn btn-danger"
                data-dismiss="modal"
              >
                Delete
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
              getAllProjects();
            }
          } else {
            toast.success("Treatment updated successfully");
            getAllProjects();
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
              getAllProjects();
            }
          } finally {
            setDeleteLoading(false);
          }
        }}
      />
      <ViewTreatmentDetails
        show={viewOpen}
        data={viewData}
        customer={viewData ? { customerName: viewData.customerName } : undefined}
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
              getAllProjects();
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
              getAllProjects();
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
              getAllProjects();
            }
          } finally {
            setPauseLoading(false);
          }
        }}
      />
    </div>
  );
}
