import React, { useState, useEffect } from "react";

const ResumeTreatment = ({ show, onClose, onConfirm, data, isLoading = false }) => {
  const [newDate, setNewDate] = useState("");

  useEffect(() => {
    if (show) {
      // Default to today's date
      const today = new Date().toISOString().split("T")[0];
      setNewDate(today);
    }
  }, [show]);

  if (!show) return null;

  const handleConfirm = () => {
    onConfirm(newDate);
  };

  const actionLabel = data?.status === "Scheduled" ? "Start" : "Resume";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[420px] rounded shadow-lg">
        {/* HEADER */}
        <div className="flex justify-between items-center p-3 border-b bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">
            {data?.status === "Scheduled"
              ? "Start Treatment"
              : data?.status === "Overdue"
              ? "Resume Treatment with New Date"
              : "Resume Treatment"}
          </h3>

          <button onClick={onClose} disabled={isLoading}>✕</button>
        </div>

        {/* BODY */}
        <div className="p-4">
          <p>
            {data?.status === "Overdue" ? "Resume" : "Start"} treatment for
            <span className="font-semibold"> {data?.customerName}</span>?
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Treatment: <b>{data?.treatment}</b>
          </p>

          {/* NEW DATE PICKER - Only for Overdue */}
          {data?.status === "Overdue" && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Scheduled Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#00613e]"
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded" disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || (data?.status === "Overdue" && !newDate)}
            className="px-4 py-2 bg-[#00613e] text-white rounded hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (data?.status === "Scheduled" ? "Starting..." : "Resuming...") : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeTreatment;