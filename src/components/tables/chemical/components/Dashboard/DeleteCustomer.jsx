import React from "react";

const DeleteCustomer = ({ show, onClose, onConfirm, data, isLoading = false }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[420px] rounded shadow-lg">

        {/* HEADER */}
        <div className="flex justify-between items-center p-3 border-b bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">Delete Customer Treatment</h3>
          <button onClick={onClose} disabled={isLoading}>✕</button>
        </div>

        {/* BODY */}
        <div className="p-4">
          <p className="text-gray-700">
            Are you sure you want to delete
            <span className="font-semibold text-black">
              {" "}
              {data?.customerName} – {data?.treatment}
            </span>
            ?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone.
          </p>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(data)}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Deleting..." : "Delete"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default DeleteCustomer;
