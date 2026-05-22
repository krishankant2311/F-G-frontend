import React, { useState, useEffect } from "react";

export default function EditChemical({ show, onClose, data, onSave }) {
  const [formData, setFormData] = useState({
    customerName: "",
    jobName: "",
    billingType: "",
    quantity: "",
    status: "Active",
    isTaxable: true,
  });

  useEffect(() => {
    if (data) {
      setFormData(data);
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded w-[400px]">
        <h3 className="text-lg font-bold mb-4">Edit Chemical</h3>

        <input
          type="text"
          name="customerName"
          value={formData.customerName}
          onChange={handleChange}
          placeholder="Chemical Name"
          className="border p-2 mb-2 w-full"
        />

        <input
          type="text"
          name="jobName"
          value={formData.jobName}
          onChange={handleChange}
          placeholder="Measure"
          className="border p-2 mb-2 w-full"
        />

        <input
          type="text"
          name="billingType"
          value={formData.billingType}
          onChange={handleChange}
          placeholder="Price"
          className="border p-2 mb-2 w-full"
        />

        <input
          type="text"
          name="quantity"
          value={formData.quantity}
          onChange={handleChange}
          placeholder="Cost"
          className="border p-2 mb-2 w-full"
        />

        <div className="mb-2">
          <label>
            <input
              type="checkbox"
              name="isTaxable"
              checked={formData.isTaxable}
              onChange={handleChange}
              className="mr-2"
            />
            Taxable
          </label>
        </div>

        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          className="border p-2 mb-4 w-full"
        >
          <option value="Active">Not Started</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>

        <div className="flex justify-end gap-2">
          <button
            className="bg-gray-300 px-4 py-2 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
