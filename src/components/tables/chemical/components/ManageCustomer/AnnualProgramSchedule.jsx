import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../../../context/TableContext";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ViewTreatmentDetails from "../Dashboard/ViewCustomer";
import EditCustomer from "../Dashboard/EditCustomer";
import { getCustomLocalTreatments } from "../../../../../utils/otherTreatmentLocalStore";
import { saveHighlightedArchivedPlan } from "../../../../../utils/archivedPlanHighlight";
import {
  CATALOG_OPTION_PREFIX,
  fetchActiveMaterials,
  getOtherTreatmentSelectionKey,
  MATERIAL_OPTION_PREFIX,
} from "../../../../../utils/otherTreatmentDropdown";
import {
  EMPTY_OTHER_TREATMENT_ROW,
  applyOtherTreatmentSelection,
  buildChemicalOtherTreatmentDropdownOptions,
  buildMaterialOtherTreatmentDropdownOptions,
  cloneOtherTreatmentFormRow,
  formatOtherTreatmentRowsForApi,
  getOtherTreatmentIdentityKey,
  hasValidOtherTreatmentDate,
  isActiveOtherTreatmentEntry,
  isChemicalOtherTreatment,
  mergeFormOtherTreatmentsIntoList,
  migrateAnnualOtherChemicalToOtherTreatments,
  otherTreatmentFormRowIsReady,
  resolveOtherTreatmentDate,
  resolveOtherTreatmentName,
  resolveOtherTreatmentQuantity,
  scheduleItemAppliesLabor,
} from "../../../../../utils/otherTreatmentCategory";
import { isOtherChemicalProgramTreatment, normalizeTreatmentNameKey } from "../../../../../utils/otherTreatmentDefaults";

