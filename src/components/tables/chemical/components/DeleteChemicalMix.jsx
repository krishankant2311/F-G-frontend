import React from "react";

const DeleteChemicalMix = ({
  mixName,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[400px] rounded shadow-lg">
        {/* HEADER */}
        {/* <div className="p-4 border-b">
          <h3 className="text-lg font-semibold text-red-600">
            Delete Chemical Mix
          </h3>
        </div> */}
          <div className="flex justify-between items-center p-3 border-b bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">Delete Chemical Mix</h3>
          <button onClick={onClose}>✕</button>
        </div>

        {/* BODY */}
        <div className="p-4">
          <p className="text-gray-700">
            Are you sure you want to delete
            <span className="font-semibold text-black">
              {" "}
              {mixName}
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
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className={`px-4 py-2 bg-red-600 text-white rounded ${
              isDeleting ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteChemicalMix;
