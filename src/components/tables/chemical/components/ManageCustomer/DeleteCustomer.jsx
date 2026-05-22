import React from "react";

const DeleteCustomerModal = ({ show, onClose, onConfirm, customer, isLoading = false }) => {
  if (!show || !customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg  w-[400px]">
        <div className="flex justify-between items-center p-3 border-b bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">Delete Customer</h3>
          <button onClick={onClose} disabled={isLoading}>✕</button>
        </div>
        {/* <h3 className="text-lg font-bold mb-3 text-red-600">Delete Customer</h3> */}
        <div className="p-4">
          <p className="mb-4">
            Are you sure you want to delete <b>{customer.customerName}</b>?
          </p>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-1 border rounded" disabled={isLoading}>
              Cancel
            </button>

            <button
              onClick={() => onConfirm(customer._id)}
              disabled={isLoading}
              className="px-4 py-1 bg-red-600 text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteCustomerModal;
