import React from "react";

const ViewTreatmentDetails = ({ show, onClose, data, customer }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 mt-10">
      <div className="bg-white w-[520px] border ">

        {/* TITLE */}
        <h2 className="text-center text-lg font-semibold text-white mb-6 bg-[#00613e] p-4">
          Customer Treatment Details
        </h2>

        {/* FORM */}
        <div className="space-y-4 p-6">

          <Field label="Customer Name" value={(data?.customerName || customer?.customerName) || "-"} />
          <Field label="Service / Treatment Type" value={data?.treatment} />
          <Field label="Scheduled Service Date" value={data?.scheduledDate} />
          <Field label="Status" value={data?.status} />
          <Field label="Project Code" value={data?.projectCode} />

          {/* DESCRIPTION */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              className="w-full border px-3 py-2 resize-none"
              rows={4}
              value={data?.description ?? customer?.description ?? ""}
              disabled
            />
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex justify-center mt-2 p-6">
          <button
            className="bg-[#00613e] text-white px-6 py-2"
            onClick={onClose}
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};

const Field = ({ label, value }) => (
  <div className="grid grid-cols-2 items-center gap-3">
    <label className="text-sm font-medium">{label}</label>
    <input
      type="text"
      value={value || "-"}
      disabled
      className="border px-3 py-1 bg-gray-50"
    />
  </div>
);

export default ViewTreatmentDetails;
