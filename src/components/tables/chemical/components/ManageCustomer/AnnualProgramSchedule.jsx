
import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../../../context/TableContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ViewTreatmentDetails from "../Dashboard/ViewCustomer";
import EditCustomer from "../Dashboard/EditCustomer";

const CustomerAnnualProgramSchedule = () => {
  const { customerId: paramCustomerId } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { tableSize } = useTableContext();

  // When navigated without state (e.g. from Completed Treatments), fetch customer and build state
  const [fetchedState, setFetchedState] = useState(null);
  const [stateLoading, setStateLoading] = useState(false);
  useEffect(() => {
    if (locationState != null) {
      setFetchedState(null);
      return;
    }
    if (!paramCustomerId) return;
    setStateLoading(true);
    const token = localStorage.getItem("f&gstafftoken");
    if (!token) {
      setStateLoading(false);
      return;
    }
    axios
      .get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${paramCustomerId}`,
        { headers: { token } }
      )
      .then((res) => {
        if (res.data?.success && res.data?.data) {
          const d = res.data.data;
          setFetchedState({
            customerName: d.customerName || "",
            customerId: d._id,
            description: d.description || "",
            contractTotal: d.contractTotal ?? 0,
            isChemicalMaintenanceEnabled: !!d.isChemicalMaintenanceEnabled,
            treatments: [],
            annualTreatments: d.annualTreatments || [],
            otherTreatments: d.otherTreatments || [],
          });
        } else {
          setFetchedState(null);
        }
      })
      .catch(() => setFetchedState(null))
      .finally(() => setStateLoading(false));
  }, [paramCustomerId, locationState]);

  const state = locationState || fetchedState;

  // calendar popup states
  const [openIndex, setOpenIndex] = useState(null);
  const [dates, setDates] = useState({});
  const [rowQty, setRowQty] = useState({});
  const [projectCodes, setProjectCodes] = useState({});
  const [additionalAnnualRows, setAdditionalAnnualRows] = useState([]);

  // Key helpers: avoid collisions when annual rows expand by multiple dates.
  // Annual qty/projectCode are per-treatment (originalIndex), while date is per-row (originalIndex + dateIndex).
  const getQtyKey = (item) => {
    if (!item) return "";
    if (item.type === "annual") return `annual-${item.originalIndex}`;
    if (item.type === "other") return `other-${item.originalIndex}`;
    if (item.type === "other-new") return `other-new-${item.originalIndex}`;
    return "";
  };

  const getProjectCodeKey = (item) => getQtyKey(item);

  const getDateKey = (item) => {
    if (!item) return "";
    if (item.type === "annual") {
      return `annual-${item.originalIndex}-${item.dateIndex ?? "new"}`;
    }
    if (item.type === "other") return `other-${item.originalIndex}`;
    if (item.type === "other-new") return `other-new-${item.originalIndex}`;
    return "";
  };

  // OTHER TREATMENTS calendar popup state
  const [otherCalendarOpenIndex, setOtherCalendarOpenIndex] = useState(null);
  const [otherCalendarView, setOtherCalendarView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const otherCalendarRef = useRef(null);
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /** Quantity on this dashboard: whole numbers only (no decimals). */
  const normalizeQuantityInput = (val) => {
    if (val === "" || val == null) return "";
    const n = Number(val);
    if (!Number.isFinite(n)) return "";
    return String(Math.max(0, Math.floor(n)));
  };

  const wholeQuantity = (val) => {
    if (val === "" || val == null) return 0;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  };

  // Close OTHER TREATMENTS calendar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (otherCalendarOpenIndex !== null && otherCalendarRef.current && !otherCalendarRef.current.contains(e.target) && !e.target.closest("[data-other-calendar-trigger]")) {
        setOtherCalendarOpenIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [otherCalendarOpenIndex]);

  // chemical mixes for OTHER TREATMENTS dropdown
  const [chemicalMixes, setChemicalMixes] = useState([]);

  // other treatments form (newly added in this page)
  const [newOtherTreatments, setNewOtherTreatments] = useState([
    {
      treatment: "",
      quantity: "",
      scheduledDate: "",
      scheduledDates: [],
      mixData: null,
      treatmentName: "", // Custom name for "Other" option
      price: "", // For "Other" option
      cost: "", // For "Other" option
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState(null);
  const [pendingRemainingAmount, setPendingRemainingAmount] = useState(0);
  const SCHEDULE_DATE_PAST_TOAST_ID = "schedule-date-past";
  const SCHEDULE_ERROR_TOAST_ID = "annual-schedule-error";
  const SCHEDULE_SUCCESS_TOAST_ID = "annual-schedule-success";

  // Fetch chemical mixes
  useEffect(() => {
    fetchChemicalMixes();
  }, []);

  const fetchChemicalMixes = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) return;

      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/mixes`,
        {
          headers: { token },
        }
      );

      if (res.data.success && res.data.data) {
        setChemicalMixes(res.data.data);
      }
    } catch (error) {
      console.error("Failed to load chemical mixes:", error);
    }
  };

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Helper function to convert date to YYYY-MM-DD format
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    
    try {
      // If it's already in YYYY-MM-DD format, return as is
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      
      // Convert Date object or ISO string to YYYY-MM-DD
      const dateObj = dateValue instanceof Date 
        ? dateValue 
        : new Date(dateValue);
      
      if (!isNaN(dateObj.getTime())) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.error("Date conversion error:", e);
    }
    
    return "";
  };

  // Format date for display in View modal (e.g. "19 Feb 2026")
  const formatDisplayDate = (dateVal) => {
    if (!dateVal) return "-";
    try {
      const d = typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)
        ? new Date(dateVal + "T12:00:00")
        : new Date(dateVal);
      if (isNaN(d.getTime())) return "-";
      const day = d.getDate();
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch (e) {
      return "-";
    }
  };



  // Initialize dates, projectCodes, and rowQty from state data (only once on mount) - indices match main table (all annual then other)
  useEffect(() => {
    if (state && Object.keys(dates).length === 0) {
      const { annualTreatments = [], otherTreatments = [] } = state;
      
      const initialDates = {};
      const initialProjectCodes = {};
      const initialRowQty = {};

      // Annual: qty + projectCode keyed by treatment index; dates keyed by (treatment index + dateIndex)
      (annualTreatments || []).forEach((at, originalIndex) => {
        const qtyKey = `annual-${originalIndex}`;
        if (at.projectCode) initialProjectCodes[qtyKey] = at.projectCode;
        if (at.quantity !== undefined && at.quantity !== null && at.quantity !== "") {
          initialRowQty[qtyKey] = String(wholeQuantity(at.quantity));
        }

        const ds =
          Array.isArray(at.scheduleDates) && at.scheduleDates.length > 0
            ? at.scheduleDates
            : at.scheduleDate
              ? [at.scheduleDate]
              : [];
        if (!ds.length) return;
        ds.forEach((d, dateIndex) => {
          const formatted = formatDateForInput(d);
          if (formatted) initialDates[`annual-${originalIndex}-${dateIndex}`] = formatted;
        });
      });

      // Other: qty/projectCode/date keyed by other index
      (otherTreatments || [])
        .filter((ot) => ot.date)
        .forEach((ot, originalIndex) => {
          const key = `other-${originalIndex}`;
          const formattedDate = formatDateForInput(ot.date);
          if (formattedDate) initialDates[key] = formattedDate;
          if (ot.projectCode) initialProjectCodes[key] = ot.projectCode;
          const q = ot.qty ?? ot.quantity;
          if (q !== undefined && q !== null && q !== "") {
            initialRowQty[key] = String(wholeQuantity(q));
          }
        });
      
      if (Object.keys(initialDates).length > 0) setDates(initialDates);
      if (Object.keys(initialProjectCodes).length > 0) setProjectCodes(initialProjectCodes);
      if (Object.keys(initialRowQty).length > 0) setRowQty(initialRowQty);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]); // Run when state changes


 
  if (stateLoading) {
    return (
      <div className="p-6">
        <p>Loading...</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="p-6">
        <p className="text-red-600">No schedule data found.</p>
        <button onClick={() => navigate(-1)} className="mt-3 border px-4 py-1">
          Go Back
        </button>
      </div>
    );
  }

  const {
    customerName,
    customerId,
    description = "",
    contractTotal = 0,
    isChemicalMaintenanceEnabled = true,
    treatments = [],
    annualTreatments = [],
    otherTreatments = [],
  } = state;
  const contractTotalDisplay = Number(contractTotal) || 0;
  const maintenanceEnabledNormalized =
    isChemicalMaintenanceEnabled === true ||
    isChemicalMaintenanceEnabled === "true" ||
    isChemicalMaintenanceEnabled === "Yes" ||
    isChemicalMaintenanceEnabled === "yes" ||
    isChemicalMaintenanceEnabled === 1 ||
    isChemicalMaintenanceEnabled === "1";
  const laborPricePerTreatment = maintenanceEnabledNormalized ? 100 : 150;

  // Build schedule data from ALL annual treatments (with or without scheduleDate), so user can add date later for any
  // Calculate unit price: if quantity > 0, use price/quantity, else default to 100 (base unit price from AddCustomer)
  const annualScheduleData = (annualTreatments || []).flatMap((at, originalIndex) => {
    const qty = wholeQuantity(at.quantity || 0);
    const savedPrice = at.price || 0;
    const savedCost = at.cost || 0;
    // Unit price: if quantity exists, divide price by quantity; otherwise use default 100
    const unitPrice = qty > 0 ? (savedPrice / qty) : 100;
    const unitCost = qty > 0 ? (savedCost / qty) : 80;

    const ds = Array.isArray(at.scheduleDates) && at.scheduleDates.length > 0
      ? at.scheduleDates
      : (at.scheduleDate ? [at.scheduleDate] : []);

    // If no dates yet, still include a row so user can add a date
    if (!ds.length) {
      return [{
        treatment: at.name,
        quantity: qty,
        scheduledDate: null,
        price: savedPrice, // Will be recalculated when quantity changes
        cost: savedCost,
        unitPrice,
        unitCost,
        projectCode: at.projectCode || "",
        type: "annual",
        originalIndex,
        dateIndex: null,
      }];
    }

    return ds.map((d, dateIndex) => ({
      treatment: at.name,
      quantity: qty,
      scheduledDate: d,
      price: savedPrice,
      cost: savedCost,
      unitPrice,
      unitCost,
      projectCode: at.projectCode || "",
      type: "annual",
      originalIndex,
      dateIndex,
    }));
  });

  // Build schedule data from other treatments (from state - already saved)
  const otherScheduleDataFromState = (otherTreatments || [])
    .filter((ot) => ot.date)
    .map((ot, index) => {
      const qty = wholeQuantity(ot.qty ?? ot.quantity ?? 0);
      const costPerTank = Number(ot.totalCostPerTank || 0);
      const pricePerTank = Number(ot.totalPricePerTank || 0);
      
      return {
        treatment: ot.treatment || ot.mixName || "",
        quantity: qty,
        scheduledDate: ot.date,
        price: qty * pricePerTank,
        cost: qty * costPerTank,
        unitPrice: pricePerTank,
        projectCode: ot.projectCode || "",
        type: "other",
        originalIndex: index,
      };
    });

  // Build schedule data from OTHER TREATMENTS section (newly added in this page)
  const otherScheduleDataFromForm = newOtherTreatments
    .filter((ot) => {
      const ds = Array.isArray(ot.scheduledDates)
        ? ot.scheduledDates
        : (ot.scheduledDate ? [ot.scheduledDate] : []);
      return ot.treatment && ds.length > 0;
    })
    .flatMap((ot, index) => {
      const qty = wholeQuantity(ot.quantity || 0);
      const costPerTank = Number(ot.mixData?.totalCostPerTank || 0);
      const pricePerTank = Number(ot.mixData?.totalPricePerTank || 0);
      const ds = Array.isArray(ot.scheduledDates)
        ? ot.scheduledDates
        : (ot.scheduledDate ? [ot.scheduledDate] : []);
      const uniqDates = Array.from(new Set(ds.filter(Boolean)));

      return uniqDates.map((d) => ({
        treatment: ot.treatment,
        quantity: qty,
        scheduledDate: d,
        price: qty * pricePerTank,
        cost: qty * costPerTank,
        unitPrice: pricePerTank,
        projectCode: "",
        type: "other-new",
        originalIndex: index,
      }));
    });

  // Extra annual rows added from duplicate (+) action in schedule table.
  // These rows share qty/projectCode with their base annual treatment but carry
  // independent scheduled date entries and are inserted just below clicked row.
  const additionalAnnualScheduleRows = additionalAnnualRows.map((row) => ({
    treatment: row.treatment,
    quantity: row.quantity,
    scheduledDate: null,
    price: row.price,
    cost: row.cost,
    unitPrice: row.unitPrice,
    unitCost: row.unitCost,
    projectCode: row.projectCode || "",
    type: "annual",
    originalIndex: row.originalIndex,
    dateIndex: row.dateIndex,
    insertAfterKey: row.insertAfterKey,
  }));

  // Keep duplicate rows directly under the row where "+" was clicked.
  const annualRowsWithInsertedDuplicates = (() => {
    if (!additionalAnnualScheduleRows.length) return annualScheduleData;

    const byAfterKey = new Map();
    additionalAnnualScheduleRows.forEach((row) => {
      const key = row.insertAfterKey;
      if (!byAfterKey.has(key)) byAfterKey.set(key, []);
      byAfterKey.get(key).push(row);
    });

    const visited = new Set();
    const output = [];

    const appendChildren = (parentKey) => {
      const children = byAfterKey.get(parentKey) || [];
      children.forEach((child) => {
        const childKey = getDateKey(child);
        if (visited.has(childKey)) return;
        visited.add(childKey);
        output.push(child);
        appendChildren(childKey);
      });
    };

    annualScheduleData.forEach((baseRow) => {
      const baseKey = getDateKey(baseRow);
      output.push(baseRow);
      appendChildren(baseKey);
    });

    // Fallback: if any dangling rows exist, append at end.
    additionalAnnualScheduleRows.forEach((row) => {
      const key = getDateKey(row);
      if (!visited.has(key)) output.push(row);
    });

    return output;
  })();

  // Combine all scheduled treatments
  const scheduledTreatments = [
    ...annualRowsWithInsertedDuplicates,
    ...otherScheduleDataFromState,
    ...otherScheduleDataFromForm,
  ];

  // ✅ total (price total) - recalculate based on current quantities
  const programTotal = scheduledTreatments.reduce((sum, t, index) => {
    if (t.type === "annual") {
      const qtyKey = getQtyKey(t);
      const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(t.quantity || 0);
      const unitPrice = t.unitPrice || (t.quantity > 0 ? (t.price / t.quantity) : 100);
      return sum + (currentQty * unitPrice);
    } else {
      // For other treatments, use saved price or calculate from quantity
      const qtyKey = getQtyKey(t);
      const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(t.quantity || 0);
      if (t.type === "other") {
        const pricePerTank = Number(t.price / (t.quantity || 1)) || 0;
        return sum + (currentQty * pricePerTank);
      } else {
        // other-new: use mixData price
        const pricePerTank = Number(t.price / (t.quantity || 1)) || 0;
        return sum + (currentQty * pricePerTank);
      }
    }
  }, 0);

  // ✅ total (cost total) - recalculate based on current quantities
  const programCostTotal = scheduledTreatments.reduce((sum, t, index) => {
    const qtyKey = getQtyKey(t);
    const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(t.quantity || 0);
    const baseQty = Number(t.quantity) || 0;
    const baseCost = Number(t.cost) || 0;
    const unitCost =
      t.unitCost ??
      (baseQty > 0 ? (baseCost / baseQty) : 0);
    return sum + (currentQty * (Number(unitCost) || 0));
  }, 0);

  const programLaborCostTotal = scheduledTreatments.reduce((sum, t) => {
    const qtyKey = getQtyKey(t);
    const currentQty =
      rowQty[qtyKey] !== undefined
        ? wholeQuantity(rowQty[qtyKey])
        : wholeQuantity(t.quantity || 0);
    return sum + (currentQty > 0 ? 45 : 0);
  }, 0);

  const programCostPer100GalTankTotal = programCostTotal + programLaborCostTotal;

  const programLaborPriceTotal = scheduledTreatments.reduce((sum, t) => {
    const qtyKey = getQtyKey(t);
    const currentQty =
      rowQty[qtyKey] !== undefined
        ? wholeQuantity(rowQty[qtyKey])
        : wholeQuantity(t.quantity || 0);
    return sum + (currentQty > 0 ? Number(laborPricePerTreatment) || 0 : 0);
  }, 0);

  const programPricePer100GalTankTotal =
    (2 * programCostTotal) + programLaborPriceTotal;

  // 🔹 other treatment handlers
  const addOtherTreatment = () => {
    setNewOtherTreatments([
      ...newOtherTreatments,
      { 
        treatment: "", 
        quantity: "", 
        scheduledDate: "",
        scheduledDates: [],
        mixData: null,
        treatmentName: "", // Custom name for "Other" option
        price: "", // For "Other" option
        cost: "", // For "Other" option
      },
    ]);
  };

  const removeOtherTreatment = (index) => {
    setNewOtherTreatments(newOtherTreatments.filter((_, i) => i !== index));
  };

  const duplicateAnnualTreatmentRow = (item) => {
    if (!item || item.type !== "annual") return;
    const uniqueId = `extra-${item.originalIndex}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setAdditionalAnnualRows((prev) => [
      ...prev,
      {
        originalIndex: item.originalIndex,
        dateIndex: uniqueId,
        treatment: item.treatment || "",
        quantity: wholeQuantity(item.quantity || 0),
        unitPrice: item.unitPrice,
        unitCost: item.unitCost,
        price: item.price,
        cost: item.cost,
        projectCode: item.projectCode || "",
        insertAfterKey: getDateKey(item),
      },
    ]);
  };

  const removeDuplicatedAnnualRow = (item) => {
    if (!item || item.type !== "annual") return;
    const isDuplicatedAnnualRow =
      typeof item.dateIndex === "string" &&
      item.dateIndex.startsWith("extra-");
    if (!isDuplicatedAnnualRow) return;

    setAdditionalAnnualRows((prev) =>
      prev.filter(
        (row) =>
          !(
            row.originalIndex === item.originalIndex &&
            row.dateIndex === item.dateIndex
          )
      )
    );

    const dateKey = getDateKey(item);
    setDates((prev) => {
      if (!dateKey || !(dateKey in prev)) return prev;
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  // Update single treatment (for Edit modal) - supports annual and other types
  const updateTreatment = async (item, updatedData) => {
    if (!customerId || !item?.type || (item.type !== "annual" && item.type !== "other")) return false;
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
      const newDateISO = updatedData.scheduledDate ? new Date(updatedData.scheduledDate).toISOString() : null;
      const newQuantity = wholeQuantity(updatedData.quantity != null ? updatedData.quantity : 0);
      const newPrice = parseFloat(updatedData.price) || 0;
      const newProjectCode = updatedData.projectCode !== undefined && updatedData.projectCode !== null ? String(updatedData.projectCode).trim() : undefined;

      const payload = {
        customerName: customer.customerName,
        customerEmail: customer.customerEmail || "",
        customerPhone: customer.customerPhone || "",
        jobAddress: customer.jobAddress,
        isChemicalMaintenanceEnabled: !!customer.isChemicalMaintenanceEnabled,
        annualTreatments: (customer.annualTreatments || []).map((t, i) => {
          if (item.type === "annual" && i === item.originalIndex) {
            const updated = { ...t };
            // Support multiple dates per annual treatment
            const existingDates = Array.isArray(updated.scheduleDates) && updated.scheduleDates.length
              ? [...updated.scheduleDates]
              : (updated.scheduleDate ? [updated.scheduleDate] : []);
            if (newDateISO) {
              if (item.dateIndex != null && existingDates[item.dateIndex] != null) {
                existingDates[item.dateIndex] = newDateISO;
              } else if (!existingDates.includes(newDateISO)) {
                existingDates.push(newDateISO);
              }
              updated.scheduleDates = existingDates;
              updated.scheduleDate = existingDates[0] || newDateISO;
            }
            updated.quantity = newQuantity;
            updated.price = newPrice;
            if (newProjectCode !== undefined) updated.projectCode = newProjectCode;
            if (t.unitCost && newQuantity > 0) updated.cost = t.unitCost * newQuantity;
            return updated;
          }
          return t;
        }),
        otherTreatments: (customer.otherTreatments || []).map((t, i) => {
          if (item.type === "other" && i === item.originalIndex) {
            const updated = { ...t };
            if (newDateISO) updated.date = newDateISO;
            updated.qty = newQuantity;
            updated.totalPricePerTank = newPrice;
            if (newProjectCode !== undefined) updated.projectCode = newProjectCode;
            if (t.unitCost && newQuantity > 0) updated.totalCostPerTank = t.unitCost * newQuantity;
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
      toast.error(err?.response?.data?.message || "Failed to update treatment");
      return false;
    }
  };

  const handleOtherTreatmentChange = (index, field, value) => {
    const updated = [...newOtherTreatments];
    
    // If changing treatment, store full mix data or handle "Other" option
    if (field === "treatment" && value) {
      // Allow multiple "Other" entries, but check duplicates for mix names
      if (value !== "Other") {
        const isDuplicate = newOtherTreatments.some(
          (row, i) => i !== index && row.treatment === value
        );
        
        if (isDuplicate) {
          toast.error("This treatment is already selected. Please choose a different treatment.");
          return;
        }
      }

      const selectedMix = chemicalMixes.find((mix) => mix.mixName === value);
      updated[index] = {
        ...updated[index],
        treatment: value,
        mixData: value === "Other" ? null : (selectedMix || null),
        treatmentName: value === "Other" ? updated[index].treatmentName : "",
        // For mix: populate price/cost from mix; for "Other" keep existing
        price: value === "Other" ? updated[index].price : (selectedMix ? (selectedMix.totalPricePerTank ?? "") : ""),
        cost: value === "Other" ? updated[index].cost : (selectedMix ? (selectedMix.totalCostPerTank ?? "") : ""),
        scheduledDate: "",
        scheduledDates: [],
      };
      } else {
        if (field === "scheduledDate") {
        const cur = Array.isArray(updated[index].scheduledDates)
          ? updated[index].scheduledDates
          : (updated[index].scheduledDate ? [updated[index].scheduledDate] : []);
        const next = value && !cur.includes(value) ? [...cur, value] : cur;
        updated[index] = {
          ...updated[index],
          scheduledDate: value || "",
          scheduledDates: next,
        };
      } else {
        updated[index][field] = field === "quantity" ? normalizeQuantityInput(value) : value;
      }
    }
    
    setNewOtherTreatments(updated);
  };

  // 🔹 submit - only updates ANNUAL PROGRAM SCHEDULE (no new treatments added from OTHER TREATMENTS)
  const executeCustomerUpdate = async (payload) => {
    const token = localStorage.getItem("f&gstafftoken");
    if (!token) {
      toast.error("Authentication token not found", { toastId: SCHEDULE_ERROR_TOAST_ID });
      return false;
    }

    const updateRes = await axios.put(
      `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
      payload,
      {
        headers: {
          token,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Update response:", updateRes.data);

    if (updateRes.data.success) {
      toast.success("Schedule updated successfully", { toastId: SCHEDULE_SUCCESS_TOAST_ID });
      navigate("/panel/office/chemical-maintenance/manage-customer", { replace: true });
      return true;
    }

    toast.error(updateRes.data.message || "Failed to update schedule", { toastId: SCHEDULE_ERROR_TOAST_ID });
    return false;
  };

  const handleProceedLowBalance = async () => {
    if (!pendingUpdatePayload || isSubmitting) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      const ok = await executeCustomerUpdate(pendingUpdatePayload);
      if (ok) {
        setShowBalanceWarning(false);
        setPendingUpdatePayload(null);
      }
    } catch (error) {
      console.error("Proceed low balance submit error:", error);
      toast.error(error.response?.data?.message || error.message || "Something went wrong", { toastId: SCHEDULE_ERROR_TOAST_ID });
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (submitLockRef.current || isSubmitting) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    try {
      // Validate ANNUAL TREATMENTS - check if quantity is filled but date is missing
      const incompleteAnnualTreatments = scheduledTreatments.filter((st, index) => {
        if (st.type !== "annual") return false;
        const qtyKey = getQtyKey(st);
        const dateKey = getDateKey(st);
        const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(st.quantity || 0);
        const currentDate = dates[dateKey] !== undefined ? dates[dateKey] : formatDateForInput(st.scheduledDate);
        // Check if quantity > 0 but date is empty or null
        return currentQty > 0 && (!currentDate || currentDate.trim() === "");
      });

      if (incompleteAnnualTreatments.length > 0) {
        toast.error("Please fill Scheduled Date for all treatments with quantity in the schedule table", { toastId: SCHEDULE_ERROR_TOAST_ID });
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // Validate OTHER TREATMENTS - check if treatment is selected but scheduledDate is missing
      const incompleteOtherTreatments = newOtherTreatments.filter((ot) => {
        const ds = Array.isArray(ot.scheduledDates)
          ? ot.scheduledDates
          : (ot.scheduledDate ? [ot.scheduledDate] : []);
        // Check if "Other" is selected
        if (ot.treatment === "Other") {
          // For "Other", check if treatmentName is filled but date is missing
          const hasTreatmentName = ot.treatmentName && ot.treatmentName.trim() !== "";
          const hasDate = ds.length > 0;
          return hasTreatmentName && !hasDate;
        }
        
        // Check if mix treatment is selected
        const hasTreatment = ot.treatment && ot.treatment.trim() !== "" && ot.treatment !== "Other";
        if (!hasTreatment) return false;
        
        // Check if date is missing (empty string, null, undefined, or just whitespace)
        const hasDate = ds.length > 0;
        
        return !hasDate; // Return true if treatment selected but date missing
      });

      if (incompleteOtherTreatments.length > 0) {
        toast.error("Please fill Scheduled Date for all selected treatments in OTHER TREATMENTS section before updating", { toastId: SCHEDULE_ERROR_TOAST_ID });
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Authentication token not found", { toastId: SCHEDULE_ERROR_TOAST_ID });
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // Get current customer data
      const customerRes = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
        { headers: { token } }
      );

      if (!customerRes.data.success) {
        toast.error("Failed to fetch customer data", { toastId: SCHEDULE_ERROR_TOAST_ID });
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const currentCustomer = customerRes.data.data;

      // Map scheduledTreatments indices to annual treatments and other treatments
      const annualTreatmentUpdates = {};
      const otherTreatmentUpdates = {};
      
      console.log("Dates state:", dates);
      console.log("RowQty state:", rowQty);
      console.log("ProjectCodes state:", projectCodes);
      console.log("ScheduledTreatments:", scheduledTreatments);
      
      scheduledTreatments.forEach((st, scheduledIndex) => {
        const dateKey = getDateKey(st);
        const qtyKey = getQtyKey(st);
        const pcKey = getProjectCodeKey(st);
        // Get current values from state (user edits) or use original values
        const currentDate = dates[dateKey] !== undefined ? dates[dateKey] : formatDateForInput(st.scheduledDate);
        const currentQty = rowQty[qtyKey] !== undefined ? rowQty[qtyKey] : st.quantity;
        const currentProjectCode = projectCodes[pcKey] !== undefined ? projectCodes[pcKey] : (st.projectCode || "");
        const currentQtyNum =
          currentQty !== undefined && currentQty !== null && currentQty !== "" ? wholeQuantity(currentQty) : undefined;

        if (st.type === "annual" && st.originalIndex !== undefined) {
          const idx = st.originalIndex;
          if (!annualTreatmentUpdates[idx]) {
            annualTreatmentUpdates[idx] = {
              scheduleDates: [],
              quantity: currentQtyNum !== undefined ? currentQtyNum : undefined,
              projectCode: currentProjectCode || undefined,
            };
          } else {
            // Keep latest qty/projectCode edits (same across all dates)
            if (currentQty !== undefined && currentQty !== null && currentQty !== "") {
              annualTreatmentUpdates[idx].quantity = currentQtyNum;
            }
            if (currentProjectCode !== undefined && currentProjectCode !== null) {
              annualTreatmentUpdates[idx].projectCode = currentProjectCode || undefined;
            }
          }

          if (currentDate) {
            annualTreatmentUpdates[idx].scheduleDates.push(currentDate);
          }
        } else if (st.type === "other" && st.originalIndex !== undefined) {
          // Always update with current table values
          otherTreatmentUpdates[st.originalIndex] = {
            date: currentDate || undefined,
            qty: currentQty !== undefined && currentQty !== null && currentQty !== "" ? currentQtyNum : undefined,
            projectCode: currentProjectCode || undefined,
          };
        }
      });
      
      console.log("Annual treatment updates:", annualTreatmentUpdates);
      console.log("Other treatment updates:", otherTreatmentUpdates);

      // Update annual treatments with new schedule dates, quantities, and project codes.
      // IMPORTANT: If a treatment is scheduled on multiple dates, we EXPAND it into multiple treatment entries
      // (1 entry per date) so the customer ends up with N treatments for N dates.
      const updatedAnnualTreatments = [];
      (currentCustomer.annualTreatments || []).forEach((at, index) => {
        const updates = annualTreatmentUpdates[index];

        // Get updated values, use current if update provided, otherwise keep original
        const updatedScheduleDates = Array.isArray(updates?.scheduleDates)
          ? Array.from(new Set(updates.scheduleDates.filter(Boolean)))
          : (Array.isArray(at.scheduleDates) ? at.scheduleDates : (at.scheduleDate ? [at.scheduleDate] : []));

        const updatedQty =
          updates && updates.quantity !== undefined && updates.quantity !== null && updates.quantity !== ""
            ? wholeQuantity(updates.quantity)
            : wholeQuantity(at.quantity);

        const updatedProjectCode =
          updates && updates.projectCode !== undefined && updates.projectCode !== null
            ? updates.projectCode
            : (at.projectCode || "");

        // Calculate unit price/cost from original values.
        // If price is 0 (e.g., quantity was 0 when added), use default unit price 100 / unit cost 80.
        const originalQty = Number(at.quantity) || 0;
        const savedPrice = Number(at.price) || 0;
        const savedCost = Number(at.cost) || 0;
        const unitPrice = originalQty > 0 && savedPrice > 0 ? savedPrice / originalQty : 100;
        const unitCost = originalQty > 0 && savedCost > 0 ? savedCost / originalQty : 80;

        // If no schedule dates, keep single row (unscheduled template row)
        if (!updatedScheduleDates || updatedScheduleDates.length === 0) {
          updatedAnnualTreatments.push({
            ...at,
            scheduleDates: [],
            scheduleDate: at.scheduleDate,
            quantity: updatedQty,
            projectCode: updatedProjectCode,
            status: at.status || "Scheduled",
            price: Number(updatedQty || 0) * unitPrice,
            cost: Number(updatedQty || 0) * unitCost,
          });
          return;
        }

        // Expand: 1 annualTreatment entry per scheduled date
        updatedScheduleDates.forEach((d) => {
          updatedAnnualTreatments.push({
            ...at,
            scheduleDates: [d],
            scheduleDate: d,
            quantity: updatedQty,
            projectCode: updatedProjectCode,
            status: at.status || "Scheduled",
            price: Number(updatedQty || 0) * unitPrice,
            cost: Number(updatedQty || 0) * unitCost,
          });
        });
      });

      // Update existing other treatments with dates, quantities, and project codes
      const updatedExistingOtherTreatments = (currentCustomer.otherTreatments || []).map((ot, index) => {
        const updates = otherTreatmentUpdates[index];
        
        // If no updates for this treatment, return as is
        if (!updates) {
          return ot;
        }

        const updatedDate = (updates.date !== undefined && updates.date !== null && updates.date !== "") 
          ? updates.date 
          : ot.date;
        
        const updatedQty = (updates.qty !== undefined && updates.qty !== null && updates.qty !== "")
          ? wholeQuantity(updates.qty)
          : wholeQuantity(ot.qty);
        
        const updatedProjectCode = (updates.projectCode !== undefined && updates.projectCode !== null)
          ? updates.projectCode
          : (ot.projectCode || "");

        const updatedTreatment = {
          ...ot,
          date: updatedDate,
          qty: updatedQty,
          projectCode: updatedProjectCode,
          status: ot.status || "Scheduled",
        };
        
        console.log(`Updated other treatment ${index}:`, {
          original: ot,
          updates: updates,
          updated: updatedTreatment
        });
        
        return updatedTreatment;
      });

      // Format new other treatments from OTHER TREATMENTS section (same format as AddCustomer.jsx)
      const formattedNewOtherTreatments = newOtherTreatments
        .filter((ot) => {
          const ds = Array.isArray(ot.scheduledDates)
            ? ot.scheduledDates
            : (ot.scheduledDate ? [ot.scheduledDate] : []);
          // For "Other", check if treatmentName is provided
          if (ot.treatment === "Other") {
            return ot.treatmentName && ot.treatmentName.trim() !== "" && ds.length > 0 && ot.quantity && Number(ot.quantity) > 0;
          }
          // For mix selections, check if treatment is provided
          return ot.treatment && ot.treatment.trim() !== "" && ds.length > 0 && ot.quantity && Number(ot.quantity) > 0;
        })
        .flatMap((ot) => {
          const ds = Array.isArray(ot.scheduledDates)
            ? ot.scheduledDates
            : (ot.scheduledDate ? [ot.scheduledDate] : []);
          const uniqDates = Array.from(new Set(ds.filter(Boolean)));

          // If "Other" is selected, use treatmentName as treatment value
          if (ot.treatment === "Other") {
            return uniqDates.map((d) => ({
              treatment: ot.treatmentName.trim(), // Use custom name as treatment
              qty: wholeQuantity(ot.quantity || 0),
              date: d,
              projectCode: "", // Can be added later if needed
              status: "Scheduled",
              totalPricePerTank: Number(ot.price || 0),
              totalCostPerTank: Number(ot.cost || 0),
            }));
          }

          const baseData = {
            treatment: ot.treatment,
            qty: wholeQuantity(ot.quantity || 0),
            projectCode: "", // Can be added later if needed
            status: "Scheduled",
          };

          // Include full mix data if available
          if (ot.mixData) {
            return uniqDates.map((d) => ({
              ...baseData,
              date: d,
              mixName: ot.mixData.mixName,
              chemicals: ot.mixData.chemicals || [],
              totalCostPerTank: ot.mixData.totalCostPerTank || 0,
              totalPricePerTank: ot.mixData.totalPricePerTank || 0,
              mixId: ot.mixData._id,
            }));
          }

          return uniqDates.map((d) => ({ ...baseData, date: d }));
        });

      console.log("New other treatments to add:", formattedNewOtherTreatments);

      // Filter out soft-deleted treatments (qty=0, date=null) before checking duplicates
      const activeOtherTreatments = updatedExistingOtherTreatments.filter((ot) => {
        const qty = Number(ot.qty || 0);
        const hasDate = ot.date != null;
        return qty > 0 || hasDate; // Keep if has quantity OR date (not soft-deleted)
      });

      // Check for duplicates: same treatment name (ignore date - if same treatment exists, update it instead of creating new)
      const trulyNewOtherTreatments = formattedNewOtherTreatments.filter((newOt) => {
        const existsInOtherTreatments = activeOtherTreatments.some((existingOt) => {
          const treatmentMatch = (existingOt.treatment || existingOt.mixName) === (newOt.treatment || newOt.mixName);
          return treatmentMatch; // Same treatment name = duplicate (update existing, don't create new)
        });
        return !existsInOtherTreatments; // Add only if treatment name doesn't exist
      });

      console.log("Truly new other treatments (after duplicate check):", trulyNewOtherTreatments);

      // Combine active other treatments with only new ones (no duplicates)
      const updatedOtherTreatments = [
        ...activeOtherTreatments,
        ...trulyNewOtherTreatments,
      ];

      // Update customer
      const updatePayload = {
        customerName: currentCustomer.customerName,
        customerEmail: currentCustomer.customerEmail,
        customerPhone: currentCustomer.customerPhone,
        jobAddress: currentCustomer.jobAddress,
        isChemicalMaintenanceEnabled: currentCustomer.isChemicalMaintenanceEnabled,
        annualTreatments: updatedAnnualTreatments,
        otherTreatments: updatedOtherTreatments,
      };

      // Warning rule: show confirmation when remaining annual balance falls below/equal $50.
      // Keep parsing defensive so malformed values never skip the alert due to NaN.
      const toSafeNumber = (value) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        const parsed = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const scheduledAnnualAmount = (updatedAnnualTreatments || [])
        .filter((at) => at.scheduleDate)
        .reduce((sum, at) => sum + toSafeNumber(at.price), 0);

      const scheduledOtherAmount = (updatedOtherTreatments || [])
        .filter((ot) => ot.date)
        .reduce((sum, ot) => {
          const qty = toSafeNumber(ot.qty);
          const pricePerTank = toSafeNumber(ot.totalPricePerTank);
          return sum + (qty * pricePerTank);
        }, 0);

      const annualProgramTotal = scheduledAnnualAmount + scheduledOtherAmount;

      const completedAnnualAmount = (updatedAnnualTreatments || [])
        .filter((at) => (at.status || "").toString().trim().toLowerCase() === "completed")
        .reduce((sum, at) => sum + toSafeNumber(at.price), 0);

      const completedOtherAmount = (updatedOtherTreatments || [])
        .filter((ot) => (ot.status || "").toString().trim().toLowerCase() === "completed")
        .reduce((sum, ot) => {
          const qty = toSafeNumber(ot.qty);
          const pricePerTank = toSafeNumber(ot.totalPricePerTank);
          return sum + (qty * pricePerTank);
        }, 0);

      const usedAmount = completedAnnualAmount + completedOtherAmount;
      const remainingAmount = annualProgramTotal - usedAmount;

      if (remainingAmount <= 50) {
        console.log("Low balance warning triggered:", {
          annualProgramTotal,
          usedAmount,
          remainingAmount,
        });
        setPendingUpdatePayload(updatePayload);
        setPendingRemainingAmount(remainingAmount);
        setShowBalanceWarning(true);
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      console.log("Update payload:", JSON.stringify(updatePayload, null, 2));
      await executeCustomerUpdate(updatePayload);
    } catch (error) {
      console.error("Submit schedule error:", error);
      toast.error(error.response?.data?.message || error.message || "Something went wrong", { toastId: SCHEDULE_ERROR_TOAST_ID });
    } finally {
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-black">
            Scheduled Application Dashboard
          </h2>
          <button onClick={() => navigate(-1)} className="border px-4 py-1">
            Back
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => navigate(`/panel/office/chemical-maintenance/treatment/${customerId}/customerSummary`, { state: { customerId, customerName } })}
            className="bg-[#00613e] text-white px-6 py-3"
          >
            COMPLETED TREATMENTS
          </button>
          <button
            onClick={() => navigate(`/panel/office/chemical-maintenance/customers/${customerId}/client-reconcile`, { state })}
            className="bg-[#00613e] text-white px-6 py-3"
          >
            USAGE AND BILLING SUMMARY
          </button>
        </div>

        <div className="mb-4 font-semibold">
          <p>CUSTOMER NAME: {customerName}</p>
          <p>CUSTOMER ID: {customerId}</p>
        </div>

        <table className="w-full border text-center">
          <thead className="bg-[#00613e] text-white">
            <tr>
              <th className="border p-2">S. No.</th>
              <th className="border p-2">DATE</th>
              <th className="border p-2">TREATMENT</th>
              <th className="border p-2">QUANTITY</th>
              <th className="border p-2">CHEMICAL COST</th>
              <th className="border p-2">LABOR COST</th>
              <th className="border p-2">COST/100 GAL TANK</th>
              <th className="border p-2">CHEMICAL PRICE</th>
              <th className="border p-2">LABOR PRICE</th>
              <th className="border p-2">PRICE/100 GAL TANK</th>
              <th className="border p-2">PROJECT CODE</th>
              <th className="border p-2">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {scheduledTreatments.length > 0 ? (
              scheduledTreatments.map((item, i) => {
                const dateKey = getDateKey(item);
                const qtyKey = getQtyKey(item);
                const pcKey = getProjectCodeKey(item);
                const isDuplicatedAnnualRow =
                  item.type === "annual" &&
                  typeof item.dateIndex === "string" &&
                  item.dateIndex.startsWith("extra-");
                const originalDate = formatDateForInput(item.scheduledDate);
                const editedDate = dates[dateKey] || null;
                const dateInputValue = editedDate || originalDate || "";

                return (
                  <tr key={i} className="even:bg-gray-100">
                    <td className="border p-2">{i + 1}</td>
                    <td className="border p-2">
                      <input
                        type="date"
                        value={dateInputValue}
                        min={getTodayDate()}
                        onChange={(e) => {
                          const selectedDate = e.target.value;
                          if (selectedDate && selectedDate < getTodayDate()) {
                            toast.error("Schedule date cannot be in the past", { toastId: SCHEDULE_DATE_PAST_TOAST_ID });
                            return;
                          }
                          setDates({ ...dates, [dateKey]: selectedDate });
                        }}
                        className="w-full border px-2 py-1"
                      />
                    </td>
                    <td className="border p-2">{item.treatment || "-"}</td>
                    <td className="border p-2">
                      <input
                        type="number"
                        value={rowQty[qtyKey] !== undefined ? rowQty[qtyKey] : item.quantity ?? ""}
                        min="0"
                        step="1"
                        onChange={(e) => setRowQty((prev) => ({ ...prev, [qtyKey]: normalizeQuantityInput(e.target.value) }))}
                        className="w-full border px-2 py-1 text-center"
                        placeholder="0"
                      />
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {(() => {
                        const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(item.quantity || 0);
                        // annual rows carry unitCost; other rows don't always, so compute defensively from total cost
                        const unitCost =
                          item.unitCost ??
                          (Number(item.quantity) > 0
                            ? Number(item.cost) / Number(item.quantity)
                            : 0);
                        const displayCost = currentQty * (Number(unitCost) || 0);
                        // No space after "$" to avoid wrapping into two lines
                        return `$${Number(displayCost).toFixed(2)}`;
                      })()}
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {(() => {
                        const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(item.quantity || 0);
                        return currentQty > 0 ? "$45.00" : "$0.00";
                      })()}
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {(() => {
                        const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(item.quantity || 0);
                        if (currentQty <= 0) return "$0.00";
                        const unitCost =
                          item.unitCost ??
                          (Number(item.quantity) > 0
                            ? Number(item.cost) / Number(item.quantity)
                            : 0);
                        const chemicalCost = currentQty * (Number(unitCost) || 0);
                        const laborCost = 45;
                        return `$${Number(chemicalCost + laborCost).toFixed(2)}`;
                      })()}
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {(() => {
                        const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(item.quantity || 0);
                        const unitPrice = item.unitPrice ?? (item.quantity > 0 ? (item.price / item.quantity) : 100);
                        const displayPrice = currentQty * unitPrice;
                        // No space after "$" to avoid wrapping into two lines
                        return `$${Number(displayPrice).toFixed(2)}`;
                      })()}
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {(() => {
                        const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(item.quantity || 0);
                        return currentQty > 0
                          ? `$${Number(laborPricePerTreatment).toFixed(2)}`
                          : "$0.00";
                      })()}
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {(() => {
                        const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(item.quantity || 0);
                        if (currentQty <= 0) return "$0.00";
                        const unitCost =
                          item.unitCost ??
                          (Number(item.quantity) > 0
                            ? Number(item.cost) / Number(item.quantity)
                            : 0);
                        const chemicalCost = currentQty * (Number(unitCost) || 0);
                        const laborPrice = Number(laborPricePerTreatment) || 0;
                        const pricePer100GalTank = (2 * chemicalCost) + laborPrice;
                        return `$${Number(pricePer100GalTank).toFixed(2)}`;
                      })()}
                    </td>
                    <td className="border p-2">
                      <input
                        type="text"
                        value={
                          projectCodes[pcKey] !== undefined
                            ? projectCodes[pcKey]
                            : item.projectCode || ""
                        }
                        onChange={(e) =>
                          setProjectCodes({ ...projectCodes, [pcKey]: e.target.value })
                        }
                        className="w-full border px-2 py-1 text-center"
                        placeholder="-"
                      />
                    </td>
                    <td className="border p-2">
                      <div className="flex justify-center gap-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          title="View"
                          onClick={() => {
                            setViewData({
                              customerName,
                              treatment: item.treatment,
                              scheduledDate: formatDisplayDate(dateInputValue || originalDate),
                              status: "Scheduled",
                              projectCode: projectCodes[pcKey] !== undefined ? projectCodes[pcKey] : item.projectCode || "-",
                            });
                            setViewOpen(true);
                          }}
                        >
                          <i className="fa fa-eye"></i>
                        </button>
                        <button
                          type="button"
                          title={item.type === "other-new" ? "Edit available after saving" : "Edit"}
                          disabled={item.type === "other-new"}
                          onClick={() => {
                            if (item.type === "other-new") return;
                            const rawQty = rowQty[qtyKey] !== undefined ? rowQty[qtyKey] : item.quantity;
                            const qNum = wholeQuantity(
                              rawQty !== "" && rawQty != null && rawQty !== undefined ? rawQty : item.quantity || 0
                            );
                            const unitPrice = item.unitPrice || (item.quantity > 0 ? item.price / item.quantity : 100);
                            const priceVal = item.type === "other" ? (item.quantity > 0 ? item.price / item.quantity : 0) : (qNum * unitPrice) || item.price;
                            setEditData({
                              _id: `${customerId}-${item.type}-${item.originalIndex}`,
                              customerId,
                              scheduledDate: dateInputValue || originalDate,
                              scheduledDateRaw: item.scheduledDate,
                              quantity: String(qNum),
                              price: priceVal,
                              projectCode: projectCodes[pcKey] !== undefined ? projectCodes[pcKey] : item.projectCode || "",
                              treatment: item.treatment,
                              status: "Scheduled",
                              type: item.type,
                              originalIndex: item.originalIndex,
                              dateIndex: item.dateIndex ?? null,
                              rowIndex: i,
                            });
                            setEditModalOpen(true);
                          }}
                          className={item.type === "other-new" ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <i className="fa fa-edit"></i>
                        </button>
                        {item.type === "annual" && (
                          <button
                            type="button"
                            title="Duplicate row to add another date"
                            onClick={() => duplicateAnnualTreatmentRow(item)}
                            className="text-white bg-green-500 w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none"
                          >
                            +
                          </button>
                        )}
                        {isDuplicatedAnnualRow && (
                          <button
                            type="button"
                            title="Remove duplicated row"
                            onClick={() => removeDuplicatedAnnualRow(item)}
                            className="text-white bg-red-500 w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none"
                          >
                            -
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="12" className="border p-2 text-center">
                  No scheduled treatments found. Please add schedule dates in Annual Program or add treatments below.
                </td>
              </tr>
            )}

            {scheduledTreatments.length > 0 && (
              <tr className="font-bold">
                <td colSpan="4" className="border p-2 text-right text-green-600">
                  PROGRAM TOTAL
                </td>
                <td className="border p-2 whitespace-nowrap">
                  ${programCostTotal.toFixed(2)}
                </td>
                <td className="border p-2 whitespace-nowrap">
                  ${programLaborCostTotal.toFixed(2)}
                </td>
                <td className="border p-2 whitespace-nowrap">
                  ${programCostPer100GalTankTotal.toFixed(2)}
                </td>
                <td className="border p-2 whitespace-nowrap">
                  ${programTotal.toFixed(2)}
                </td>
                <td className="border p-2 whitespace-nowrap">
                  ${programLaborPriceTotal.toFixed(2)}
                </td>
                <td className="border p-2 whitespace-nowrap">
                  ${programPricePer100GalTankTotal.toFixed(2)}
                </td>
                <td className="border p-2"></td>
              </tr>
            )}
            {scheduledTreatments.length > 0 && (
              <tr className="font-bold">
                <td colSpan="4" className="border p-2 text-right text-black">
                  CONTRACT TOTAL
                </td>
                <td colSpan="8" className="border p-2 whitespace-nowrap text-left">
                  ${contractTotalDisplay.toFixed(2)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* OTHER TREATMENTS */}
        <h2 className="font-semibold text-lg">OTHER TREATMENTS</h2>

        <table className="w-full border ">
          <thead className="bg-[#00613e] text-white">
            <tr className=" py-10">
              <th className="p-2 border">TREATMENT</th>
              <th className="p-2 border">QUANTITY</th>
              <th className="p-2 border">SCHEDULE DATE</th>
              <th className="p-2 border">COST</th>
              <th className="p-2 border">PRICE</th>
              <th className="p-2 border">ACTION</th>
            </tr>
          </thead>

          <tbody>
            {newOtherTreatments.map((item, index) => {
              // Get all treatment names that are already in the upper table (scheduledTreatments)
              const scheduledTreatmentNames = scheduledTreatments.map(
                (st) => st.treatment
              );

              // Filter out treatments that are:
              // 1. Already in the upper table (scheduledTreatments)
              // 2. Already selected in other rows of OTHER TREATMENTS (except current row)
              const availableMixes = chemicalMixes.filter((mix) => {
                // Exclude if already in upper table
                const isInScheduledTable = scheduledTreatmentNames.includes(mix.mixName);
                
                // Exclude if already selected in other OTHER TREATMENTS rows
                const isSelectedInOtherRow = newOtherTreatments.some(
                  (r, i) => i !== index && r.treatment === mix.mixName
                );
                
                return !isInScheduledTable && !isSelectedInOtherRow;
              });

              // Check if there are any unselected treatments available for adding new row
              // "Other" entries don't count against the limit - we can always add more "Other" entries
              const selectedMixTreatments = [
                ...scheduledTreatmentNames,
                ...newOtherTreatments
                  .map((r) => r.treatment)
                  .filter((t) => t && t.trim() !== "" && t !== "Other"),
              ];
              // Allow adding new row if there are unselected mixes OR if we want to add another "Other"
              const hasUnselectedTreatments =
                selectedMixTreatments.length < chemicalMixes.length;
              const canAddMoreRows = hasUnselectedTreatments || true; // Always allow adding "Other" entries

              return (
                <tr key={index}>
                  {/* Treatment */}
                  <td>
                    {item.treatment === "Other" ? (
                      <input
                        type="text"
                        value={item.treatmentName || ""}
                        onChange={(e) =>
                          handleOtherTreatmentChange(index, "treatmentName", e.target.value)
                        }
                        className="w-full border px-2 py-1"
                        placeholder="Enter Treatment Name"
                      />
                    ) : (
                      <select
                        value={item.treatment}
                        onChange={(e) =>
                          handleOtherTreatmentChange(index, "treatment", e.target.value)
                        }
                        className="w-full border px-2 py-1"
                      >
                        <option value="">Select a Mix</option>
                        {availableMixes.map((mix) => (
                          <option key={mix._id} value={mix.mixName}>
                            {mix.mixName}
                          </option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    )}
                  </td>

                  {/* Quantity */}
                  <td>
                    <input
                      type="number"
                      value={item.quantity}
                      min="0"
                      step="1"
                      onChange={(e) =>
                        handleOtherTreatmentChange(index, "quantity", e.target.value)
                      }
                    />
                  </td>

                  {/* Date - custom calendar popup with QTY */}
                  <td className="relative">
                    <div
                      data-other-calendar-trigger
                      onClick={() => {
                        if (otherCalendarOpenIndex === index) {
                          setOtherCalendarOpenIndex(null);
                        } else {
                          setOtherCalendarOpenIndex(index);
                          const ds = Array.isArray(item.scheduledDates)
                            ? item.scheduledDates
                            : (item.scheduledDate ? [item.scheduledDate] : []);
                          const last = ds.length ? ds[ds.length - 1] : item.scheduledDate;
                          const d = last ? new Date(last + "T12:00:00") : new Date();
                          setOtherCalendarView({ year: d.getFullYear(), month: d.getMonth() });
                        }
                      }}
                      className="w-full border px-2 py-1 flex items-center justify-between cursor-pointer bg-white"
                    >
                      <span className={(Array.isArray(item.scheduledDates) ? item.scheduledDates.length > 0 : !!item.scheduledDate) ? "" : "text-gray-400"}>
                        {(() => {
                          const ds = Array.isArray(item.scheduledDates)
                            ? item.scheduledDates
                            : (item.scheduledDate ? [item.scheduledDate] : []);
                          if (!ds.length) return "mm/dd/yyyy";
                          const first = ds[0];
                          const firstLabel = new Date(first + "T12:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
                          return ds.length === 1 ? firstLabel : `${firstLabel} (+${ds.length - 1})`;
                        })()}
                      </span>
                      <span>📅</span>
                    </div>
                    {(() => {
                      const ds = Array.isArray(item.scheduledDates)
                        ? item.scheduledDates
                        : (item.scheduledDate ? [item.scheduledDate] : []);
                      if (!ds.length) return null;
                      return (
                        <div className="mt-1 flex flex-wrap gap-1 justify-start">
                          {ds.map((d) => (
                            <span
                              key={d}
                              className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 text-[10px]"
                            >
                              {new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                              <button
                                type="button"
                                className="text-gray-600 hover:text-red-600 leading-none"
                                title="Remove date"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewOtherTreatments((prev) => {
                                    const next = [...prev];
                                    const cur = Array.isArray(next[index].scheduledDates)
                                      ? next[index].scheduledDates
                                      : (next[index].scheduledDate ? [next[index].scheduledDate] : []);
                                    const filtered = cur.filter((x) => x !== d);
                                    next[index] = {
                                      ...next[index],
                                      scheduledDates: filtered,
                                      scheduledDate: filtered[filtered.length - 1] || "",
                                    };
                                    return next;
                                  });
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                    {otherCalendarOpenIndex === index && (() => {
                      const todayStr = getTodayDate();
                      const minDateObj = new Date(todayStr + "T00:00:00");
                      const firstDay = new Date(otherCalendarView.year, otherCalendarView.month, 1).getDay();
                      const daysInMonth = new Date(otherCalendarView.year, otherCalendarView.month + 1, 0).getDate();
                      const daysArr = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                      const ds = Array.isArray(item.scheduledDates)
                        ? item.scheduledDates
                        : (item.scheduledDate ? [item.scheduledDate] : []);
                      const last = ds.length ? ds[ds.length - 1] : item.scheduledDate;
                      const selDateObj = last ? new Date(last + "T12:00:00") : null;
                      const selDay = selDateObj ? selDateObj.getDate() : null;
                      const selMonth = selDateObj ? selDateObj.getMonth() : null;
                      const selYear = selDateObj ? selDateObj.getFullYear() : null;
                      return (
                        <div
                          ref={otherCalendarRef}
                          className="absolute z-50 bg-white border-2 border-[#00613e] rounded shadow-lg p-2"
                          style={{ minWidth: "200px", top: "100%", right: 0, marginTop: "0.25rem" }}
                        >
                          <div className="flex items-center justify-between mb-1 border-b pb-1">
                            <button type="button" onClick={() => setOtherCalendarView((v) => {
                              const prev = v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 };
                              return prev;
                            })} className="text-[#00613e] font-bold px-0 border-0 bg-transparent" style={{ fontSize: "0.75rem" }}>&lt;</button>
                            <span className="font-semibold" style={{ fontSize: "0.75rem" }}>{MONTH_NAMES[otherCalendarView.month]} {otherCalendarView.year}</span>
                            <button type="button" onClick={() => setOtherCalendarView((v) => {
                              const next = v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 };
                              return next;
                            })} className="text-[#00613e] font-bold px-0 border-0 bg-transparent" style={{ fontSize: "0.75rem" }}>&gt;</button>
                          </div>
                          <div className="text-center mb-1" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", fontSize: "0.65rem" }}>
                            {DAY_NAMES.map((d) => (
                              <div key={d} className="font-medium text-gray-500 py-0">{d}</div>
                            ))}
                            {daysArr.map((day, idx) => {
                              const isSelected = day && selDay === day && selMonth === otherCalendarView.month && selYear === otherCalendarView.year;
                              const dateStr = day ? `${otherCalendarView.year}-${String(otherCalendarView.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                              const isPast = day && new Date(dateStr + "T12:00:00") < minDateObj;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (!day || isPast) return;
                                    handleOtherTreatmentChange(index, "scheduledDate", dateStr);
                                  }}
                                  disabled={!day || isPast}
                                  className={`py-1 rounded border-0 ${!day ? "invisible" : isPast ? "text-gray-300 cursor-not-allowed bg-transparent" : isSelected ? "bg-[#00613e] text-white" : "hover:bg-gray-200 bg-transparent"}`}
                                  style={{ fontSize: "0.7rem" }}
                                >
                                  {day || ""}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-2 pt-2 border-t">
                            <label className="block font-bold mb-0" style={{ fontSize: "0.7rem" }}>QTY</label>
                            <input
                              type="number"
                              value={item.quantity}
                              min="0"
                              step="1"
                              onChange={(e) => handleOtherTreatmentChange(index, "quantity", e.target.value)}
                              className="w-full border px-2 py-1 text-center"
                              placeholder="0"
                              style={{ fontSize: "0.75rem" }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Cost - editable for "Other", from mix for selected mix */}
                  <td>
                    {item.treatment === "Other" ? (
                      <input
                        type="number"
                        value={item.cost || ""}
                        min="0"
                        step="0.01"
                        onChange={(e) =>
                          handleOtherTreatmentChange(index, "cost", e.target.value)
                        }
                        className="w-full border px-2 py-1"
                        placeholder="0.00"
                      />
                    ) : item.mixData != null ? (
                      <span className="font-medium">
                        ${Number(item.mixData.totalCostPerTank ?? item.cost ?? 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Price - editable for "Other", from mix for selected mix */}
                  <td>
                    {item.treatment === "Other" ? (
                      <input
                        type="number"
                        value={item.price || ""}
                        min="0"
                        step="0.01"
                        onChange={(e) =>
                          handleOtherTreatmentChange(index, "price", e.target.value)
                        }
                        className="w-full border px-2 py-1"
                        placeholder="0.00"
                      />
                    ) : item.mixData != null ? (
                      <span className="font-medium">
                        ${Number(item.mixData.totalPricePerTank ?? item.price ?? 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  {/* Actions - align + and − properly in center */}
                  <td className="border p-2 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      {newOtherTreatments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOtherTreatment(index)}
                          className="text-white bg-red-500 w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none"
                        >
                          −
                        </button>
                      )}
                      {index === newOtherTreatments.length - 1 &&
                        canAddMoreRows && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              addOtherTreatment();
                            }}
                            className="text-white bg-green-500 w-8 h-8 rounded-full flex items-center justify-center text-lg leading-none"
                          >
                            +
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ACTIONS */}
        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }}
            disabled={isSubmitting}
            className="bg-[#00613e] text-white px-6 py-2 rounded disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Updating..." : "Update"}
          </button>
        </div>
      </div>

      <ViewTreatmentDetails
        show={viewOpen}
        data={viewData}
        customer={{ customerName, _id: customerId, description }}
        onClose={() => setViewOpen(false)}
      />
      <EditCustomer
        show={editModalOpen}
        data={editData}
        onClose={() => {
          setEditModalOpen(false);
          setEditData(null);
        }}
        onSuccess={async (updatedData) => {
          if (updatedData && editData && (editData.type === "annual" || editData.type === "other")) {
            const ok = await updateTreatment(editData, updatedData);
            if (ok) {
              toast.success("Treatment updated successfully");
              setEditModalOpen(false);
              setEditData(null);
              try {
                const token = localStorage.getItem("f&gstafftoken");
                const res = await axios.get(
                  `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customerId}`,
                  { headers: { token } }
                );
                if (res.data.success && res.data.data) {
                  const fresh = res.data.data;
                  const qtyMap = {};
                  let idx = 0;
                  (fresh.annualTreatments || []).forEach((at) => {
                    if (at.quantity !== undefined && at.quantity !== null && at.quantity !== "") qtyMap[idx] = at.quantity;
                    idx++;
                  });
                  (fresh.otherTreatments || []).filter((ot) => ot.date).forEach((ot) => {
                    const q = ot.qty ?? ot.quantity;
                    if (q !== undefined && q !== null && q !== "") qtyMap[idx] = q;
                    idx++;
                  });
                  setRowQty(qtyMap);
                  navigate(`/panel/office/chemical-maintenance/customers/${customerId}/annual-program-schedule`, {
                    state: {
                      customerName: fresh.customerName,
                      customerId: fresh._id,
                      isChemicalMaintenanceEnabled: !!fresh.isChemicalMaintenanceEnabled,
                      treatments: fresh.treatments,
                      annualTreatments: fresh.annualTreatments,
                      otherTreatments: fresh.otherTreatments,
                    },
                    replace: true,
                  });
                }
              } catch (err) {
                console.error("Refetch after edit failed:", err);
                navigate(0);
              }
            }
          } else {
            setEditModalOpen(false);
            setEditData(null);
          }
        }}
      />

      {showBalanceWarning && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: "rgba(0, 0, 0, 0.45)" }}
        >
          <div
            className="bg-white border border-red-200 rounded-xl shadow-2xl overflow-hidden"
            style={{ width: "440px", maxWidth: "95vw" }}
          >
            <div className="px-6 py-4 bg-red-50 border-b border-red-100">
              <h3 className="text-red-600 text-2xl font-semibold">Customer Balance Warning</h3>
            </div>

            <div className="px-6 py-6">
              <p className="text-gray-700 text-lg mb-2">Annual Remaining Balance</p>
              <p className="text-5xl font-bold text-gray-800 mb-6">
                ${Number(pendingRemainingAmount || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mb-7">
                Remaining balance is below $50. Do you want to continue?
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                  onClick={() => {
                    setShowBalanceWarning(false);
                    setPendingUpdatePayload(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="bg-[#00613e] text-white px-6 py-2.5 rounded-md hover:opacity-90 disabled:opacity-60"
                  onClick={handleProceedLowBalance}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Proceed"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAnnualProgramSchedule;
