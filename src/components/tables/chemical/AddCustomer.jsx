import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";
import {
  DEFAULT_ANNUAL_TREATMENTS,
  mapApiTreatmentToAnnualRow,
} from "../../../utils/otherTreatmentDefaults";
import { getCustomLocalTreatments } from "../../../utils/otherTreatmentLocalStore";
import {
  buildOtherTreatmentDropdownOptions,
  CATALOG_OPTION_PREFIX,
  fetchActiveMaterials,
  getOtherTreatmentSelectionKey,
  MATERIAL_OPTION_PREFIX,
  resolveMaterialUnitCost,
  resolveMaterialUnitPrice,
} from "../../../utils/otherTreatmentDropdown";

const ADD_CUSTOMER_ERROR_TOAST_ID = "add-customer-error";
const ADD_CUSTOMER_SUCCESS_TOAST_ID = "add-customer-success";
const SCHEDULE_DATE_PAST_TOAST_ID = "schedule-date-past";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeQuantityInput = (val) => {
  if (val === "" || val == null) return "";
  const n = Number(val);
  if (!Number.isFinite(n)) return "";
  return String(Math.max(0, Math.floor(n)));
};

const toWholeQuantity = (val) => {
  if (val === "" || val == null) return 0;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
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

const INITIAL_TREATMENT_ROW = {
  treatment: "",
  qty: 0,
  date: "",
  dates: [],
  mixData: null,
  catalogData: null,
  materialData: null,
  treatmentName: "",
  price: "",
  cost: "",
};

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
          step="1"
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

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [treatmentRows, setTreatmentRows] = useState([{ ...INITIAL_TREATMENT_ROW }]);

  const [chemicalMixes, setChemicalMixes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [annualTreatments, setAnnualTreatments] = useState(DEFAULT_ANNUAL_TREATMENTS);
  const [catalogTreatments, setCatalogTreatments] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();

  const { tableSize } = useTableContext();

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

      if (res.data.statusCode !== 200) return;

      const items = res.data.result?.treatments || [];
      const annual = items
        .filter((t) => t.programType === "annual_program")
        .map(mapApiTreatmentToAnnualRow);
      const localOther = getCustomLocalTreatments().filter(
        (t) => t.programType === "other"
      );
      const apiCatalog = items.filter((t) => t.programType === "other");
      const seen = new Set(
        apiCatalog.map((t) => String(t.treatmentName).trim().toUpperCase())
      );
      const catalog = [
        ...apiCatalog,
        ...localOther.filter(
          (t) => !seen.has(String(t.treatmentName).trim().toUpperCase())
        ),
      ];

      if (annual.length > 0) {
        setAnnualTreatments(annual);
      }
      setCatalogTreatments(catalog);
    } catch (error) {
      console.error("Failed to load treatment catalog:", error);
      setCatalogTreatments(
        getCustomLocalTreatments().filter((t) => t.programType === "other")
      );
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

      // Validate OTHER TREATMENTS - check if any row has treatment selected but date is missing
      const incompleteOtherTreatments = treatmentRows.filter((row) => {
        const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
        // Check for "Other" entries
        if (row.treatment === "Other") {
          // If treatmentName is filled but date is missing
          return (
            row.treatmentName &&
            row.treatmentName.trim() !== "" &&
            ds.length === 0
          );
        }
        // Check for mix selections
        if (row.treatment && row.treatment !== "" && row.treatment !== "Other") {
          // If treatment is selected but date is missing
          return ds.length === 0;
        }
        return false;
      });

      if (incompleteOtherTreatments.length > 0) {
        toast.error(
          "Please fill Scheduled Date for all selected treatments in OTHER TREATMENTS section",
          {
            toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
          },
        );
        setDisableBtn(false);
        return;
      }

      // Validate OTHER TREATMENTS - quantity should be > 0 when treatment or date is provided
      const otherTreatmentsMissingQty = treatmentRows.filter((row) => {
        const hasTreatmentName =
          (row.treatment && row.treatment !== "" && row.treatment !== "Other") ||
          (row.treatment === "Other" &&
            row.treatmentName &&
            row.treatmentName.trim() !== "");
        const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
        const hasDate = ds.length > 0;
        const qty = toWholeQuantity(row.qty || 0);
        // If user has selected a treatment or entered a name/date, quantity should be > 0
        return (hasTreatmentName || hasDate) && qty <= 0;
      });

      if (otherTreatmentsMissingQty.length > 0) {
        toast.error(
          "Please enter Quantity for all OTHER TREATMENTS rows where Treatment or Scheduled Date is filled",
          {
            toastId: ADD_CUSTOMER_ERROR_TOAST_ID,
          },
        );
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

      // Build other treatments payload from bottom table with full mix data
      // Remove duplicates: same treatment name = keep only one (prefer one with date/qty)
      // For "Other" entries, allow multiple entries with different treatmentName values
      const uniqueTreatmentRows = treatmentRows.filter((row, index, self) => {
        if (!row.treatment) return false;
        
        // For "Other" entries, allow multiple if they have different treatmentName
        if (row.treatment === "Other") {
          // Keep all "Other" entries (they can have different names)
          return true;
        }
        
        const rowKey = row.materialData?._id
          ? `material:${row.materialData._id}`
          : row.catalogData?._id
            ? `catalog:${row.catalogData._id}`
            : row.mixData?._id
              ? `mix:${row.mixData._id}`
              : `name:${row.treatment}`;
        const firstIndex = self.findIndex((r) => {
          const k = r.materialData?._id
            ? `material:${r.materialData._id}`
            : r.catalogData?._id
              ? `catalog:${r.catalogData._id}`
              : r.mixData?._id
                ? `mix:${r.mixData._id}`
                : `name:${r.treatment}`;
          return k === rowKey && r.treatment !== "Other";
        });
        return index === firstIndex;
      });

      const otherTreatments = uniqueTreatmentRows
        .filter((row) => {
          const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
          // For "Other", check if treatmentName is provided
          if (row.treatment === "Other") {
            return row.treatmentName && row.treatmentName.trim() !== "" && ds.length > 0;
          }
          // For mix selections, check if treatment is provided
          return row.treatment && ds.length > 0;
        })
        .flatMap((row) => {
          const ds = Array.isArray(row.dates) ? row.dates : (row.date ? [row.date] : []);
          const uniqDates = Array.from(new Set(ds.filter(Boolean)));

          // If "Other" is selected, use treatmentName as treatment value
          if (row.treatment === "Other") {
            return uniqDates.map((d) => ({
              treatment: row.treatmentName.trim(), // Use custom name as treatment
              qty: toWholeQuantity(row.qty || 0),
              date: d,
              status: "Scheduled",
              totalPricePerTank: Number(row.price || 0),
              totalCostPerTank: Number(row.cost || 0),
            }));
          }

          // Include full mix data if available (when a mix is selected)
          const baseData = {
            treatment: row.treatment,
            qty: toWholeQuantity(row.qty || 0),
            status: "Scheduled",
          };

          if (row.catalogData) {
            const pricePerTank = isChemicalChecked
              ? (row.catalogData.lowerPrice ?? row.catalogData.price ?? 0)
              : (row.catalogData.price ?? 0);
            return uniqDates.map((d) => ({
              ...baseData,
              date: d,
              treatment: row.catalogData.treatmentName,
              totalCostPerTank: row.catalogData.cost || 0,
              totalPricePerTank: pricePerTank,
              treatmentCatalogId: row.catalogData._id,
            }));
          }

          if (row.materialData) {
            const unitCost = resolveMaterialUnitCost(row.materialData);
            const pricePerTank = resolveMaterialUnitPrice(
              row.materialData,
              isChemicalChecked
            );
            return uniqDates.map((d) => ({
              ...baseData,
              date: d,
              treatment: row.materialData.name,
              totalCostPerTank: unitCost,
              totalPricePerTank: pricePerTank,
              materialId: row.materialData._id,
            }));
          }

          if (row.mixData) {
            const pricePerTank = isChemicalChecked
              ? (row.mixData.totalCostPerTank ?? 0)
              : (row.mixData.totalPricePerTank ?? 0);
            return uniqDates.map((d) => ({
              ...baseData,
              date: d,
              mixName: row.mixData.mixName,
              chemicals: row.mixData.chemicals || [],
              totalCostPerTank: row.mixData.totalCostPerTank || 0,
              totalPricePerTank: pricePerTank,
              mixId: row.mixData._id,
            }));
          }

          return uniqDates.map((d) => ({ ...baseData, date: d }));
        });

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
        setTreatmentRows([{ ...INITIAL_TREATMENT_ROW }]);
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
    setTreatmentRows((prev) => [
      ...prev,
      {
        treatment: "",
        qty: 0,
        date: "",
        dates: [],
        mixData: null,
        catalogData: null,
        materialData: null,
        treatmentName: "", // Custom name for "Other" option
        price: "", // For "Other" option
        cost: "", // For "Other" option
      },
    ]);
  };
  const removeRow = (index) => {
    setTreatmentRows((prev) => prev.filter((_, i) => i !== index));
  };
  const getTreatmentRowKey = getOtherTreatmentSelectionKey;

  const handleRowChange = (index, field, value) => {
    if (field === "treatment" && value) {
      if (value !== "Other") {
        const isDuplicate = treatmentRows.some(
          (row, i) => i !== index && getTreatmentRowKey(row) === value
        );

        if (isDuplicate) {
          toast.error(
            "This treatment is already selected. Please choose a different treatment."
          );
          return;
        }
      }

      const updatedRows = [...treatmentRows];
      const baseReset = {
        date: "",
        dates: [],
        treatmentName: value === "Other" ? updatedRows[index].treatmentName : "",
      };

      if (value.startsWith(MATERIAL_OPTION_PREFIX)) {
        const materialId = value.slice(MATERIAL_OPTION_PREFIX.length);
        const materialItem = materials.find((m) => m._id === materialId);
        updatedRows[index] = {
          ...updatedRows[index],
          ...baseReset,
          treatment: materialItem?.name || "",
          mixData: null,
          catalogData: null,
          materialData: materialItem || null,
          price: materialItem
            ? resolveMaterialUnitPrice(materialItem, isChemicalChecked)
            : "",
          cost: materialItem ? resolveMaterialUnitCost(materialItem) : "",
        };
      } else if (value.startsWith(CATALOG_OPTION_PREFIX)) {
        const catalogId = value.slice(CATALOG_OPTION_PREFIX.length);
        const catalogItem = catalogTreatments.find((c) => c._id === catalogId);
        updatedRows[index] = {
          ...updatedRows[index],
          ...baseReset,
          treatment: catalogItem?.treatmentName || "",
          mixData: null,
          catalogData: catalogItem || null,
          materialData: null,
          price: catalogItem
            ? isChemicalChecked
              ? catalogItem.lowerPrice ?? catalogItem.price ?? ""
              : catalogItem.price ?? ""
            : "",
          cost: catalogItem?.cost ?? "",
        };
      } else if (value === "Other") {
        updatedRows[index] = {
          ...updatedRows[index],
          ...baseReset,
          treatment: "Other",
          mixData: null,
          catalogData: null,
          materialData: null,
        };
      } else {
        const selectedMix = chemicalMixes.find((mix) => mix.mixName === value);
        updatedRows[index] = {
          ...updatedRows[index],
          ...baseReset,
          treatment: value,
          mixData: selectedMix || null,
          catalogData: null,
          materialData: null,
          price: selectedMix ? selectedMix.totalPricePerTank ?? "" : "",
          cost: selectedMix ? selectedMix.totalCostPerTank ?? "" : "",
        };
      }

      setTreatmentRows(updatedRows);
      return;
    }

    if (field === "date") {
      const updatedRows = [...treatmentRows];
      const cur = Array.isArray(updatedRows[index].dates)
        ? updatedRows[index].dates
        : (updatedRows[index].date ? [updatedRows[index].date] : []);
      const next = value && !cur.includes(value) ? [...cur, value] : cur;
      updatedRows[index] = {
        ...updatedRows[index],
        date: value || "",
        dates: next,
      };
      setTreatmentRows(updatedRows);
      return;
    }

    const updatedRows = [...treatmentRows];
    updatedRows[index][field] =
      field === "qty" ? normalizeQuantityInput(value) : value;
    setTreatmentRows(updatedRows);
  };

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
                      <th className="p-2 border">PRICE</th>
                      <th className="p-2 border">COST</th>
                      <th className="p-2 border">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {annualTreatments.map((t, i) => (
                      <tr key={i} className="text-center">
                        <td className="border p-2 text-left">{t.name}</td>
                        
                        {/* Quantity - inline input, synced with Date+QTY popup */}
                        <td className="border p-2">
                          <input
                            type="number"
                            value={rowQty[i] || ""}
                            min="0"
                            step="1"
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

                        {/* Price */}
                        <td className="border p-2">
                          <span className="font-medium">
                            $
                            {Number(isChemicalChecked ? (t.lowerPrice ?? t.price ?? 0) : (t.price ?? 0)).toFixed(2)}
                          </span>
                        </td>

                        {/* Cost */}
                        <td className="border p-2">
                          <span className="font-medium">
                            ${Number(t.cost ?? 0).toFixed(2)}
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

                <h2 className="font-semibold text-lg">OTHER TREATMENTS</h2>

                <table className="w-full border ">
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
                    {treatmentRows.map((row, index) => {
                      const isKeyTakenElsewhere = (key) =>
                        key &&
                        treatmentRows.some(
                          (r, i) => i !== index && getTreatmentRowKey(r) === key
                        );

                      const dropdownOptions = buildOtherTreatmentDropdownOptions({
                        chemicalMixes,
                        materials,
                        isKeyTaken: isKeyTakenElsewhere,
                      });

                      const selectedTreatmentValue = getOtherTreatmentSelectionKey(row);

                      const canAddMoreRows = true;

                      return (
                        <tr key={index}>
                          {/* Treatment */}
                          <td>
                            {row.treatment === "Other" ? (
                              <input
                                type="text"
                                value={row.treatmentName || ""}
                                onChange={(e) =>
                                  handleRowChange(index, "treatmentName", e.target.value)
                                }
                                className="w-full border px-2 py-1"
                                placeholder="Enter Treatment Name"
                              />
                            ) : (
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
                                <option value="Other">Other</option>
                              </select>
                            )}
                          </td>

                        {/* Quantity - inline and synced with Date+QTY popup */}
                        <td>
                          <input
                            type="number"
                            value={row.qty}
                            min="0"
                            step="1"
                            onChange={(e) =>
                              handleRowChange(index, "qty", e.target.value)
                            }
                            className="w-full border px-2 py-1"
                          />
                        </td>

                        {/* Schedule Date - click opens Date+QTY popup */}
                        <td className="relative">
                          <div
                            data-date-qty-trigger
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); setOpenDateQtyRow(openDateQtyRow === index ? null : index); setOpenDateQtyIndex(null); }}
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

                        {/* Price - Yes = lower price, No = higher price */}
                        <td>
                          {row.treatment === "Other" ? (
                            <input
                              type="number"
                              value={row.price || ""}
                              min="0"
                              step="0.01"
                              onChange={(e) =>
                                handleRowChange(index, "price", e.target.value)
                              }
                              className="w-full border px-2 py-1"
                              placeholder="0.00"
                            />
                          ) : row.materialData != null ? (
                            <span className="font-medium">
                              ${Number(
                                resolveMaterialUnitPrice(
                                  row.materialData,
                                  isChemicalChecked
                                )
                              ).toFixed(2)}
                            </span>
                          ) : row.catalogData != null ? (
                            <span className="font-medium">
                              ${Number(
                                isChemicalChecked
                                  ? (row.catalogData.lowerPrice ??
                                      row.catalogData.price ??
                                      0)
                                  : (row.catalogData.price ?? 0)
                              ).toFixed(2)}
                            </span>
                          ) : row.mixData != null ? (
                            <span className="font-medium">
                              ${Number(
                                isChemicalChecked
                                  ? (row.mixData.totalCostPerTank ?? 0)
                                  : (row.mixData.totalPricePerTank ?? 0)
                              ).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Cost - editable for "Other", from catalog or mix when selected */}
                        <td>
                          {row.treatment === "Other" ? (
                            <input
                              type="number"
                              value={row.cost || ""}
                              min="0"
                              step="0.01"
                              onChange={(e) =>
                                handleRowChange(index, "cost", e.target.value)
                              }
                              className="w-full border px-2 py-1"
                              placeholder="0.00"
                            />
                          ) : row.materialData != null ? (
                            <span className="font-medium">
                              ${Number(
                                resolveMaterialUnitCost(row.materialData)
                              ).toFixed(2)}
                            </span>
                          ) : row.catalogData != null ? (
                            <span className="font-medium">
                              ${Number(row.catalogData.cost ?? row.cost ?? 0).toFixed(2)}
                            </span>
                          ) : row.mixData != null ? (
                            <span className="font-medium">
                              ${Number(row.mixData.totalCostPerTank ?? row.cost ?? 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="flex gap-2 pl-2">
                          {/* Minus */}
                          {treatmentRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(index)}
                              className="text-white bg-red-500 px-2 rounded-full"
                            >
                              −
                            </button>
                          )}

                          {/* Plus (sirf last row pe aur jab unselected treatments available hon ya "Other" add karna ho) */}
                          {index === treatmentRows.length - 1 &&
                            canAddMoreRows && (
                              <button
                                type="button"
                                onClick={addRow}
                                className="text-white bg-green-500 px-2 rounded-full"
                              >
                                +
                              </button>
                            )}
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
