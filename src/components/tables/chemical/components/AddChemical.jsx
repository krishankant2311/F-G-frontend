import React, { useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const ADD_CHEMICAL_TOAST_ID = "add-chemical-error";

const MEASURE_OPTIONS = ["FT", "SACK", "UNIT"];

// BUG_068: Do not allow special characters like #$&*()!{}[]-
const SPECIAL_CHARS_REGEX = /[#$&*()!{}\[\]\-]/g;
const hasSpecialChars = (val) =>
  val != null && typeof val === "string" && /[#$&*()!{}\[\]\-]/.test(val);
const stripSpecialChars = (val) =>
  typeof val === "string" ? val.replace(SPECIAL_CHARS_REGEX, "") : val;

const REQUIRED_FIELDS = [
  { key: "chemicalName", label: "Chemical Name" },
  { key: "measure", label: "Measure" },
  { key: "brandName", label: "Brand Name" },
  { key: "type", label: "Type" },
  { key: "cost", label: "Cost" },
  { key: "price", label: "Price" },
];

const AddChemical = ({ show, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    chemicalName: "",
    measure: "",
    brandName: "",
    type: "",
    cost: "",
    price: "",
    isTaxable: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const submitLockRef = useRef(false);
  if (!show) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;
    if (type !== "checkbox" && ["chemicalName", "brandName", "type"].includes(name)) {
      finalValue = stripSpecialChars(finalValue);
    }
    setFormData({
      ...formData,
      [name]: finalValue,
    });
  };

  const validate = () => {
    const missing = [];
    for (const f of REQUIRED_FIELDS) {
      const val = formData[f.key];
      if (typeof val === "string" && val.trim() === "") missing.push(f.label);
    }

    if (hasSpecialChars(formData.chemicalName) || hasSpecialChars(formData.brandName) || hasSpecialChars(formData.type)) {
      toast.error("Please do not use special characters like # $ & * ( ) ! { } [ ] - in Chemical Name, Brand Name or Type.");
      return { missing, invalidNumbers: [], costNum: NaN, priceNum: NaN, specialChars: true };
    }

    // Ensure numeric fields are valid numbers (and not empty -> Number("") === 0)
    const costNum = Number.parseFloat(String(formData.cost).trim());
    const priceNum = Number.parseFloat(String(formData.price).trim());
    const invalidNumbers = [];
    if (!Number.isFinite(costNum)) invalidNumbers.push("Cost");
    if (!Number.isFinite(priceNum)) invalidNumbers.push("Price");

    return { missing, invalidNumbers, costNum, priceNum, specialChars: false };
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isSaving || submitLockRef.current) return;

    submitLockRef.current = true;
    setIsSaving(true);

    const { missing, invalidNumbers, costNum, priceNum, specialChars } = validate();
    if (specialChars) {
      submitLockRef.current = false;
      setIsSaving(false);
      return;
    }
    if (missing.length > 0 || invalidNumbers.length > 0) {
      const parts = [];
      if (missing.length > 0) parts.push(`Missing: ${missing.join(", ")}`);
      if (invalidNumbers.length > 0)
        parts.push(`Invalid number: ${invalidNumbers.join(", ")}`);
      toast.error(parts.join(" | "), { toastId: ADD_CHEMICAL_TOAST_ID });
      submitLockRef.current = false;
      setIsSaving(false);
      return;
    }

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/add-chemical`,
        {
          ...formData,
          chemicalName: formData.chemicalName.trim(),
          brandName: formData.brandName.trim(),
          type: formData.type.trim(),
          cost: costNum,
          price: priceNum,
        },
        {
          headers: {
            token: localStorage.getItem("f&gstafftoken"),
          },
        },
      );
      console.log(res);

      if (res.data.success) {
        toast.success("Chemical added successfully");
        if (typeof onSuccess === "function") {
          onSuccess();
        }
        onClose();
      } else {
        toast.error(res.data?.message || "Unable to add chemical", { toastId: ADD_CHEMICAL_TOAST_ID });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong", { toastId: ADD_CHEMICAL_TOAST_ID });
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] rounded shadow-lg border-2 border-[#00613e]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#00613e] bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">Add Chemical</h3>
          <button onClick={onClose} className="text-xl font-bold text-white hover:opacity-80">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="form-group">
              <label>Chemical Name *</label>
              <input
                type="text"
                className="form-control"
                name="chemicalName"
                value={formData.chemicalName}
                onChange={handleChange}
                placeholder="Enter Chemical Name"
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label>Measure *</label>
              <select
                name="measure"
                value={formData.measure}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="">Select Measure</option>
                {MEASURE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Brand Name *</label>
              <input
                type="text"
                name="brandName"
                value={formData.brandName}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Brand Name"
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label>Type *</label>
              <input
                type="text"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Type"
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label>Cost *</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Cost"
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label>Price *</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Price"
                autoComplete="off"
                required
              />
            </div>

            {/* Checkbox – full width */}
            <div className="col-span-2 flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="isTaxable"
                name="isTaxable"
                checked={formData.isTaxable}
                onChange={handleChange}
              />
              <label htmlFor="isTaxable" className="mb-0">
                Is Taxable
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 border"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 bg-[#00613e] text-white"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddChemical;
