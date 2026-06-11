import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  applyChemicalMixPerOzPricing,
} from "../../../../utils/chemicalMixPricing";

const UPDATE_MIX_ERROR_TOAST_ID = "update-mix-error";
const UPDATE_MIX_SUCCESS_TOAST_ID = "update-mix-success";

const emptyChemical = {
  chemicalName: "",
  quantity: "",
  measure: "",
  brandName: "",
  epaRegNo: "",
  type: "",
  cost: "",
  price: "",
  costPerOz: "",
  pricePerOz: "",
};

const EditChemicalMix = ({ mix, onClose, onSuccess }) => {
  const [mixName, setMixName] = useState("");
  const [chemicals, setChemicals] = useState([{ ...emptyChemical }]);
  const [notes, setNotes] = useState("");
  const [chemicalOptions, setChemicalOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  /* ===== FETCH CHEMICAL OPTIONS + PREFILL DATA ===== */
  useEffect(() => {
    const fetchChemicals = async () => {
      try {
        const token = localStorage.getItem("f&gstafftoken");
        const res = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/get-all-chemical`,
          {
            headers: { token },
            params: {
              page: 1,
              limit: 500,
            },
          }
        );

        if (res.data.statusCode === 200) {
          const { chemicals: backendChemicals = [] } = res.data.result || {};
          setChemicalOptions(backendChemicals);
        } else {
          toast.error(res.data.message || "Failed to load chemicals");
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load chemicals");
      }
    };

    fetchChemicals();
  }, []);

  /* ===== PREFILL DATA ===== */
  useEffect(() => {
    if (mix) {
      setMixName(mix.mixName || "");
      setNotes(mix.notes || "");
      setChemicals(
        mix.chemicals?.map((item) =>
          applyChemicalMixPerOzPricing({
            chemicalName: item.chemicalName || item.brandName || "",
            quantity: item.quantity || "",
            measure: item.measure || "OZ / 100 GAL",
            brandName: item.brandName || "",
            epaRegNo: item.epaRegNo || "",
            type: item.type || "",
            cost: item.cost || "",
            price: item.price || "",
            costPerOz: item.costPerOz || "",
            pricePerOz: item.pricePerOz || "",
          })
        ) || [{ ...emptyChemical }]
      );
    }
  }, [mix]);

  /* ===== HANDLE CHANGE ===== */
  const handleChange = (index, field, value) => {
    const updated = [...chemicals];
    updated[index][field] = value;
    updated[index] = applyChemicalMixPerOzPricing(updated[index]);
    setChemicals(updated);
  };

  // When a chemical is selected from dropdown, prefill its details
  const handleChemicalSelect = (index, chemicalName) => {
    const selected = chemicalOptions.find(
      (c) => c.chemicalName === chemicalName
    );

    const updated = [...chemicals];

    if (selected) {
      updated[index] = {
        ...updated[index],
        chemicalName: selected.chemicalName || "",
        measure: selected.measure || "",
        brandName: selected.brandName || "",
        epaRegNo: selected.epaRegNo || "",
        type: selected.type || "",
        cost: selected.cost ?? "",
        price: selected.price ?? "",
      };

      updated[index] = applyChemicalMixPerOzPricing(updated[index]);
    } else {
      updated[index].chemicalName = chemicalName;
    }

    setChemicals(updated);
  };

  const addRow = () => {
    setChemicals([...chemicals, { ...emptyChemical }]);
  };

  
  const removeRow = (index) => {
    if (chemicals.length === 1) return;
    setChemicals(chemicals.filter((_, i) => i !== index));
  };

  /* ===== TOTALS ===== */
  const totalCostPerTank = chemicals.reduce(
    (sum, item) =>
      sum +
      parseFloat(item.quantity || 0) *
      parseFloat(item.costPerOz || 0),
    0
  );

  const totalPricePerTank = chemicals.reduce(
    (sum, item) =>
      sum +
      parseFloat(item.quantity || 0) *
      parseFloat(item.pricePerOz || 0),
    0
  );

  /* ===== SAVE ===== */
  const handleSave = async () => {
    if (isSaving) return;

    if (!mix?._id) {
      toast.error("Invalid mix selected", {
        toastId: UPDATE_MIX_ERROR_TOAST_ID,
      });
      return;
    }

    if (!mixName.trim()) {
      toast.error("Please enter Mix Name", {
        toastId: UPDATE_MIX_ERROR_TOAST_ID,
      });
      return;
    }

    const filledChemicals = chemicals.filter(
      (c) => c.chemicalName && String(c.chemicalName).trim()
    );
    if (filledChemicals.length < 2) {
      toast.error("At least two chemicals are required for mixing.", {
        toastId: UPDATE_MIX_ERROR_TOAST_ID,
      });
      return;
    }

    const token = localStorage.getItem("f&gstafftoken");
    if (!token) {
      toast.error("Token missing. Please login again.", {
        toastId: UPDATE_MIX_ERROR_TOAST_ID,
      });
      return;
    }

    const normalizedChemicals = chemicals.map(applyChemicalMixPerOzPricing);
    const payload = {
      mixName,
      chemicals: normalizedChemicals,
      totalCostPerTank,
      totalPricePerTank,
      notes,
    };

    try {
      setIsSaving(true);

      const res = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/mixes/${mix._id}`,
        payload,
        {
          headers: {
            token,
          },
        }
      );

      if (res.data.success) {
        toast.success("Chemical mix saved successfully", {
          toastId: UPDATE_MIX_SUCCESS_TOAST_ID,
          autoClose: 3000,
        });
        // Keep modal open briefly so user sees the success message, then close
        setTimeout(() => {
          if (typeof onSuccess === "function") {
            onSuccess();
          }
          onClose();
        }, 800);
      } else {
        toast.error(res.data.message || "Failed to update chemical mix", {
          toastId: UPDATE_MIX_ERROR_TOAST_ID,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to update chemical mix",
        {
          toastId: UPDATE_MIX_ERROR_TOAST_ID,
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ===== UI ===== */
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white w-[900px] max-h-[80vh] overflow-y-auto rounded shadow-lg">
        {/* HEADER */}
        <div className="flex justify-between items-center p-4 border-b bg-[#00613e] text-white relative">
          <h3 className="text-lg font-semibold flex-1 text-center">Edit Chemical Mix</h3>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2">✕</button>
        </div>

        {/* MIX NAME */}
        <div className="p-4">
          <label className="font-semibold">MIX NAME *</label>
          <input
            className="w-full border px-3 py-2 mt-1"
            value={mixName}
            onChange={(e) => setMixName(e.target.value)}
          />
        </div>

        <div className="px-4 pb-2">
          <label className="font-semibold">Notes</label>
          <textarea
            className="w-full border px-3 py-2 mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter notes for this mix"
            rows={3}
          />
        </div>

        {/* CHEMICALS */}
        {chemicals.map((item, index) => (
          <div key={index} className="border m-4 p-4 rounded relative">
            <h4 className="font-semibold mb-3">
              Chemical {index + 1}
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <select
                className="border px-2 py-2"
                value={item.chemicalName}
                onChange={(e) =>
                  handleChemicalSelect(index, e.target.value)
                }
              >
                <option value="">Select Chemical</option>
                {chemicalOptions.map((chem) => (
                  <option key={chem._id} value={chem.chemicalName}>
                    {chem.chemicalName}
                  </option>
                ))}
              </select>

              <input
                type="number"
                placeholder="Quantity (OZ)"
                className="border px-2 py-2"
                value={item.quantity}
                onChange={(e) =>
                  handleChange(index, "quantity", e.target.value)
                }
              />

              <input
                placeholder="Brand"
                className="border px-2 py-2"
                value={item.brandName}
                onChange={(e) =>
                  handleChange(index, "brandName", e.target.value)
                }
              />

              <input
                placeholder="EPA Reg. #"
                className="border px-2 py-2"
                value={item.epaRegNo}
                onChange={(e) =>
                  handleChange(index, "epaRegNo", e.target.value)
                }
              />

              <input
                placeholder="Type"
                className="border px-2 py-2"
                value={item.type}
                onChange={(e) =>
                  handleChange(index, "type", e.target.value)
                }
              />

              <input
                type="number"
                placeholder="Cost"
                className="border px-2 py-2"
                value={item.cost}
                onChange={(e) =>
                  handleChange(index, "cost", e.target.value)
                }
              />

              <input
                type="number"
                placeholder="Price"
                className="border px-2 py-2"
                value={item.price}
                onChange={(e) =>
                  handleChange(index, "price", e.target.value)
                }
              />

              <input
                readOnly
                className="border px-2 py-2 bg-gray-100"
                value={`Cost / Oz : ${item.costPerOz}`}
              />

              <input
                readOnly
                className="border px-2 py-2 bg-gray-100"
                value={`Price / Oz : ${item.pricePerOz}`}
              />
            </div>

            {/* ACTIONS */}
            <div className="absolute top-4 right-4 flex gap-2">
              {index === chemicals.length - 1 && (
                <button
                  onClick={addRow}
                  className="bg-green-600 text-white px-2 rounded"
                >
                  +
                </button>
              )}
              <button
                onClick={() => removeRow(index)}
                className="bg-red-600 text-white px-2 rounded"
              >
                -
              </button>
            </div>
          </div>
        ))}

        {/* TOTALS */}
        <div className="mx-4 mb-4">
          <div className="bg-green-200 px-4 py-2 font-semibold">
            COST PER TANK: ${totalCostPerTank.toFixed(2)}
          </div>
          <div className="bg-blue-200 px-4 py-2 font-semibold mt-2">
            PRICE PER TANK: ${totalPricePerTank.toFixed(2)}
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 border-t p-4">
          <button onClick={onClose} className="border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`bg-green-700 text-white px-4 py-2 ${
              isSaving ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isSaving ? "Updating..." : "Update Mix"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditChemicalMix;
