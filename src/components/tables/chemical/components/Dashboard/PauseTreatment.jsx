// components/Dashboard/PauseTreatment.jsx
import React from "react";

const PauseTreatment = ({ show, onClose, onConfirm, data, isLoading = false }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[420px] rounded shadow-lg">
        {/* HEADER */}
        <div className="flex justify-between items-center p-3 border-b bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">Pause Treatment</h3>
          <button onClick={onClose} disabled={isLoading}>✕</button>
        </div>

        {/* BODY */}
        <div className="p-4">
          <p>
            Pause treatment for
            <span className="font-semibold"> {data?.customerName}</span>?
          </p>

          <p className="mt-1 text-sm text-gray-600">
            Treatment: <b>{data?.treatment}</b>
          </p>

          <p className="mt-2 text-sm text-gray-500">
            You can resume this treatment later from the dashboard.
          </p>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 border rounded" disabled={isLoading}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-[#00613e] text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Pausing..." : "Pause"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PauseTreatment;