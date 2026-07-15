import React, { useEffect, useMemo, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_ANNUAL_TREATMENTS,
  buildAnnualTreatmentsFromCatalog,
  filterAnnualProgramTreatments,
  filterTreatmentsByProgramType,
  PROGRAM_TYPE_OTHER,
  PROGRAM_TYPE_OTHER_CHEMICAL,
} from "../../../utils/otherTreatmentDefaults";
import { getCustomLocalTreatments } from "../../../utils/otherTreatmentLocalStore";
import {
  CATALOG_OPTION_PREFIX,
  fetchActiveMaterials,
  getOtherTreatmentSelectionKey,
  MATERIAL_OPTION_PREFIX,
} from "../../../utils/otherTreatmentDropdown";
import {
  EMPTY_OTHER_TREATMENT_ROW,
  applyOtherTreatmentSelection,
  buildChemicalOtherTreatmentDropdownOptions,
  buildMaterialOtherTreatmentDropdownOptions,
  formatOtherTreatmentRowsForApi,
} from "../../../utils/otherTreatmentCategory";

const ADD_CUSTOMER_ERROR_TOAST_ID = "add-customer-error";
const ADD_CUSTOMER_SUCCESS_TOAST_ID = "add-customer-success";
const SCHEDULE_DATE_PAST_TOAST_ID = "schedule-date-past";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeQuantityInput = (val) => {
  if (val === "" || val == null) return "";
  const s = String(val).trim();
  if (!/^\d*(\.\d{0,2})?$/.test(s)) return s.slice(0, -1);
  return s;
};

const toWholeQuantity = (val) => {
  if (val === "" || val == null) return 0;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const toMoneyNumber = (val) => {
  if (val === "" || val == null) return undefined;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round((n + Number.EPSILON) * 100) / 100;
};

const INITIAL_FORM_DATA = {
  name: "",
  description: "",
  cost: "",
  markUp: "",
  measure: "",
  contractTotal: "",
  price: "",
  isTaxable: true,
};

const INITIAL_TREATMENT_ROW = { ...EMPTY_OTHER_TREATMENT_ROW };

function MiniCalendarWithQty({ selectedDate, onDateChange, qtyValue, onQtyChange, minDate, onPastDateError }) {
  const [viewDate, setViewDate] = useState(() => {
    if (selectedDate) {
      const d = new Date(selectedDate + "T12:00:00");
      return { year: d.getFullYear(), month: d.getMonth() };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const minDateObj = minDate ? new Date(minDate + "T12:00:00") : null;

  const getDaysInMonth = (year, month) => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startDay = first.getDay();
    const leadingBlanks = startDay;
    const totalCells = leadingBlanks + daysInMonth;
    const rows = Math.ceil(totalCells / 7);
    const days = [];
    for (let i = 0; i < leadingBlanks; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const handleDateClick = (day) => {
    if (!day) return;
    const year = viewDate.year;
    const month = viewDate.month;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (minDateObj) {
      const clicked = new Date(dateStr + "T12:00:00");
      if (clicked < minDateObj) {
        onPastDateError?.();
        return;
      }
    }
    onDateChange(dateStr);
  };

  const prevMonth = () => {
    setViewDate((prev) =>
      prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }
    );
  };

  const nextMonth = () => {
    setViewDate((prev) =>
      prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }
    );
  };

  const days = getDaysInMonth(viewDate.year, viewDate.month);
  const selectedDay = selectedDate ? parseInt(selectedDate.split("-")[2], 10) : null;
  const selectedMonth = selectedDate ? parseInt(selectedDate.split("-")[1], 10) - 1 : null;
  const selectedYear = selectedDate ? parseInt(selectedDate.split("-")[0], 10) : null;

  return (
    <div className="min-w-[200px]">
      <div className="flex items-center justify-between mb-1 border-b pb-1">
        <button type="button" onClick={prevMonth} className="text-[#00613e] font-bold px-0.5 text-xs hover:opacity-80">
          &lt;
        </button>
        <span className="font-semibold text-xs">{MONTH_NAMES[viewDate.month]} {viewDate.year}</span>
        <button type="button" onClick={nextMonth} className="text-[#00613e] font-bold px-0.5 text-xs hover:opacity-80">
          &gt;
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-[10px] mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="font-medium text-gray-600 py-0.5">{d}</div>
        ))}
        {days.map((day, idx) => {
          const isSelected = day && selectedDay === day && selectedMonth === viewDate.month && selectedYear === viewDate.year;
          const dateStr = day ? `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
          const isPast = day && minDateObj && new Date(dateStr + "T12:00:00") < minDateObj;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(day)}
              disabled={!day || isPast}
              className={`py-1 rounded text-xs min-w-0 ${!day ? "invisible" : isPast ? "text-gray-300 cursor-not-allowed" : isSelected ? "bg-[#00613e] text-white" : "hover:bg-gray-200"}`}
            >
              {day || ""}
            </button>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t">
        <label className="block text-xs font-bold mb-0.5">QTY</label>
        <input
          type="number"
          value={qtyValue || ""}
          min="0"
          step="0.01"
          onChange={(e) => onQtyChange(e.target.value)}
          className="w-full border px-1.5 py-1 text-center text-xs"
          placeholder="0"
        />
      </div>
    </div>
  );
}

export default function AddCustomer() {
  const [rowQty, setRowQty] = useState({});
  // Annual program supports multiple schedule dates per treatment row
  const [dates, setDates] = useState({});
  const [isChemicalChecked, setIsChemicalChecked] = useState(false);
  const [openDateQtyIndex, setOpenDateQtyIndex] = useState(null);
  const [openDateQtyRow, setOpenDateQtyRow] = useState(null);
  const [openDateQtyChemicalRow, setOpenDateQtyChemicalRow] = useState(null);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [treatmentRows, setTreatmentRows] = useState([{ ...INITIAL_TREATMENT_ROW }]);
  const [chemicalTreatmentRows, setChemicalTreatmentRows] = useState([{ ...INITIAL_TREATMENT_ROW }]);

  const [chemicalMixes, setChemicalMixes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [annualTreatments, setAnnualTreatments] = useState([]);
  const [annualCatalogLoading, setAnnualCatalogLoading] = useState(true);
  const [catalogAllItems, setCatalogAllItems] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();

  const { tableSize } = useTableContext();

  const otherTreatmentCatalog = useMemo(
    () => filterTreatmentsByProgramType(catalogAllItems, PROGRAM_TYPE_OTHER),
    [catalogAllItems]
  );
  const otherChemicalCatalog = useMemo(
    () => filterTreatmentsByProgramType(catalogAllItems, PROGRAM_TYPE_OTHER_CHEMICAL),
    [catalogAllItems]
  );

  const mergeCatalogLists = (apiItems = [], localItems = []) => {
    const seen = new Set(
      apiItems.map((t) => String(t.treatmentName || "").trim().toUpperCase())
    );
    const merged = [...apiItems];
    localItems.forEach((item) => {
      const name = String(item.treatmentName || "").trim();
      if (!name) return;
      const key = name.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    return merged;
  };

  // Get today's date in YYYY-MM-DD format for min attribute
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
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
    setAnnualCatalogLoading(true);
    const localItems = getCustomLocalTreatments();

    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        const localAnnual = buildAnnualTreatmentsFromCatalog([], localItems);
        setAnnualTreatments(
          filterAnnualProgramTreatments(
            localAnnual.length > 0 ? localAnnual : DEFAULT_ANNUAL_TREATMENTS
          )
        );
        setCatalogAllItems(mergeCatalogLists([], localItems));
        toast.error("Please log in again to load treatments from server", {
          toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
        });
        return;
      }

      const catalogParams = {
        page: 1,
        limit: 500,
        sortby: "sortOrder",
        sortorder: 1,
      };

      let res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/get-all-other-treatment`,
        { headers: { token }, params: catalogParams }
      );

      if (res.data.statusCode !== 200) {
        throw new Error(res.data.message || "Failed to load treatment catalog");
      }

      let items = res.data.result?.treatments || [];
      if ((res.data.result?.totalRecords || 0) === 0) {
        try {
          await axios.post(
            `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/seed-other-treatments`,
            {},
            { headers: { token } }
          );
          res = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/get-all-other-treatment`,
            { headers: { token }, params: catalogParams }
          );
          items = res.data.result?.treatments || [];
        } catch (seedError) {
          console.error("Seed other treatments failed:", seedError);
        }
      }

      const annual = buildAnnualTreatmentsFromCatalog(items, localItems);
      setAnnualTreatments(
        filterAnnualProgramTreatments(
          annual.length > 0 ? annual : DEFAULT_ANNUAL_TREATMENTS
        )
      );

      setCatalogAllItems(mergeCatalogLists(items, localItems));
    } catch (error) {
      console.error("Failed to load treatment catalog:", error);
      const localAnnual = buildAnnualTreatmentsFromCatalog([], localItems);
      setAnnualTreatments(
        filterAnnualProgramTreatments(
          localAnnual.length > 0 ? localAnnual : DEFAULT_ANNUAL_TREATMENTS
        )
      );
      setCatalogAllItems(mergeCatalogLists([], localItems));
      toast.error(
        error.response?.data?.message ||
          "Could not load treatments from server — showing saved defaults",
        { toastId: ADD_CUSTOMER_ERROR_TOAST_ID }
      );
    } finally {
      setAnnualCatalogLoading(false);
    }
  };

  const handleCloseDateQtyPopup = () => {
    setOpenDateQtyIndex(null);
    setOpenDateQtyRow(null);
  };

  useEffect(() => {
    const onDocClick = (e) => {
      if (openDateQtyIndex !== null || openDateQtyRow !== null) {
        const target = e.target;
        if (!target.closest("[data-date-qty-popup]") && !target.closest("[data-date-qty-trigger]")) {
          handleCloseDateQtyPopup();
        }
      }
    };
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, [openDateQtyIndex, openDateQtyRow]);

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
      // Don't show error toast on initial load, just log it
    }
  };

  const handleInputChange = (e) => {
    if (e.target.name === "name") {
      const val = e.target.value;
      // if(containsNumberOrSpecialChar(val)){
      //   toast.error("Material Name cannot contain numbers or special characters.");
      //   return;
      // }
    }

    if (e.target.name === "measure") {
      const val = e.target.value;
      // if(containsNumberOrSpecialChar(val)){
      //   toast.error("Measure cannot contain numbers or special characters.");
      //   return;
      // }
    }

    if (e.target.name === "price") {
      const val = e.target.value;
      if (val < 0) {
        toast.error("Price cannot be negative.");
        return;
      }
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disableBtn) return;
    setDisableBtn(true);

    try {
      if (formData.name.trim() === "") {
        toast.error("Please enter customer name", {
          toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
        });
        setDisableBtn(false);
        return;
      }

      if (!formData.markUp || formData.markUp.trim() === "") {
        toast.error("Please enter job address", {
          toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
        });
        setDisableBtn(false);
        return;
      }

      // Validate ANNUAL TREATMENTS - check if quantity is filled but date is missing
      const incompleteAnnualTreatments = annualTreatments.filter((t, index) => {
        const quantity = toWholeQuantity(rowQty[index] || 0);
        const ds = Array.isArray(dates[index]) ? dates[index] : (dates[index] ? [dates[index]] : []);
        return quantity > 0 && ds.length === 0;
      });

      if (incompleteAnnualTreatments.length > 0) {
        toast.error(
          "Please fill Scheduled Date for all treatments with quantity in ANNUAL TREATMENT PROGRAM section",
          {
            toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
          },
        );
        setDisableBtn(false);
        return;
      }

      // Validate ANNUAL TREATMENTS - check if date is filled but quantity is empty
      const dateWithoutQuantity = annualTreatments.filter((t, index) => {
        const quantity = toWholeQuantity(rowQty[index] || 0);
        const ds = Array.isArray(dates[index]) ? dates[index] : (dates[index] ? [dates[index]] : []);
        const hasDate = ds.length > 0;
        return hasDate && quantity <= 0;
      });

      if (dateWithoutQuantity.length > 0) {
        toast.error(
          "Please enter Quantity for all treatments that have a Scheduled Date in ANNUAL TREATMENT PROGRAM section",
          {
            toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
          },
        );
        setDisableBtn(false);
        return;
      }

      const validateOtherSection = (rows, sectionLabel) => {
        const incomplete = rows.filter((row) => {
          const ds = Array.isArray(row.dates) ? row.dates : row.date ? [row.date] : [];
          if (row.treatment) {
            return ds.length === 0;
          }
          return false;
        });
        if (incomplete.length > 0) {
          toast.error(
            `Please fill Scheduled Date for all selected treatments in ${sectionLabel}`,
            { toastId: ADD_CUSTOMER_ERROR_TOAST_ID }
          );
          return false;
        }
        const missingQty = rows.filter((row) => {
          const hasTreatmentName = row.treatment && row.treatment !== "";
          const ds = Array.isArray(row.dates) ? row.dates : row.date ? [row.date] : [];
          const hasDate = ds.length > 0;
          const qty = toWholeQuantity(row.qty || 0);
          return (hasTreatmentName || hasDate) && qty <= 0;
        });
        if (missingQty.length > 0) {
          toast.error(
            `Please enter Quantity for all ${sectionLabel} rows where Treatment or Scheduled Date is filled`,
            { toastId: ADD_CUSTOMER_ERROR_TOAST_ID }
          );
          return false;
        }
        return true;
      };

      if (!validateOtherSection(treatmentRows, "OTHER TREATMENTS")) {
        setDisableBtn(false);
        return;
      }
      if (!validateOtherSection(chemicalTreatmentRows, "OTHER CHEMICAL TREATMENTS")) {
        setDisableBtn(false);
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.", {
          toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
        });
        setDisableBtn(false);
        return;
      }

      // Build annual treatments payload: Yes = lower price, No = higher price; cost unchanged
      const annualTreatmentsPayload = annualTreatments.map((t, index) => {
        const quantity = toWholeQuantity(rowQty[index] || 0);
        const unitPrice = isChemicalChecked
          ? Number(t.lowerPrice ?? t.price ?? 100)
          : Number(t.price ?? 100);
        const unitCost = Number(t.cost || 80);
        const price = quantity * unitPrice;
        const cost = quantity * unitCost;
        const scheduleDates = Array.isArray(dates[index])
          ? dates[index]
          : dates[index]
            ? [dates[index]]
            : [];

        return {
          name: t.name,
          quantity,
          scheduleDates,
          scheduleDate: scheduleDates[0] || null, // backward compat
          price,
          cost,
          status: "Scheduled",
        };
      });

      const otherTreatments = [
        ...formatOtherTreatmentRowsForApi(treatmentRows, {
          isChemicalSection: false,
          isChemicalMaintenanceEnabled: isChemicalChecked,
          toQuantity: toWholeQuantity,
        }),
        ...formatOtherTreatmentRowsForApi(chemicalTreatmentRows, {
          isChemicalSection: true,
          isChemicalMaintenanceEnabled: isChemicalChecked,
          toQuantity: toWholeQuantity,
          catalogTreatments: otherChemicalCatalog,
        }),
      ];

      const payload = {
        customerName: formData.name,
        customerEmail: formData.measure,
        customerPhone: formData.cost,
        jobAddress: formData.markUp,
        contractTotal: toMoneyNumber(formData.contractTotal),
        isChemicalMaintenanceEnabled: isChemicalChecked,
        annualTreatments: annualTreatmentsPayload,
        otherTreatments,
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers`,
        payload,
        {
          headers: {
            token,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.success) {
        toast.success(response.data.message || "Customer created successfully", {
          toastId: ADD_CUSTOMER_SUCCESS_TOAST_ID,
        });
        setFormData(INITIAL_FORM_DATA);
        setRowQty({});
        setDates({});
        setIsChemicalChecked(false);
        setOpenDateQtyIndex(null);
        setOpenDateQtyRow(null);
        setOpenDateQtyChemicalRow(null);
        setTreatmentRows([{ ...INITIAL_TREATMENT_ROW }]);
        setChemicalTreatmentRows([{ ...INITIAL_TREATMENT_ROW }]);
        window.scrollTo(0, 0);
      } else {
        toast.error(
          response.data.message || "Failed to create customer",
          {
            toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
          },
        );
      }
    } catch (error) {
      console.log(error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Something went wrong",
        {
          toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
        },
      );
    } finally {
      setDisableBtn(false);
    }
  };

  const addRow = () => {
    setTreatmentRows((prev) => [...prev, { ...INITIAL_TREATMENT_ROW }]);
  };
  const addChemicalRow = () => {
    setChemicalTreatmentRows((prev) => [...prev, { ...INITIAL_TREATMENT_ROW }]);
  };
  const removeRow = (index) => {
    setTreatmentRows((prev) => prev.filter((_, i) => i !== index));
  };
  const removeChemicalRow = (index) => {
    setChemicalTreatmentRows((prev) => prev.filter((_, i) => i !== index));
  };
  const getTreatmentRowKey = getOtherTreatmentSelectionKey;

  const makeOtherRowChangeHandler = (rows, setRows) => (index, field, value) => {
    const isChemicalSection = rows === chemicalTreatmentRows;

    if (field === "treatment" && value) {
      if (!isChemicalSection && !value.startsWith(MATERIAL_OPTION_PREFIX) && !value.startsWith(CATALOG_OPTION_PREFIX)) {
        toast.error("OTHER TREATMENTS me sirf materials ya Other Treatment catalog select kar sakte hain.");
        return;
      }
      if (isChemicalSection && value.startsWith(MATERIAL_OPTION_PREFIX)) {
        toast.error("Materials yahan nahi — OTHER CHEMICAL TREATMENTS me mixes select karein.");
        return;
      }

      const isDuplicate = rows.some(
        (row, i) => i !== index && getTreatmentRowKey(row) === value
      );
      if (isDuplicate) {
        toast.error(
          "This treatment is already selected. Please choose a different treatment."
        );
        return;
      }

      const updatedRows = [...rows];
      const nextRow = applyOtherTreatmentSelection(updatedRows[index], value, {
        materials,
        catalogTreatments: isChemicalSection
          ? otherChemicalCatalog
          : otherTreatmentCatalog,
        chemicalMixes,
        isChemicalSection,
        isChemicalMaintenanceEnabled: isChemicalChecked,
      });
      if (nextRow === updatedRows[index] && value) {
        return;
      }
      updatedRows[index] = nextRow;
      setRows(updatedRows);
      return;
    }

    if (field === "date") {
      const updatedRows = [...rows];
      const cur = Array.isArray(updatedRows[index].dates)
        ? updatedRows[index].dates
        : updatedRows[index].date
          ? [updatedRows[index].date]
          : [];
      const next = value && !cur.includes(value) ? [...cur, value] : cur;
      updatedRows[index] = {
        ...updatedRows[index],
        date: value || "",
        dates: next,
      };
      setRows(updatedRows);
      return;
    }

    const updatedRows = [...rows];
    updatedRows[index][field] =
      field === "qty" ? normalizeQuantityInput(value) : value;
    setRows(updatedRows);
  };

  const handleRowChange = makeOtherRowChangeHandler(treatmentRows, setTreatmentRows);
  const handleChemicalRowChange = makeOtherRowChangeHandler(
    chemicalTreatmentRows,
    setChemicalTreatmentRows
  );

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="lg:p-10 p-3">
        <div className="card">
          <div className="card-header bg-[#00613e] text-white">
            <h3 className="card-title mt-1">
              <button
                onClick={() => {
                  navigate(-1);
                }}
              >
                <i className="fa fa-arrow-left mr-2"></i>
              </button>{" "}
              Add New Customer
            </h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="card-body">
              <div className="form-group">
                <label htmlFor="exampleInputEmail1">Customer Name *</label>
                <input
                  type="text"
                  className="form-control"
                  id="exampleInputEmail1"
                  placeholder="Enter Customer Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  name="name"
                  maxLength={100}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="exampleInputEmail1">Customer Email *</label>
                <input
                  type="email"
                  className="form-control"
                  id="exampleInputEmail1"
                  placeholder="Enter Customer Email "
                  value={formData.measure}
                  onChange={handleInputChange}
                  maxLength={100}
                  autoComplete="off"
                  name="measure"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="exampleInputEmail1">Customer Phone *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="Enter Customer Phone"
                  value={formData.cost}
                  onChange={handleInputChange}
                  name="cost"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="exampleInputEmail1">Job Address *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Customer Job Address"
                  value={formData.markUp}
                  onChange={handleInputChange}
                  name="markUp"
                  required
                />
              </div>

              <div className="form-group">
                <div className="flex flex-wrap gap-8 items-start">
                  <div>
                    <label className="font-semibold">Chemical Maintenance</label>
                    <div className="flex items-center gap-6 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="chemicalMaintenance"
                          checked={isChemicalChecked === true}
                          onChange={() => setIsChemicalChecked(true)}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="chemicalMaintenance"
                          checked={isChemicalChecked === false}
                          onChange={() => setIsChemicalChecked(false)}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </div>
                  <div className="min-w-[220px]">
                    <label htmlFor="contractTotal" className="font-semibold">
                      Contract Total
                    </label>
                    <input
                      id="contractTotal"
                      type="number"
                      className="form-control mt-2"
                      placeholder="Enter Contract Total"
                      value={formData.contractTotal}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          contractTotal: e.target.value,
                        }))
                      }
                      onWheel={(e) => e.currentTarget.blur()}
                      min="0"
                      step="any"
                    />
                  </div>
                </div>
              </div>

              <div className="p- space-y-5">

                <table className="w-full border border-gray-300">
                  <thead className="bg-[#00613e] text-white">
                    <tr>
                      <th className="p-2 border">ANNUAL TREATMENT PROGRAM</th>
                      <th className="p-2 border">QUANTITY</th>
                      <th className="p-2 border">SCHEDULE DATE</th>
                      <th className="p-2 border">COST</th>
                      <th className="p-2 border">PRICE</th>
                      <th className="p-2 border">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualCatalogLoading && annualTreatments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="border p-4 text-center text-gray-500">
                          Loading treatments from catalog…
                        </td>
                      </tr>
                    )}
                    {annualTreatments.map((t, i) => (
                      <tr key={i} className="text-center">
                        <td className="border p-2 text-left">{t.name}</td>
                        
                        {/* Quantity - inline input, synced with Date+QTY popup */}
                        <td className="border p-2">
                          <input
                            type="number"
                            value={rowQty[i] || ""}
                            min="0"
                            step="0.01"
                            onChange={(e) =>
                              setRowQty({
                                ...rowQty,
                                [i]: normalizeQuantityInput(e.target.value),
                              })
                            }
                            className="w-full border px-2 py-1 text-center"
                            placeholder="0"
                          />
                        </td>

                        {/* Schedule Date - click opens Date+QTY popup */}
                        <td className="border p-2 relative">
                          <div
                            data-date-qty-trigger
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setOpenDateQtyIndex(openDateQtyIndex === i ? null : i); setOpenDateQtyRow(null); }}
                            onKeyDown={(e) => e.key === "Enter" && setOpenDateQtyIndex(openDateQtyIndex === i ? null : i)}
                            className="flex items-center justify-between border px-2 py-1 cursor-pointer hover:bg-gray-50 min-h-[34px]"
                          >
                            <span className={dates[i] && (Array.isArray(dates[i]) ? dates[i].length > 0 : true) ? "" : "text-gray-500"}>
                              {(() => {
                                const ds = Array.isArray(dates[i]) ? dates[i] : (dates[i] ? [dates[i]] : []);
                                if (ds.length === 0) return "mm/dd/yyyy";
                                const first = ds[0];
                                const firstLabel = new Date(first + "T12:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
                                return ds.length === 1 ? firstLabel : `${firstLabel} (+${ds.length - 1})`;
                              })()}
                            </span>
                            <span className="text-gray-500 ml-1">📅</span>
                          </div>
                          {(() => {
                            const ds = Array.isArray(dates[i]) ? dates[i] : (dates[i] ? [dates[i]] : []);
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
                                        setDates((prev) => {
                                          const cur = Array.isArray(prev[i]) ? prev[i] : (prev[i] ? [prev[i]] : []);
                                          const next = cur.filter((x) => x !== d);
                                          return { ...prev, [i]: next };
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
                          {openDateQtyIndex === i && (
                            <div data-date-qty-popup className="absolute right-0 top-full mt-1 z-50 bg-white border-2 border-[#00613e] rounded shadow-lg p-2">
                              <MiniCalendarWithQty
                                selectedDate={(() => {
                                  const ds = Array.isArray(dates[i]) ? dates[i] : (dates[i] ? [dates[i]] : []);
                                  return ds.length ? ds[ds.length - 1] : "";
                                })()}
                                onDateChange={(v) =>
                                  setDates((prev) => {
                                    const cur = Array.isArray(prev[i]) ? prev[i] : (prev[i] ? [prev[i]] : []);
                                    if (!v) return { ...prev, [i]: cur };
                                    if (cur.includes(v)) return { ...prev, [i]: cur };
                                    return { ...prev, [i]: [...cur, v] };
                                  })
                                }
                                qtyValue={rowQty[i] || ""}
                                onQtyChange={(v) => setRowQty((prev) => ({ ...prev, [i]: normalizeQuantityInput(v) }))}
                                minDate={getTodayDate()}
                                onPastDateError={() => toast.error("Schedule date cannot be in the past", { toastId: SCHEDULE_DATE_PAST_TOAST_ID })}
                              />
                            </div>
                          )}
                        </td>

                        {/* Cost */}
                        <td className="border p-2">
                          <span className="font-medium">
                            ${Number(t.cost ?? 0).toFixed(2)}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="border p-2">
                          <span className="font-medium">
                            $
                            {Number(t.price ?? 0).toFixed(2)}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="border p-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRowQty((prev) => ({ ...prev, [i]: "" }));
                              setDates((prev) => ({ ...prev, [i]: [] }));
                              setOpenDateQtyIndex(null);
                            }}
                            className="text-white bg-red-500 px-2 rounded-full"
                            title="Clear row"
                          >
                            −
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* <div>
                  <h3 className="font-semibold">Other Treatments</h3>
                  <div className="grid grid-cols-4 gap-3 mt-2 items-center">
                    <select className="border p-2">
                      <option>SOD SPRAY #5</option>
                    </select>
                    <input
                      type="number"
                      className="border p-2"
                      defaultValue={5}
                    />
                    <button className="border p-2">
                      <Calendar size={18} />
                    </button>
                  </div>

                  <textarea
                    placeholder="Description"
                    className="border w-full h-32 mt-4 p-2"
                  />
                </div> */}

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
                      <th className="p-2 border">COST</th>
                      <th className="p-2 border">PRICE</th>
                      <th className="p-2 border">ACTION</th>
                    </tr>
                  </thead>

                  <tbody>
                    {treatmentRows.map((row, index) => {
                      const isKeyTakenElsewhere = (key) =>
                        key &&
                        treatmentRows.some(
                          (r, i) => i !== index && getTreatmentRowKey(r) === key
                        );

                      const dropdownOptions = buildMaterialOtherTreatmentDropdownOptions({
                        materials,
                        chemicalMixes,
                        catalogTreatments: otherTreatmentCatalog,
                        isKeyTaken: isKeyTakenElsewhere,
                      });

                      const selectedTreatmentValue = getOtherTreatmentSelectionKey(row);

                      const canAddMoreRows = true;

                      return (
                        <tr key={index}>
                          {/* Treatment */}
                          <td className="border p-2">
                            <select
                              value={selectedTreatmentValue}
                              onChange={(e) =>
                                handleRowChange(
                                  index,
                                  "treatment",
                                  e.target.value,
                                )
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

                        {/* Quantity - inline and synced with Date+QTY popup */}
                        <td className="border p-2">
                          <input
                            type="number"
                            value={row.qty}
                            min="0"
                            step="0.01"
                            onChange={(e) =>
                              handleRowChange(index, "qty", e.target.value)
                            }
                            className="w-full border px-2 py-1"
                          />
                        </td>

                        {/* Schedule Date - click opens Date+QTY popup */}
                        <td className="border p-2 relative">
                          <div
                            data-date-qty-trigger
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setOpenDateQtyRow(openDateQtyRow === index ? null : index); setOpenDateQtyIndex(null); setOpenDateQtyChemicalRow(null); }}
                            onKeyDown={(e) => e.key === "Enter" && setOpenDateQtyRow(openDateQtyRow === index ? null : index)}
                            className="flex items-center justify-between border px-2 py-1 cursor-pointer hover:bg-gray-50 min-h-[34px]"
                          >
                            <span className={(Array.isArray(row.dates) ? row.dates.length > 0 : !!row.date) ? "" : "text-gray-500"}>
                              {(() => {
                                const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
                                if (ds.length === 0) return "mm/dd/yyyy";
                                const first = ds[0];
                                const firstLabel = new Date(first + "T12:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
                                return ds.length === 1 ? firstLabel : `${firstLabel} (+${ds.length - 1})`;
                              })()}
                            </span>
                            <span className="text-gray-500 ml-1">📅</span>
                          </div>
                          {(() => {
                            const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
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
                                        setTreatmentRows((prev) => {
                                          const next = [...prev];
                                          const cur = Array.isArray(next[index].dates) ? next[index].dates : (next[index].date ? [next[index].date] : []);
                                          const filtered = cur.filter((x) => x !== d);
                                          next[index] = { ...next[index], dates: filtered, date: filtered[filtered.length - 1] || "" };
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
                          {openDateQtyRow === index && (
                            <div data-date-qty-popup className="absolute right-0 top-full mt-1 z-50 bg-white border-2 border-[#00613e] rounded shadow-lg p-2">
                              <MiniCalendarWithQty
                                selectedDate={(() => {
                                  const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
                                  return ds.length ? ds[ds.length - 1] : "";
                                })()}
                                onDateChange={(v) => handleRowChange(index, "date", v)}
                                qtyValue={row.qty || ""}
                                onQtyChange={(v) => handleRowChange(index, "qty", v)}
                                minDate={getTodayDate()}
                                onPastDateError={() => toast.error("Schedule date cannot be in the past", { toastId: SCHEDULE_DATE_PAST_TOAST_ID })}
                              />
                            </div>
                          )}
                        </td>

                        {/* Cost */}
                        <td className="border p-2">
                          <input
                            type="number"
                            value={row.cost ?? ""}
                            min="0"
                            step="0.01"
                            onChange={(e) =>
                              handleRowChange(index, "cost", e.target.value)
                            }
                            className="w-full border px-2 py-1"
                            placeholder="0.00"
                          />
                        </td>

                        {/* Price */}
                        <td className="border p-2">
                          <input
                            type="number"
                            value={row.price ?? ""}
                            min="0"
                            step="0.01"
                            onChange={(e) =>
                              handleRowChange(index, "price", e.target.value)
                            }
                            className="w-full border px-2 py-1"
                            placeholder="0.00"
                          />
                        </td>

                        {/* Actions */}
                        <td className="border p-2 align-middle">
                          <div className="flex items-center justify-center gap-2">
                          {treatmentRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-white bg-red-500 px-2 rounded-full leading-none"
                            >
                              −
                            </button>
                          )}

                          {index === treatmentRows.length - 1 &&
                            canAddMoreRows && (
                              <button
                                type="button"
                                onClick={addRow}
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
                      <th className="p-2 border">COST</th>
                      <th className="p-2 border">PRICE</th>
                      <th className="p-2 border">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chemicalTreatmentRows.map((row, index) => {
                      const isKeyTakenElsewhere = (key) =>
                        key &&
                        chemicalTreatmentRows.some(
                          (r, i) => i !== index && getTreatmentRowKey(r) === key
                        );

                      const dropdownOptions = buildChemicalOtherTreatmentDropdownOptions({
                        chemicalMixes,
                        catalogTreatments: otherChemicalCatalog,
                        isChemicalMaintenanceEnabled: isChemicalChecked,
                        isKeyTaken: isKeyTakenElsewhere,
                      });

                      const selectedTreatmentValue = getOtherTreatmentSelectionKey(row);

                      return (
                        <tr key={`chem-${index}`}>
                          <td className="border p-2">
                            <select
                              value={selectedTreatmentValue}
                              onChange={(e) =>
                                handleChemicalRowChange(index, "treatment", e.target.value)
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
                              value={row.qty}
                              min="0"
                              step="0.01"
                              onChange={(e) =>
                                handleChemicalRowChange(index, "qty", e.target.value)
                              }
                              className="w-full border px-2 py-1"
                            />
                          </td>
                          <td className="border p-2 relative">
                            <div
                              data-date-qty-trigger
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDateQtyChemicalRow(
                                  openDateQtyChemicalRow === index ? null : index
                                );
                                setOpenDateQtyRow(null);
                                setOpenDateQtyIndex(null);
                              }}
                              onKeyDown={(e) => e.key === "Enter" && setOpenDateQtyChemicalRow(openDateQtyChemicalRow === index ? null : index)}
                              className="flex items-center justify-between border px-2 py-1 cursor-pointer hover:bg-gray-50 min-h-[34px]"
                            >
                              <span className={(Array.isArray(row.dates) ? row.dates.length > 0 : !!row.date) ? "" : "text-gray-500"}>
                                {(() => {
                                  const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
                                  if (ds.length === 0) return "mm/dd/yyyy";
                                  const first = ds[0];
                                  const firstLabel = new Date(first + "T12:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
                                  return ds.length === 1 ? firstLabel : `${firstLabel} (+${ds.length - 1})`;
                                })()}
                              </span>
                              <span className="text-gray-500 ml-1">📅</span>
                            </div>
                            {(() => {
                              const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
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
                                          setChemicalTreatmentRows((prev) => {
                                            const next = [...prev];
                                            const cur = Array.isArray(next[index].dates) ? next[index].dates : (next[index].date ? [next[index].date] : []);
                                            const filtered = cur.filter((x) => x !== d);
                                            next[index] = { ...next[index], dates: filtered, date: filtered[filtered.length - 1] || "" };
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
                            {openDateQtyChemicalRow === index && (
                              <div data-date-qty-popup className="absolute right-0 top-full mt-1 z-50 bg-white border-2 border-[#00613e] rounded shadow-lg p-2">
                                <MiniCalendarWithQty
                                  selectedDate={(() => {
                                    const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
                                    return ds.length ? ds[ds.length - 1] : "";
                                  })()}
                                  onDateChange={(v) => handleChemicalRowChange(index, "date", v)}
                                  qtyValue={row.qty || ""}
                                  onQtyChange={(v) => handleChemicalRowChange(index, "qty", v)}
                                  minDate={getTodayDate()}
                                  onPastDateError={() => toast.error("Schedule date cannot be in the past", { toastId: SCHEDULE_DATE_PAST_TOAST_ID })}
                                />
                              </div>
                            )}
                          </td>
                          <td className="border p-2">
                            <input
                              type="number"
                              value={row.cost ?? ""}
                              min="0"
                              step="0.01"
                              onChange={(e) =>
                                handleChemicalRowChange(index, "cost", e.target.value)
                              }
                              className="w-full border px-2 py-1"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="border p-2">
                            <input
                              type="number"
                              value={row.price ?? ""}
                              min="0"
                              step="0.01"
                              onChange={(e) =>
                                handleChemicalRowChange(index, "price", e.target.value)
                              }
                              className="w-full border px-2 py-1"
                              placeholder="0.00"
                            />
                          </td>
                          <td className="border p-2 align-middle">
                            <div className="flex items-center justify-center gap-2">
                            {chemicalTreatmentRows.length > 1 && (
                              <button type="button" onClick={() => removeChemicalRow(index)} className="text-white bg-red-500 px-2 rounded-full leading-none">−</button>
                            )}
                            {index === chemicalTreatmentRows.length - 1 && (
                              <button type="button" onClick={addChemicalRow} className="text-white bg-green-500 px-2 rounded-full leading-none">+</button>
                            )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <textarea
                  placeholder="Description (Optional)"
                  className="border w-full h-32 mt-4 p-2"
                />
              </div>
            </div>
            <div className="card-footer">
              <button
                type="submit"
                disabled={disableBtn}
                className="btn bg-[#00613e] text-white"
              >
                {disableBtn ? "Loading..." : "Submit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
