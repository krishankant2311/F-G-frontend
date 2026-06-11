import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  addCustomLocalTreatment,
  isApiUnavailableError,
} from "../../../../utils/otherTreatmentLocalStore";

const ADD_TREATMENT_TOAST_ID = "add-other-treatment-error";

const AddOtherTreatment = ({ show, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    treatmentName: "",
    cost: "",
    price: "",
    lowerPrice: "",
    programType: "other",
    sortOrder: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const submitLockRef = useRef(false);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isSaving || submitLockRef.current) return;

    const name = String(formData.treatmentName || "").trim();
    if (!name) {
      toast.error("Treatment name is required", { toastId: ADD_TREATMENT_TOAST_ID });
      return;
    }

    const costNum = parseFloat(formData.cost);
    const priceNum = parseFloat(formData.price);
    const lowerPriceNum = parseFloat(formData.lowerPrice || 0);

    if (
      !Number.isFinite(costNum) ||
      !Number.isFinite(priceNum) ||
      !Number.isFinite(lowerPriceNum)
    ) {
      toast.error("Cost, price, and lower price must be valid numbers", {
        toastId: ADD_TREATMENT_TOAST_ID,
      });
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/add-other-treatment`,
        {
          treatmentName: name,
          cost: costNum,
          price: priceNum,
          lowerPrice: lowerPriceNum,
          programType: formData.programType,
          sortOrder: formData.sortOrder ? Number(formData.sortOrder) : 0,
        },
        {
          headers: { token: localStorage.getItem("f&gstafftoken") },
        }
      );

      if (res.data.success) {
        toast.success("Treatment added successfully");
        setFormData({
          treatmentName: "",
          cost: "",
          price: "",
          lowerPrice: "",
          programType: "other",
          sortOrder: "",
        });
        onSuccess?.();
        onClose?.();
        return;
      }

      if (res.data.statusCode === 401) {
        toast.error(res.data.message || "Unauthorized", {
          toastId: ADD_TREATMENT_TOAST_ID,
        });
        return;
      }

      toast.error(res.data.message || "Failed to add treatment", {
        toastId: ADD_TREATMENT_TOAST_ID,
      });
    } catch (error) {
      if (isApiUnavailableError(error)) {
        addCustomLocalTreatment({
          treatmentName: name,
          cost: costNum,
          price: priceNum,
          lowerPrice: lowerPriceNum,
          programType: formData.programType,
          sortOrder: formData.sortOrder ? Number(formData.sortOrder) : 0,
        });
        toast.success("Treatment saved (API offline — stored in browser)");
        setFormData({
          treatmentName: "",
          cost: "",
          price: "",
          lowerPrice: "",
          programType: "other",
          sortOrder: "",
        });
        onSuccess?.();
        onClose?.();
        return;
      }
      toast.error(
        error.response?.data?.message || "Failed to add treatment",
        { toastId: ADD_TREATMENT_TOAST_ID }
      );
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[560px] max-h-[90vh] overflow-y-auto rounded shadow-lg">
        <div className="flex justify-between items-center p-3 border-b bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">Add Treatment</h3>
          <button type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 grid grid-cols-2 gap-3">
          <div className="form-group col-span-2">
            <label>Treatment Name *</label>
            <input
              type="text"
              name="treatmentName"
              className="form-control"
              value={formData.treatmentName}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label>Cost *</label>
            <input
              type="number"
              name="cost"
              className="form-control"
              value={formData.cost}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Price (higher) *</label>
            <input
              type="number"
              name="price"
              className="form-control"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Lower Price (Chemical Maint. Yes)</label>
            <input
              type="number"
              name="lowerPrice"
              className="form-control"
              value={formData.lowerPrice}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Program</label>
            <select
              name="programType"
              className="form-control"
              value={formData.programType}
              onChange={handleChange}
            >
              <option value="other">Other</option>
              <option value="annual_program">Annual Program</option>
            </select>
          </div>

          <div className="form-group">
            <label>Sort Order</label>
            <input
              type="number"
              name="sortOrder"
              className="form-control"
              value={formData.sortOrder}
              onChange={handleChange}
              min="0"
              step="1"
            />
          </div>

          <div className="col-span-2 flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-4 py-1 border">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1 bg-[#00613e] text-white disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddOtherTreatment;
