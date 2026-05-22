import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";

const DASHBOARD_EDIT_TOAST_ID = "dashboard-edit-treatment-toast";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const normalizeQuantityStr = (val) => {
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

const EditCustomer = ({ show, onClose, data, onSuccess, projectId, projectType, projectStatus }) => {
  const [scheduledDate, setScheduledDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateLockRef = useRef(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef(null);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Convert display date ("2 Jan 2026") to ISO date string ("2026-01-02") for date input
  const parseDisplayDate = (displayDate) => {
    if (!displayDate || displayDate === "-") return "";
    try {
      const parts = displayDate.trim().split(" ");
      if (parts.length !== 3) return "";
      const day = parseInt(parts[0], 10);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames.indexOf(parts[1]);
      const year = parseInt(parts[2], 10);
      if (month === -1 || isNaN(day) || isNaN(year)) return "";
      const date = new Date(year, month, day);
      return date.toISOString().split("T")[0];
    } catch (e) {
      return "";
    }
  };

  // Derive unit price from initial data for recalculation when quantity changes
  const baseQtyForUnit = toWholeQuantity(data?.quantity);
  const unitPrice = baseQtyForUnit > 0 && data?.price != null
    ? Number(data.price) / baseQtyForUnit
    : 100;

  useEffect(() => {
    if (show && data) {
      // Set initial values from data
      setScheduledDate(parseDisplayDate(data.scheduledDate) || (data.scheduledDateRaw ? new Date(data.scheduledDateRaw).toISOString().split("T")[0] : ""));
      setQuantity(
        data.quantity != null && data.quantity !== "" ? String(toWholeQuantity(data.quantity)) : ""
      );
      setPrice(data.price ?? "");
      setProjectCode(data.projectCode ?? "");
    }
  }, [show, data]);

  const handleUpdate = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!data?._id) {
      onSuccess?.();
      onClose();
      return;
    }
    if (isSubmitting || updateLockRef.current) return;
    updateLockRef.current = true;

    // Validate: Scheduled date format must be valid (YYYY-MM-DD)
    // For Completed treatments, past date is allowed; for others, date cannot be in the past
    if (scheduledDate) {
      const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(scheduledDate);
      const selectedDate = new Date(scheduledDate);

      if (!isValidFormat || isNaN(selectedDate.getTime())) {
        toast.error("Please select a valid Scheduled Date.", {
          toastId: DASHBOARD_EDIT_TOAST_ID,
        });
        updateLockRef.current = false;
        return;
      }

      const isCompleted = data?.status === "Completed";
      if (!isCompleted) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          toast.error("Scheduled date cannot be in the past. Please select today's date or a future date.", {
            toastId: DASHBOARD_EDIT_TOAST_ID,
          });
          updateLockRef.current = false;
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Recalculate price from quantity * unitPrice so backend saves correct total
      const qtyNum = toWholeQuantity(quantity);
      const recalculatedPrice = qtyNum * unitPrice;
      if (onSuccess) {
        await onSuccess({
          ...data,
          scheduledDate: scheduledDate,
          quantity: String(qtyNum),
          price: recalculatedPrice,
          projectCode: projectCode !== undefined && projectCode !== null ? String(projectCode).trim() : (data?.projectCode ?? ""),
        });
      }
      onClose();
    } finally {
      updateLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  const todayStr = getTodayDate();
  const minDateObj = data?.status !== "Completed" ? new Date(todayStr + "T12:00:00") : null;

  const getDaysInMonth = (year, month) => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startDay = first.getDay();
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  };

  const prevMonth = () => setViewDate((prev) => (prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }));
  const nextMonth = () => setViewDate((prev) => (prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }));

  const handleCalendarDateClick = (day) => {
    if (!day) return;
    const dateStr = `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (minDateObj) {
      const clicked = new Date(dateStr + "T12:00:00");
      if (clicked < minDateObj) {
        toast.error("Scheduled date cannot be in the past.", { toastId: DASHBOARD_EDIT_TOAST_ID });
        return;
      }
    }
    setScheduledDate(dateStr);
  };

  useEffect(() => {
    if (show && scheduledDate) {
      const d = new Date(scheduledDate + "T12:00:00");
      if (!isNaN(d.getTime())) setViewDate({ year: d.getFullYear(), month: d.getMonth() });
    }
  }, [show, scheduledDate]);

  useEffect(() => {
    if (!calendarOpen) return;
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target) && !e.target.closest("[data-edit-calendar-trigger]")) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [calendarOpen]);

  const days = getDaysInMonth(viewDate.year, viewDate.month);
  const selectedDay = scheduledDate ? parseInt(scheduledDate.split("-")[2], 10) : null;
  const selectedMonth = scheduledDate ? parseInt(scheduledDate.split("-")[1], 10) - 1 : null;
  const selectedYear = scheduledDate ? parseInt(scheduledDate.split("-")[0], 10) : null;

  const displayDateStr = scheduledDate
    ? new Date(scheduledDate + "T12:00:00").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
    : "";

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="modal fade show d-block" tabIndex="-1">
        <div className="modal-dialog modal-dialog-centered text-black">
          <div className="modal-content">
            <div className="modal-header bg-[#00613e] text-white border-b border-[#00613e]">
              <h5 className="modal-title text-white font-semibold">Edit Treatment</h5>
              <button
                type="button"
                className="close text-white opacity-100 hover:opacity-80"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group mb-3">
                <label>Treatment</label>
                <input
                  type="text"
                  className="form-control"
                  value={data?.treatment || ""}
                  readOnly
                  disabled
                />
              </div>

              <div className="form-group mb-3 position-relative">
                <label>Scheduled Date</label>
                <div
                  data-edit-calendar-trigger
                  onClick={() => setCalendarOpen(!calendarOpen)}
                  className="form-control d-flex align-items-center justify-content-between cursor-pointer"
                  style={{ cursor: "pointer" }}
                >
                  <span className={displayDateStr ? "" : "text-muted"}>{displayDateStr || "mm/dd/yyyy"}</span>
                  <span className="text-dark">📅</span>
                </div>
                {calendarOpen && (
                  <div
                    ref={calendarRef}
                    className="position-absolute end-0 z-50 bg-white border-2 border-[#00613e] rounded shadow-lg p-2"
                    style={{ minWidth: "200px", top: "100%", marginTop: "0.25rem" }}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-1 border-bottom pb-1">
                      <button type="button" onClick={prevMonth} className="text-[#00613e] font-bold px-0 border-0 bg-transparent" style={{ fontSize: "0.75rem" }}>&lt;</button>
                      <span className="font-semibold" style={{ fontSize: "0.75rem" }}>{MONTH_NAMES[viewDate.month]} {viewDate.year}</span>
                      <button type="button" onClick={nextMonth} className="text-[#00613e] font-bold px-0 border-0 bg-transparent" style={{ fontSize: "0.75rem" }}>&gt;</button>
                    </div>
                    <div className="text-center mb-1" style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", fontSize: "0.65rem" }}>
                      {DAY_NAMES.map((d) => (
                        <div key={d} className="font-medium text-secondary py-0">{d}</div>
                      ))}
                      {days.map((day, idx) => {
                        const isSelected = day && selectedDay === day && selectedMonth === viewDate.month && selectedYear === viewDate.year;
                        const dateStr = day ? `${viewDate.year}-${String(viewDate.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                        const isPast = day && minDateObj && new Date(dateStr + "T12:00:00") < minDateObj;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleCalendarDateClick(day)}
                            disabled={!day || isPast}
                            className={`py-1 rounded border-0 ${!day ? "invisible" : isPast ? "text-gray-300 cursor-not-allowed bg-transparent" : isSelected ? "bg-[#00613e] text-white" : "hover:bg-gray-200 bg-transparent"}`}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {day || ""}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 pt-2 border-top">
                      <label className="d-block fw-bold mb-0" style={{ fontSize: "0.7rem" }}>QTY</label>
                      <input
                        type="number"
                        value={quantity}
                        min="0"
                        step="1"
                        onChange={(e) => {
                          const val = normalizeQuantityStr(e.target.value);
                          setQuantity(val);
                          setPrice(String((toWholeQuantity(val) * unitPrice).toFixed(2)));
                        }}
                        className="form-control form-control-sm text-center py-1"
                        placeholder="0"
                        style={{ fontSize: "0.75rem" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group mb-3">
                <label>Quantity</label>
                <input
                  type="number"
                  className="form-control"
                  value={quantity}
                  onChange={(e) => {
                    const val = normalizeQuantityStr(e.target.value);
                    setQuantity(val);
                    setPrice(String((toWholeQuantity(val) * unitPrice).toFixed(2)));
                  }}
                  min="0"
                  step="1"
                />
              </div>

              <div className="form-group mb-3">
                <label>Price</label>
                <input
                  type="number"
                  className="form-control"
                  value={price}
                  readOnly
                  disabled
                  style={{ backgroundColor: "#e9ecef", cursor: "not-allowed" }}
                />
              </div>

              <div className="form-group mb-3">
                <label>ADD PROJECT CODE *</label>
                <input
                  type="text"
                  className="form-control"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="Enter project code"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="button" className="btn bg-[#00613e] text-white border-0 hover:opacity-90" onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCustomer;