const CustomerAnnualProgramSchedule = () => {
  const { customerId: paramCustomerId } = useParams();
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { tableSize } = useTableContext();

  // When navigated without state (e.g. from Completed Treatments), fetch customer and build state
  const [fetchedState, setFetchedState] = useState(null);
  const [refreshedState, setRefreshedState] = useState(null);
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

  const state = refreshedState || locationState || fetchedState;

  // calendar popup states
  const [openIndex, setOpenIndex] = useState(null);
  const [dates, setDates] = useState({});
  const [rowQty, setRowQty] = useState({});
  const [projectCodes, setProjectCodes] = useState({});
  const [additionalAnnualRows, setAdditionalAnnualRows] = useState([]);
  const [removedScheduleRowKeys, setRemovedScheduleRowKeys] = useState([]);

  // Key helpers: avoid collisions when annual rows expand by multiple dates.
  // Annual qty/projectCode are per-treatment (originalIndex), while date is per-row (originalIndex + dateIndex).
  const getQtyKey = (item) => {
    if (!item) return "";
    if (item.type === "annual") return `annual-${item.originalIndex}`;
    if (item.type === "other") return `other-${item.originalIndex}`;
    if (item.type === "other-new") return `other-new-${item.originalIndex}`;
    if (item.type === "other-chemical-new") return `other-chemical-new-${item.originalIndex}`;
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
    if (item.type === "other-chemical-new") return `other-chemical-new-${item.originalIndex}`;
    return "";
  };

  // OTHER TREATMENTS calendar popup state
  const [otherCalendarOpenIndex, setOtherCalendarOpenIndex] = useState(null);
  const [otherCalendarOpenChemicalIndex, setOtherCalendarOpenChemicalIndex] = useState(null);
  const [otherCalendarView, setOtherCalendarView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const otherCalendarRef = useRef(null);
  const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /** Quantity: up to 2 decimal places. */
  const normalizeQuantityInput = (val) => {
    if (val === "" || val == null) return "";
    const s = String(val).trim();
    if (!/^\d*(\.\d{0,2})?$/.test(s)) return s.slice(0, -1);
    return s;
  };

  const wholeQuantity = (val) => {
    if (val === "" || val == null) return 0;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
  };

  // Close OTHER TREATMENTS calendar on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (otherCalendarOpenIndex !== null && otherCalendarRef.current && !otherCalendarRef.current.contains(e.target) && !e.target.closest("[data-other-calendar-trigger]")) {
        setOtherCalendarOpenIndex(null);
      }
      if (otherCalendarOpenChemicalIndex !== null && otherCalendarRef.current && !otherCalendarRef.current.contains(e.target) && !e.target.closest("[data-other-calendar-trigger]")) {
        setOtherCalendarOpenChemicalIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [otherCalendarOpenIndex, otherCalendarOpenChemicalIndex]);

  // chemical mixes + catalog for OTHER CHEMICAL TREATMENTS dropdown; materials for OTHER TREATMENTS
  const [chemicalMixes, setChemicalMixes] = useState([]);
  const [catalogTreatments, setCatalogTreatments] = useState([]);
  const [materials, setMaterials] = useState([]);

  const emptyOtherFormRow = () => ({
    ...EMPTY_OTHER_TREATMENT_ROW,
    quantity: "",
    scheduledDate: "",
    scheduledDates: [],
  });

  // other treatments form (newly added in this page)
  const [newOtherTreatments, setNewOtherTreatments] = useState([emptyOtherFormRow()]);
  const [newOtherChemicalTreatments, setNewOtherChemicalTreatments] = useState([emptyOtherFormRow()]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitLockRef = useRef(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [pendingUpdatePayload, setPendingUpdatePayload] = useState(null);
  const [pendingUpdateFallbackCustomer, setPendingUpdateFallbackCustomer] = useState(null);
  const [pendingRemainingAmount, setPendingRemainingAmount] = useState(0);
  const SCHEDULE_DATE_PAST_TOAST_ID = "schedule-date-past";
  const SCHEDULE_ERROR_TOAST_ID = "annual-schedule-error";
  const SCHEDULE_SUCCESS_TOAST_ID = "annual-schedule-success";

  // Fetch chemical mixes and other-treatment catalog
  useEffect(() => {
    fetchChemicalMixes();
    fetchTreatmentCatalog();
    fetchMaterialsList();
  }, []);

  const fetchMaterialsList = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const items = await fetchActiveMaterials(
        process.env.REACT_APP_API_BASE_URL,
        token
      );
      setMaterials(items);
    } catch (error) {
      console.error("Failed to load materials:", error);
    }
  };

  const fetchTreatmentCatalog = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) return;

      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/get-all-other-treatment`,
        {
          headers: { token },
          params: { page: 1, limit: 500, sortby: "sortOrder", sortorder: 1 },
        }
      );

      if (res.data.statusCode === 200) {
        const items = res.data.result?.treatments || [];
        const localOther = getCustomLocalTreatments().filter(
          (t) => t.programType === "other"
        );
        const apiCatalog = items.filter((t) => t.programType === "other");
        const seen = new Set(
          apiCatalog.map((t) => String(t.treatmentName).trim().toUpperCase())
        );
        setCatalogTreatments([
          ...apiCatalog,
          ...localOther.filter(
            (t) => !seen.has(String(t.treatmentName).trim().toUpperCase())
          ),
        ]);
      }
    } catch (error) {
      console.error("Failed to load treatment catalog:", error);
      setCatalogTreatments(
        getCustomLocalTreatments().filter((t) => t.programType === "other")
      );
    }
  };

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



  // OTHER CHEMICAL form stays empty — saved rows show in the schedule table above.
  useEffect(() => {
    if (!state) return;
    setNewOtherChemicalTreatments([emptyOtherFormRow()]);
  }, [state?.customerId]);

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

      // Other: qty/projectCode/date keyed by other index in full otherTreatments array
      (otherTreatments || []).forEach((ot, originalIndex) => {
        const resolvedDate = resolveOtherTreatmentDate(ot);
        if (!hasValidOtherTreatmentDate(resolvedDate)) return;
        const key = `other-${originalIndex}`;
        const formattedDate = formatDateForInput(resolvedDate);
        if (formattedDate) initialDates[key] = formattedDate;
        if (ot.projectCode) initialProjectCodes[key] = ot.projectCode;
        const q = resolveOtherTreatmentQuantity(ot);
        if (q > 0) {
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
    if (isOtherChemicalProgramTreatment(at.name)) return [];

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

  // Legacy: other-chemical program rows still stored in annualTreatments (not yet in otherTreatments).
  const otherTreatmentNameKeys = new Set(
    (otherTreatments || []).map((ot) =>
      normalizeTreatmentNameKey(resolveOtherTreatmentName(ot))
    )
  );

  const otherChemicalFromAnnualScheduleData = (annualTreatments || []).flatMap(
    (at, originalIndex) => {
      if (!isOtherChemicalProgramTreatment(at.name)) return [];
      if (otherTreatmentNameKeys.has(normalizeTreatmentNameKey(at.name))) return [];

      const qty = wholeQuantity(at.quantity || 0);
      const savedPrice = at.price || 0;
      const savedCost = at.cost || 0;
      const unitPrice = qty > 0 ? savedPrice / qty : 100;
      const unitCost = qty > 0 ? savedCost / qty : 80;

      const ds =
        Array.isArray(at.scheduleDates) && at.scheduleDates.length > 0
          ? at.scheduleDates
          : at.scheduleDate
            ? [at.scheduleDate]
            : [];

      if (!ds.length) {
        return [
          {
            treatment: at.name,
            quantity: qty,
            scheduledDate: null,
            price: savedPrice,
            cost: savedCost,
            unitPrice,
            unitCost,
            projectCode: at.projectCode || "",
            type: "annual",
            originalIndex,
            dateIndex: null,
            isChemicalTreatment: true,
          },
        ];
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
        isChemicalTreatment: true,
      }));
    }
  );

  // Build schedule data from other treatments (from state - already saved)
  const otherScheduleDataFromState = (otherTreatments || []).flatMap((ot, originalIndex) => {
    const resolvedDate = resolveOtherTreatmentDate(ot);
    if (!hasValidOtherTreatmentDate(resolvedDate)) return [];

    const qty = wholeQuantity(resolveOtherTreatmentQuantity(ot));
    const costPerTank = Number(ot.totalCostPerTank || 0);
    const pricePerTank = Number(ot.totalPricePerTank || 0);

    return [{
      treatment: resolveOtherTreatmentName(ot),
      quantity: qty,
      scheduledDate: resolvedDate,
      price: qty * pricePerTank,
      cost: qty * costPerTank,
      unitPrice: pricePerTank,
      unitCost: costPerTank,
      projectCode: ot.projectCode || "",
      type: "other",
      originalIndex,
      isChemicalTreatment: isChemicalOtherTreatment(ot),
    }];
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

  // Program table: saved schedule only — OTHER TREATMENTS form rows appear after Update
  const scheduledTreatments = [
    ...annualRowsWithInsertedDuplicates,
    ...otherChemicalFromAnnualScheduleData,
    ...otherScheduleDataFromState,
  ];

  const removedScheduleRowKeySet = new Set(removedScheduleRowKeys);
  const visibleScheduledTreatments = scheduledTreatments.filter(
    (st) => !removedScheduleRowKeySet.has(getDateKey(st))
  );

  // ✅ total (price total) - recalculate based on current quantities
  const programTotal = visibleScheduledTreatments.reduce((sum, t) => {
    const qtyKey = getQtyKey(t);
    const currentQty =
      rowQty[qtyKey] !== undefined
        ? wholeQuantity(rowQty[qtyKey])
        : wholeQuantity(t.quantity || 0);
    const baseQty = Number(t.quantity) || 0;
    const basePrice = Number(t.price) || 0;
    const unitPrice =
      t.unitPrice ??
      (baseQty > 0 ? basePrice / baseQty : t.type === "annual" ? 100 : 0);
    return sum + currentQty * (Number(unitPrice) || 0);
  }, 0);

  // ✅ total (cost total) - recalculate based on current quantities
  const programCostTotal = visibleScheduledTreatments.reduce((sum, t, index) => {
    const qtyKey = getQtyKey(t);
    const currentQty = rowQty[qtyKey] !== undefined ? wholeQuantity(rowQty[qtyKey]) : wholeQuantity(t.quantity || 0);
    const baseQty = Number(t.quantity) || 0;
    const baseCost = Number(t.cost) || 0;
    const unitCost =
      t.unitCost ??
      (baseQty > 0 ? (baseCost / baseQty) : 0);
    return sum + (currentQty * (Number(unitCost) || 0));
  }, 0);

  const programLaborCostTotal = visibleScheduledTreatments.reduce((sum, t) => {
    if (!scheduleItemAppliesLabor(t)) return sum;
    const qtyKey = getQtyKey(t);
    const currentQty =
      rowQty[qtyKey] !== undefined
        ? wholeQuantity(rowQty[qtyKey])
        : wholeQuantity(t.quantity || 0);
    return sum + (currentQty > 0 ? 45 : 0);
  }, 0);

  const programCostPer100GalTankTotal = programCostTotal + programLaborCostTotal;

  const programLaborPriceTotal = visibleScheduledTreatments.reduce((sum, t) => {
    if (!scheduleItemAppliesLabor(t)) return sum;
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
    setNewOtherTreatments([...newOtherTreatments, emptyOtherFormRow()]);
  };
  const addOtherChemicalTreatment = () => {
    setNewOtherChemicalTreatments([...newOtherChemicalTreatments, emptyOtherFormRow()]);
  };

  const getOtherTreatmentRowKey = getOtherTreatmentSelectionKey;

  const removeOtherTreatment = (index) => {
    setNewOtherTreatments(newOtherTreatments.filter((_, i) => i !== index));
  };
  const removeOtherChemicalTreatment = (index) => {
    setNewOtherChemicalTreatments(newOtherChemicalTreatments.filter((_, i) => i !== index));
  };

  const makeOtherTreatmentChangeHandler = (rows, setRows, isChemicalSection) => (index, field, value) => {
    const updated = [...rows];

    if (field === "treatment" && value) {
      if (!isChemicalSection && !value.startsWith(MATERIAL_OPTION_PREFIX)) {
        toast.error("OTHER TREATMENTS me sirf materials select kar sakte hain.");
        return;
      }
      if (isChemicalSection && value.startsWith(MATERIAL_OPTION_PREFIX)) {
        toast.error("Materials yahan nahi — OTHER CHEMICAL TREATMENTS me mixes select karein.");
        return;
      }

      const isDuplicate = rows.some(
        (row, i) => i !== index && getOtherTreatmentRowKey(row) === value
      );
      if (isDuplicate) {
        toast.error("This treatment is already selected. Please choose a different treatment.");
        return;
      }

      const nextRow = applyOtherTreatmentSelection(updated[index], value, {
        materials,
        catalogTreatments,
        chemicalMixes,
        isChemicalSection,
        isChemicalMaintenanceEnabled: maintenanceEnabledNormalized,
      });
      if (nextRow === updated[index]) {
        return;
      }
      updated[index] = nextRow;
      setRows(updated);
      return;
    }

    if (field === "scheduledDate") {
      const cur = Array.isArray(updated[index].scheduledDates)
        ? updated[index].scheduledDates
        : updated[index].scheduledDate
          ? [updated[index].scheduledDate]
          : [];
      const next = value && !cur.includes(value) ? [...cur, value] : cur;
      updated[index] = {
        ...updated[index],
        scheduledDate: value || "",
        scheduledDates: next,
      };
      setRows(updated);
      return;
    }

    updated[index][field] = field === "quantity" ? normalizeQuantityInput(value) : value;
    setRows(updated);
  };

  const handleOtherTreatmentChange = makeOtherTreatmentChangeHandler(
    newOtherTreatments,
    setNewOtherTreatments,
    false
  );
  const handleOtherChemicalTreatmentChange = makeOtherTreatmentChangeHandler(
    newOtherChemicalTreatments,
    setNewOtherChemicalTreatments,
    true
  );

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

  const handleDeleteScheduleRow = (item) => {
    if (!item) return;

    const isDuplicatedAnnualRow =
      item.type === "annual" &&
      typeof item.dateIndex === "string" &&
      item.dateIndex.startsWith("extra-");
    if (isDuplicatedAnnualRow) {
      removeDuplicatedAnnualRow(item);
      return;
    }

    const rowKey = getDateKey(item);
    if (!rowKey) return;

    setRemovedScheduleRowKeys((prev) =>
      prev.includes(rowKey) ? prev : [...prev, rowKey]
    );

    setDates((prev) => {
      if (!(rowKey in prev)) return prev;
      const next = { ...prev };
      delete next[rowKey];
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

  const rebuildScheduleUiFromCustomer = (customerData) => {
    const nextState = {
      customerName: customerData.customerName || "",
      customerId: customerData._id || customerData.customerId || paramCustomerId,
      description: customerData.description || "",
      contractTotal: customerData.contractTotal ?? 0,
      isChemicalMaintenanceEnabled: !!customerData.isChemicalMaintenanceEnabled,
      treatments: [],
      annualTreatments: customerData.annualTreatments || [],
      otherTreatments: customerData.otherTreatments || [],
    };

    const initialDates = {};
    const initialProjectCodes = {};
    const initialRowQty = {};

    (nextState.annualTreatments || []).forEach((at, originalIndex) => {
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
      ds.forEach((d, dateIndex) => {
        const formatted = formatDateForInput(d);
        if (formatted) initialDates[`annual-${originalIndex}-${dateIndex}`] = formatted;
      });
    });

    (nextState.otherTreatments || []).forEach((ot, originalIndex) => {
      const resolvedDate = resolveOtherTreatmentDate(ot);
      if (!hasValidOtherTreatmentDate(resolvedDate)) return;
      const key = `other-${originalIndex}`;
      const formattedDate = formatDateForInput(resolvedDate);
      if (formattedDate) initialDates[key] = formattedDate;
      if (ot.projectCode) initialProjectCodes[key] = ot.projectCode;
      const q = resolveOtherTreatmentQuantity(ot);
      if (q > 0) {
        initialRowQty[key] = String(wholeQuantity(q));
      }
    });

    setRefreshedState(nextState);
    setDates(initialDates);
    setProjectCodes(initialProjectCodes);
    setRowQty(initialRowQty);
    setNewOtherTreatments([emptyOtherFormRow()]);
    setNewOtherChemicalTreatments([emptyOtherFormRow()]);
    setAdditionalAnnualRows([]);
    setRemovedScheduleRowKeys([]);
  };

  const executeCustomerUpdate = async (payload, { fallbackCustomer } = {}) => {
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

      if (updateRes.data.archivedPlan) {
        saveHighlightedArchivedPlan(updateRes.data.archivedPlan);
      }

      const customerForUi = {
        ...(fallbackCustomer || {}),
        ...(updateRes.data.data || {}),
        _id: updateRes.data.data?._id || fallbackCustomer?._id || customerId,
        customerName:
          payload.customerName ??
          updateRes.data.data?.customerName ??
          fallbackCustomer?.customerName,
        customerEmail:
          payload.customerEmail ??
          updateRes.data.data?.customerEmail ??
          fallbackCustomer?.customerEmail,
        customerPhone:
          payload.customerPhone ??
          updateRes.data.data?.customerPhone ??
          fallbackCustomer?.customerPhone,
        jobAddress:
          payload.jobAddress ??
          updateRes.data.data?.jobAddress ??
          fallbackCustomer?.jobAddress,
        contractTotal:
          updateRes.data.data?.contractTotal ??
          fallbackCustomer?.contractTotal ??
          0,
        description:
          updateRes.data.data?.description ?? fallbackCustomer?.description ?? "",
        isChemicalMaintenanceEnabled:
          payload.isChemicalMaintenanceEnabled ??
          updateRes.data.data?.isChemicalMaintenanceEnabled ??
          fallbackCustomer?.isChemicalMaintenanceEnabled,
        // Always show exactly what we saved — do not let refetch drop new rows.
        annualTreatments:
          payload.annualTreatments ?? updateRes.data.data?.annualTreatments ?? [],
        otherTreatments:
          payload.otherTreatments ?? updateRes.data.data?.otherTreatments ?? [],
      };

      rebuildScheduleUiFromCustomer(customerForUi);
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
      const ok = await executeCustomerUpdate(pendingUpdatePayload, {
        fallbackCustomer: pendingUpdateFallbackCustomer,
      });
      if (ok) {
        setShowBalanceWarning(false);
        setPendingUpdatePayload(null);
        setPendingUpdateFallbackCustomer(null);
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

    // Snapshot form rows before any await so async save cannot lose in-progress entries.
    const formOtherRowsSnapshot = newOtherTreatments.map(cloneOtherTreatmentFormRow);
    const formOtherChemicalRowsSnapshot = newOtherChemicalTreatments.map(
      cloneOtherTreatmentFormRow
    );
    const savedOtherTreatmentsSnapshot = (otherTreatments || []).map((row) => ({ ...row }));

    try {
      // Validate ANNUAL TREATMENTS - check if quantity is filled but date is missing
      const incompleteAnnualTreatments = visibleScheduledTreatments.filter((st, index) => {
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

      const validateOtherFormSection = (rows, label) => {
        const incomplete = rows.filter((ot) => {
          const hasSelection = Boolean(
            String(ot.treatment || "").trim() ||
            ot.materialData ||
            ot.mixData ||
            ot.catalogData ||
            (ot.treatment === "Other" && String(ot.treatmentName || "").trim())
          );
          return hasSelection && !otherTreatmentFormRowIsReady(ot);
        });
        if (incomplete.length > 0) {
          toast.error(
            `Please fill Quantity and Scheduled Date for all selected treatments in ${label} before updating`,
            { toastId: SCHEDULE_ERROR_TOAST_ID }
          );
          return false;
        }
        return true;
      };

      if (!validateOtherFormSection(formOtherRowsSnapshot, "OTHER TREATMENTS")) {
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }
      if (!validateOtherFormSection(formOtherChemicalRowsSnapshot, "OTHER CHEMICAL TREATMENTS")) {
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
      console.log("ScheduledTreatments:", visibleScheduledTreatments);
      
      visibleScheduledTreatments.forEach((st, scheduledIndex) => {
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

      const updatedAnnualTreatmentsWithoutOtherChemical = updatedAnnualTreatments.filter(
        (at) => !isOtherChemicalProgramTreatment(at.name)
      );

      // Update existing other treatments from what the table already shows (state),
      // not only what the GET returned — indices must match scheduledTreatments.
      const updatedExistingOtherTreatments = savedOtherTreatmentsSnapshot
        .map((ot, index) => {
        if (removedScheduleRowKeySet.has(`other-${index}`)) return null;

        const updates = otherTreatmentUpdates[index];
        
        // If no updates for this treatment, return as is
        if (!updates) {
          return ot;
        }

        const updatedDate = (updates.date !== undefined && updates.date !== null && updates.date !== "") 
          ? updates.date 
          : resolveOtherTreatmentDate(ot);
        
        const updatedQty = (updates.qty !== undefined && updates.qty !== null && updates.qty !== "")
          ? wholeQuantity(updates.qty)
          : wholeQuantity(ot.qty);
        
        const updatedProjectCode = (updates.projectCode !== undefined && updates.projectCode !== null)
          ? updates.projectCode
          : (ot.projectCode || "");

        const updatedTreatment = {
          ...ot,
          date: updatedDate,
          scheduleDate: updatedDate,
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
      })
        .filter(Boolean);

      const formattedNewOtherTreatments = [
        ...formatOtherTreatmentRowsForApi(formOtherRowsSnapshot, {
          isChemicalSection: false,
          isChemicalMaintenanceEnabled: maintenanceEnabledNormalized,
          toQuantity: wholeQuantity,
        }),
        ...formatOtherTreatmentRowsForApi(formOtherChemicalRowsSnapshot, {
          isChemicalSection: true,
          isChemicalMaintenanceEnabled: maintenanceEnabledNormalized,
          toQuantity: wholeQuantity,
        }),
      ];

      console.log("Form other rows snapshot:", formOtherRowsSnapshot);
      console.log("New other treatments to add:", formattedNewOtherTreatments);

      const hasReadyFormOther = [...formOtherRowsSnapshot, ...formOtherChemicalRowsSnapshot].some(
        otherTreatmentFormRowIsReady
      );
      if (hasReadyFormOther && formattedNewOtherTreatments.length === 0) {
        toast.error(
          "Could not save OTHER TREATMENTS row. Please re-select treatment, quantity, and date.",
          { toastId: SCHEDULE_ERROR_TOAST_ID }
        );
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // Drop placeholder rows; merge form rows (same treatment + same date updates, new date adds row)
      const activeOtherTreatments = updatedExistingOtherTreatments.filter(isActiveOtherTreatmentEntry);
      const scheduledOtherBeforeMerge = activeOtherTreatments.filter((ot) =>
        hasValidOtherTreatmentDate(resolveOtherTreatmentDate(ot))
      ).length;

      let updatedOtherTreatments = mergeFormOtherTreatmentsIntoList(
        activeOtherTreatments,
        formattedNewOtherTreatments
      );

      updatedOtherTreatments = mergeFormOtherTreatmentsIntoList(
        updatedOtherTreatments,
        migrateAnnualOtherChemicalToOtherTreatments(updatedAnnualTreatments).filter(
          isActiveOtherTreatmentEntry
        )
      );

      const scheduledOtherAfterMerge = updatedOtherTreatments.filter((ot) =>
        hasValidOtherTreatmentDate(resolveOtherTreatmentDate(ot))
      ).length;

      if (hasReadyFormOther && scheduledOtherAfterMerge <= scheduledOtherBeforeMerge) {
        toast.error(
          "OTHER TREATMENTS row was not added. Please select treatment, enter quantity greater than 0, and pick a schedule date.",
          { toastId: SCHEDULE_ERROR_TOAST_ID }
        );
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      console.log("Merged other treatments after form save:", updatedOtherTreatments);

      // Update customer
      const updatePayload = {
        customerName: currentCustomer.customerName,
        customerEmail: currentCustomer.customerEmail,
        customerPhone: currentCustomer.customerPhone,
        jobAddress: currentCustomer.jobAddress,
        isChemicalMaintenanceEnabled: currentCustomer.isChemicalMaintenanceEnabled,
        annualTreatments: updatedAnnualTreatmentsWithoutOtherChemical,
        otherTreatments: updatedOtherTreatments,
        archivePreviousPlan: true,
      };

      // Warning rule: show confirmation when remaining annual balance falls below/equal $50.
      // Keep parsing defensive so malformed values never skip the alert due to NaN.
      const toSafeNumber = (value) => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        const parsed = parseFloat(String(value ?? "").replace(/[^0-9.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const scheduledAnnualAmount = (updatedAnnualTreatmentsWithoutOtherChemical || [])
        .filter((at) => at.scheduleDate)
        .reduce((sum, at) => sum + toSafeNumber(at.price), 0);

      const scheduledOtherAmount = (updatedOtherTreatments || [])
        .filter((ot) => hasValidOtherTreatmentDate(resolveOtherTreatmentDate(ot)))
        .reduce((sum, ot) => {
          const qty = toSafeNumber(ot.qty);
          const pricePerTank = toSafeNumber(ot.totalPricePerTank);
          return sum + (qty * pricePerTank);
        }, 0);

      const annualProgramTotal = scheduledAnnualAmount + scheduledOtherAmount;

      const completedAnnualAmount = (updatedAnnualTreatmentsWithoutOtherChemical || [])
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
        setPendingUpdateFallbackCustomer(currentCustomer);
        setPendingRemainingAmount(remainingAmount);
        setShowBalanceWarning(true);
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      console.log("Update payload:", JSON.stringify(updatePayload, null, 2));
      await executeCustomerUpdate(updatePayload, { fallbackCustomer: currentCustomer });
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
            {visibleScheduledTreatments.length > 0 ? (
              visibleScheduledTreatments.map((item, i) => {
                const dateKey = getDateKey(item);
                const qtyKey = getQtyKey(item);
                const pcKey = getProjectCodeKey(item);
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
                        step="0.01"
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
                        if (!scheduleItemAppliesLabor(item)) return "$0.00";
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
                        if (!scheduleItemAppliesLabor(item)) {
                          return `$${Number(chemicalCost).toFixed(2)}`;
                        }
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
                        if (!scheduleItemAppliesLabor(item)) return "$0.00";
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
                        const unitPrice = item.unitPrice ?? (item.quantity > 0 ? (item.price / item.quantity) : 100);
                        if (!scheduleItemAppliesLabor(item)) {
                          return `$${Number(currentQty * unitPrice).toFixed(2)}`;
                        }
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
                          title={item.type === "other-new" || item.type === "other-chemical-new" ? "Edit available after saving" : "Edit"}
                          disabled={item.type === "other-new" || item.type === "other-chemical-new"}
                          onClick={() => {
                            if (item.type === "other-new" || item.type === "other-chemical-new") return;
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
                          className={item.type === "other-new" || item.type === "other-chemical-new" ? "opacity-50 cursor-not-allowed" : ""}
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
                        <button
                          type="button"
                          title="Delete treatment"
                          onClick={() => handleDeleteScheduleRow(item)}
                          className="text-white bg-red-500 w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none"
                        >
                          ×
                        </button>
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

            {visibleScheduledTreatments.length > 0 && (
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
            {visibleScheduledTreatments.length > 0 && (
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
        <div className="text-lg font-semibold text-gray-900">OTHER TREATMENTS</div>

        <table className="w-full border border-gray-300 table-fixed">
          <colgroup>
            <col style={{ width: "60%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
          </colgroup>
          <thead className="bg-[#00613e] text-white">
            <tr className=" py-10">
              <th className="p-2 border">TREATMENT</th>
              <th className="p-2 border">QUANTITY</th>
              <th className="p-2 border">SCHEDULE DATE</th>
              <th className="p-2 border">PRICE</th>
              <th className="p-2 border">COST</th>
              <th className="p-2 border">ACTION</th>
            </tr>
          </thead>

          <tbody>
            {newOtherTreatments.map((item, index) => {
              // Rows still being edited below are also previewed in the main table as
              // type "other-new" — don't treat those as taken or the select goes blank.
              const scheduledTreatmentNames = visibleScheduledTreatments
                .filter((st) => st.type !== "other-new" && st.type !== "other-chemical-new")
                .map((st) => st.treatment);

              const isKeyTakenElsewhere = (key) => {
                if (!key) return false;
                if (key.startsWith(MATERIAL_OPTION_PREFIX)) {
                  const materialId = key.slice(MATERIAL_OPTION_PREFIX.length);
                  const materialItem = materials.find((m) => m._id === materialId);
                  if (
                    materialItem &&
                    scheduledTreatmentNames.includes(materialItem.name)
                  ) {
                    return true;
                  }
                } else if (key.startsWith(CATALOG_OPTION_PREFIX)) {
                  const catalogId = key.slice(CATALOG_OPTION_PREFIX.length);
                  const catalogItem = catalogTreatments.find((c) => c._id === catalogId);
                  if (
                    catalogItem &&
                    scheduledTreatmentNames.includes(catalogItem.treatmentName)
                  ) {
                    return true;
                  }
                } else if (scheduledTreatmentNames.includes(key)) {
                  return true;
                }
                return newOtherTreatments.some(
                  (r, i) => i !== index && getOtherTreatmentRowKey(r) === key
                );
              };

              const dropdownOptions = buildMaterialOtherTreatmentDropdownOptions({
                materials,
                chemicalMixes,
                isKeyTaken: isKeyTakenElsewhere,
              });

              const selectedTreatmentValue = getOtherTreatmentSelectionKey(item);

              const canAddMoreRows = true;

              return (
                <tr key={index}>
                  {/* Treatment */}
                  <td className="border p-2">
                    <select
                      value={selectedTreatmentValue}
                      onChange={(e) =>
                        handleOtherTreatmentChange(index, "treatment", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                    >
                      <option value="">Select Treatment</option>
                      {dropdownOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Quantity */}
                  <td className="border p-2">
                    <input
                      type="number"
                      value={item.quantity}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        handleOtherTreatmentChange(index, "quantity", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                    />
                  </td>

                  {/* Date - custom calendar popup with QTY */}
                  <td className="border p-2 relative">
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
                      className="w-full border px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-gray-50 min-h-[34px] bg-white"
                    >
                      <span className={(Array.isArray(item.scheduledDates) ? item.scheduledDates.length > 0 : !!item.scheduledDate) ? "" : "text-gray-500"}>
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
                              step="0.01"
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

                  {/* Price */}
                  <td className="border p-2">
                    <input
                      type="number"
                      value={item.price ?? ""}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        handleOtherTreatmentChange(index, "price", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                      placeholder="0.00"
                    />
                  </td>

                  {/* Cost */}
                  <td className="border p-2">
                    <input
                      type="number"
                      value={item.cost ?? ""}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        handleOtherTreatmentChange(index, "cost", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                      placeholder="0.00"
                    />
                  </td>

                  {/* Actions - align + and − properly in center */}
                  <td className="border p-2 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      {newOtherTreatments.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOtherTreatment(index)}
                          className="text-white bg-red-500 px-2 rounded-full leading-none"
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
                            className="text-white bg-green-500 px-2 rounded-full leading-none"
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

        <div className="text-lg font-semibold text-gray-900 mt-6">OTHER CHEMICAL TREATMENTS</div>

        <table className="w-full border border-gray-300 table-fixed">
          <colgroup>
            <col style={{ width: "60%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "6%" }} />
          </colgroup>
          <thead className="bg-[#00613e] text-white">
            <tr className=" py-10">
              <th className="p-2 border">TREATMENT</th>
              <th className="p-2 border">QUANTITY</th>
              <th className="p-2 border">SCHEDULE DATE</th>
              <th className="p-2 border">PRICE</th>
              <th className="p-2 border">COST</th>
              <th className="p-2 border">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {newOtherChemicalTreatments.map((item, index) => {
              const isKeyTakenElsewhere = (key) =>
                key &&
                newOtherChemicalTreatments.some(
                  (r, i) => i !== index && getOtherTreatmentRowKey(r) === key
                );

              const dropdownOptions = buildChemicalOtherTreatmentDropdownOptions({
                chemicalMixes: chemicalMixes.filter(
                  (mix) => !visibleScheduledTreatments.some((st) => st.treatment === mix.mixName)
                ),
                catalogTreatments,
                isChemicalMaintenanceEnabled: maintenanceEnabledNormalized,
                isKeyTaken: isKeyTakenElsewhere,
              });

              const selectedTreatmentValue = getOtherTreatmentSelectionKey(item);

              return (
                <tr key={`chem-form-${index}`}>
                  <td className="border p-2">
                    <select
                      value={selectedTreatmentValue}
                      onChange={(e) =>
                        handleOtherChemicalTreatmentChange(index, "treatment", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                    >
                      <option value="">Select Treatment</option>
                      {dropdownOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={item.quantity}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        handleOtherChemicalTreatmentChange(index, "quantity", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                    />
                  </td>
                  <td className="border p-2 relative">
                    <div
                      data-other-calendar-trigger
                      onClick={() => {
                        if (otherCalendarOpenChemicalIndex === index) {
                          setOtherCalendarOpenChemicalIndex(null);
                        } else {
                          setOtherCalendarOpenChemicalIndex(index);
                          setOtherCalendarOpenIndex(null);
                          const ds = Array.isArray(item.scheduledDates)
                            ? item.scheduledDates
                            : (item.scheduledDate ? [item.scheduledDate] : []);
                          const last = ds.length ? ds[ds.length - 1] : item.scheduledDate;
                          const d = last ? new Date(last + "T12:00:00") : new Date();
                          setOtherCalendarView({ year: d.getFullYear(), month: d.getMonth() });
                        }
                      }}
                      className="w-full border px-2 py-1 flex items-center justify-between cursor-pointer hover:bg-gray-50 min-h-[34px] bg-white"
                    >
                      <span className={(Array.isArray(item.scheduledDates) ? item.scheduledDates.length > 0 : !!item.scheduledDate) ? "" : "text-gray-500"}>
                        {(() => {
                          const ds = Array.isArray(item.scheduledDates) ? item.scheduledDates : (item.scheduledDate ? [item.scheduledDate] : []);
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
                                  setNewOtherChemicalTreatments((prev) => {
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
                    {otherCalendarOpenChemicalIndex === index && (() => {
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
                                    handleOtherChemicalTreatmentChange(index, "scheduledDate", dateStr);
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
                              step="0.01"
                              onChange={(e) => handleOtherChemicalTreatmentChange(index, "quantity", e.target.value)}
                              className="w-full border px-2 py-1 text-center"
                              placeholder="0"
                              style={{ fontSize: "0.75rem" }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={item.price ?? ""}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        handleOtherChemicalTreatmentChange(index, "price", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="number"
                      value={item.cost ?? ""}
                      min="0"
                      step="0.01"
                      onChange={(e) =>
                        handleOtherChemicalTreatmentChange(index, "cost", e.target.value)
                      }
                      className="w-full border px-2 py-1"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="border p-2 align-middle">
                    <div className="flex items-center justify-center gap-2">
                      {newOtherChemicalTreatments.length > 1 && (
                        <button type="button" onClick={() => removeOtherChemicalTreatment(index)} className="text-white bg-red-500 px-2 rounded-full leading-none">−</button>
                      )}
                      {index === newOtherChemicalTreatments.length - 1 && (
                        <button type="button" onClick={addOtherChemicalTreatment} className="text-white bg-green-500 px-2 rounded-full leading-none">+</button>
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
                  (fresh.otherTreatments || [])
                    .filter((ot) => hasValidOtherTreatmentDate(resolveOtherTreatmentDate(ot)))
                    .forEach((ot) => {
                    const q = resolveOtherTreatmentQuantity(ot);
                    if (q > 0) qtyMap[idx] = q;
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
                    setPendingUpdateFallbackCustomer(null);
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
