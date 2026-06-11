import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  isApiUnavailableError,
  updateCustomLocalTreatment,
} from "../../../../utils/otherTreatmentLocalStore";

const EDIT_TREATMENT_TOAST_ID = "edit-other-treatment-error";

const EditOtherTreatment = ({ show, onClose, data, onSuccess }) => {
  const [formData, setFormData] = useState({
    _id: "",
    treatmentName: "",
    cost: "",
    price: "",
    lowerPrice: "",
    programType: "other",
    sortOrder: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (data) {
      setFormData({
        _id: data._id || "",
        treatmentName: data.treatmentName || "",
        cost: data.cost ?? "",
        price: data.price ?? "",
        lowerPrice: data.lowerPrice ?? "",
        programType: data.programType || "other",
        sortOrder: data.sortOrder ?? "",
      });
    }
  }, [data]);

  if (!show) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (isSaving || submitLockRef.current || !formData._id) return;

    const name = String(formData.treatmentName || "").trim();
    if (!name) {
      toast.error("Treatment name is required", { toastId: EDIT_TREATMENT_TOAST_ID });
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
        toastId: EDIT_TREATMENT_TOAST_ID,
      });
      return;
    }

    if (String(formData._id).startsWith("local-custom-")) {
      updateCustomLocalTreatment(formData._id, {
        treatmentName: name,
        cost: costNum,
        price: priceNum,
        lowerPrice: lowerPriceNum,
        programType: formData.programType,
        sortOrder: formData.sortOrder ? Number(formData.sortOrder) : 0,
      });
      toast.success("Treatment updated");
      onSuccess?.();
      onClose?.();
      return;
    }

    submitLockRef.current = true;
    setIsSaving(true);

    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/update-other-treatment/${formData._id}`,
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
        toast.success("Treatment updated successfully");
        onSuccess?.();
        onClose?.();
      } else {
        toast.error(res.data.message || "Failed to update treatment", {
          toastId: EDIT_TREATMENT_TOAST_ID,
        });
      }
    } catch (error) {
      if (isApiUnavailableError(error) && formData._id) {
        updateCustomLocalTreatment(formData._id, {
          treatmentName: name,
          cost: costNum,
          price: priceNum,
          lowerPrice: lowerPriceNum,
          programType: formData.programType,
          sortOrder: formData.sortOrder ? Number(formData.sortOrder) : 0,
        });
        toast.success("Treatment updated (saved in browser)");
        onSuccess?.();
        onClose?.();
        return;
      }
      toast.error(
        error.response?.data?.message || "Failed to update treatment",
        { toastId: EDIT_TREATMENT_TOAST_ID }
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
          <h3 className="text-lg font-semibold">Edit Treatment</h3>
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
            <label>Lower Price</label>
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
              {isSaving ? "Saving..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOtherTreatment;
