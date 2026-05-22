
import React, { useEffect, useState } from "react";
import { useTableContext } from "../../../../context/TableContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ADD_MIX_ERROR_TOAST_ID = "add-mix-error";
const ADD_MIX_SUCCESS_TOAST_ID = "add-mix-success";

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

const AddNewMix = () => {
  const [mixName, setMixName] = useState("");
  const [chemicals, setChemicals] = useState([{ ...emptyChemical }]);
  const [notes, setNotes] = useState("");
  const { tableSize } = useTableContext();
  const navigate = useNavigate();
  const [chemicalOptions, setChemicalOptions] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // 🔹 Handle Input + Auto Calculation
  const handleChange = (index, field, value) => {
    const updated = [...chemicals];
    updated[index][field] = value;

    const qty = parseFloat(updated[index].quantity);
    const cost = parseFloat(updated[index].cost);
    const price = parseFloat(updated[index].price);

    if (qty > 0 && cost >= 0) {
      updated[index].costPerOz = (cost / qty).toFixed(2);
    } else {
      updated[index].costPerOz = "";
    }

    if (qty > 0 && price >= 0) {
      updated[index].pricePerOz = (price / qty).toFixed(2);
    } else {
      updated[index].pricePerOz = "";
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

  // 🔹 TOTALS
  const totalCostPerTank = chemicals.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.quantity || 0) *
        parseFloat(item.costPerOz || 0)),
    0
  );

  const totalPricePerTank = chemicals.reduce(
    (sum, item) =>
      sum +
      (parseFloat(item.quantity || 0) *
        parseFloat(item.pricePerOz || 0)),
    0
  );
  useEffect(() => {
    fetchChemicals();
  }, []);
  
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
      toast.error("Failed to load chemicals");
    }
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

      // Recalculate per-oz values using existing quantity
      const qty = parseFloat(updated[index].quantity);
      const cost = parseFloat(updated[index].cost);
      const price = parseFloat(updated[index].price);

      updated[index].costPerOz =
        qty > 0 && cost >= 0 ? (cost / qty).toFixed(2) : "";
      updated[index].pricePerOz =
        qty > 0 && price >= 0 ? (price / qty).toFixed(2) : "";
    } else {
      // just update name if not found in options
      updated[index].chemicalName = chemicalName;
    }

    setChemicals(updated);
  };
  

  const getRequiredFieldsError = (item, index) => {
    const num = index + 1;
    const trim = (v) => (v != null ? String(v).trim() : "");
    if (!trim(item.chemicalName)) return `Chemical ${num}: Please select Chemical Name`;
    if (!trim(item.quantity)) return `Chemical ${num}: Please enter Quantity (OZ / 100 GAL)`;
    if (!trim(item.measure)) return `Chemical ${num}: Please enter Measure`;
    if (!trim(item.brandName)) return `Chemical ${num}: Please enter Brand Name`;
    if (!trim(item.type)) return `Chemical ${num}: Please enter Type`;
    if (trim(item.cost) === "" && item.cost !== 0) return `Chemical ${num}: Please enter Cost`;
    if (trim(item.price) === "" && item.price !== 0) return `Chemical ${num}: Please enter Price`;
    const qty = parseFloat(item.quantity);
    const cost = parseFloat(item.cost);
    const price = parseFloat(item.price);
    if (!Number.isFinite(qty) || qty <= 0) return `Chemical ${num}: Please enter a valid Quantity`;
    if (!Number.isFinite(cost) || cost < 0) return `Chemical ${num}: Please enter a valid Cost`;
    if (!Number.isFinite(price) || price < 0) return `Chemical ${num}: Please enter a valid Price`;
    return null;
  };

  const handleSubmit = async () => {
    if (isSaving) return;

    try {
      if (!mixName.trim()) {
        toast.error("Please enter Mix Name", {
          toastId: ADD_MIX_ERROR_TOAST_ID,
        });
        return;
      }

      const filledChemicals = chemicals.filter(
        (c) => c.chemicalName && String(c.chemicalName).trim()
      );
      if (filledChemicals.length < 2) {
        // Show field-level validation instead of generic message
        for (let i = 0; i < chemicals.length; i++) {
          const err = getRequiredFieldsError(chemicals[i], i);
          if (err) {
            toast.error(err, {
              toastId: ADD_MIX_ERROR_TOAST_ID,
            });
            return;
          }
        }
        toast.error("Please add at least two chemicals and fill all required fields.", {
          toastId: ADD_MIX_ERROR_TOAST_ID,
        });
        return;
      }

      for (let i = 0; i < chemicals.length; i++) {
        const item = chemicals[i];
        const hasAny = [
          item.chemicalName,
          item.quantity,
          item.measure,
          item.brandName,
          item.type,
          item.cost,
          item.price,
        ].some((v) => v != null && String(v).trim() !== "");
        if (hasAny) {
          const err = getRequiredFieldsError(item, i);
          if (err) {
            toast.error(err, {
              toastId: ADD_MIX_ERROR_TOAST_ID,
            });
            return;
          }
        }
      }

      const validChemicals = chemicals.filter(
        (c) => c.chemicalName && String(c.chemicalName).trim()
      );
      if (validChemicals.length < 2) {
        toast.error("At least two chemicals are required for mixing. Please add and fill details for two or more chemicals.", {
          toastId: ADD_MIX_ERROR_TOAST_ID,
        });
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.", {
          toastId: ADD_MIX_ERROR_TOAST_ID,
        });
        return;
      }

      setIsSaving(true);

      const payload = {
        mixName,
        chemicals,
        totalCostPerTank,
        totalPricePerTank,
        notes,
      };

      const res = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/mixes`,
        payload,
        {
          headers: {
            token,
          },
        }
      );

      if (res.data.success) {
        toast.success("Chemical mix saved successfully", {
          toastId: ADD_MIX_SUCCESS_TOAST_ID,
          autoClose: 2500,
        });
        // Delay navigation so user sees the success message before page changes
        setTimeout(() => {
          navigate("/panel/office/chemical-maintenance/chemicals-mixs");
        }, 1500);
      } else {
        toast.error(res.data.message || "Failed to create chemical mix", {
          toastId: ADD_MIX_ERROR_TOAST_ID,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to create chemical mix",
        {
          toastId: ADD_MIX_ERROR_TOAST_ID,
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      {/* Success / error popup for adding mix */}
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
      <div className="lg:p-10 p-3">
        <div className="card">
          {/* HEADER */}
          <div className="card-header bg-[#00613e] text-white">
            <h3 className="card-title mt-1">
                 <button
                onClick={() => {
                  navigate(-1);
                }}
              >
                <i className="fa fa-arrow-left mr-2"></i>
              </button>{" "}
              Add Chemical Mix
            </h3>
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

          {/* CHEMICAL FORMS */}
          {chemicals.map((item, index) => (
            <div key={index} className="border m-4 p-4 rounded relative">
              <h4 className="font-semibold mb-3">
                Chemical {index + 1}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label>Chemical Name *</label>
                  <select
                    className="w-full border px-2 py-[10px]"
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

                </div>

                <div>
                  <label>Quantity (OZ / 100 GAL) *</label>
                  <input
                    type="number"
                    className="w-full border px-2 py-2"
                    value={item.quantity}
                    onChange={(e) =>
                      handleChange(index, "quantity", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Measure *</label>
                  <input
                    className="w-full border px-2 py-2"
                    value={item.measure}
                    onChange={(e) =>
                      handleChange(index, "measure", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Brand Name *</label>
                  <input
                    className="w-full border px-2 py-2"
                    value={item.brandName}
                    onChange={(e) =>
                      handleChange(index, "brandName", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>EPA Reg. #</label>
                  <input
                    className="w-full border px-2 py-2"
                    value={item.epaRegNo}
                    onChange={(e) =>
                      handleChange(index, "epaRegNo", e.target.value)
                    }
                    placeholder="EPA not required"
                  />
                </div>

                <div>
                  <label>Type *</label>
                  <input
                    className="w-full border px-2 py-2"
                    value={item.type}
                    onChange={(e) =>
                      handleChange(index, "type", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Cost *</label>
                  <input
                    type="number"
                    className="w-full border px-2 py-2"
                    value={item.cost}
                    onChange={(e) =>
                      handleChange(index, "cost", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>Price *</label>
                  <input
                    type="number"
                    className="w-full border px-2 py-2"
                    value={item.price}
                    onChange={(e) =>
                      handleChange(index, "price", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label>COST / OZ *</label>
                  <input
                    readOnly
                    className="w-full border px-2 py-2 bg-gray-100"
                    value={item.costPerOz}
                  />
                </div>

                <div>
                  <label>PRICE / OZ * </label>
                  <input
                    readOnly
                    className="w-full border px-2 py-2 bg-gray-100"
                    value={item.pricePerOz}
                  />
                </div>
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
                {chemicals.length > 1 && (
                  <button
                    onClick={() => removeRow(index)}
                    className="bg-red-600 text-white px-2 rounded"
                  >
                    -
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* SUMMARY TABLE */}
          <div className="m-4 border">
            <table className="w-full border-collapse table-fixed">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 w-[18%]">DESCRIPTION</th>
                  <th className="border p-2 w-[22%]">PRODUCT</th>
                  <th className="border p-2 w-[15%]">TYPE</th>
                  <th className="border p-2 w-[15%] text-center">OZ / TANK</th>
                  <th className="border p-2 w-[15%] text-center">COST / OZ</th>
                  <th className="border p-2 w-[15%] text-center">PRICE / OZ</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50">
                  <td className="border p-2 font-semibold">
                    {mixName || "DRENCH #1"}
                  </td>
                  <td className="border p-2"></td>
                  <td className="border p-2"></td>
                  <td className="border p-2 text-center"></td>
                  <td className="border p-2 text-center"></td>
                  <td className="border p-2 text-center"></td>
                </tr>

                {chemicals.map((item, i) => (
                  <tr key={i}>
                    <td className="border p-2"></td>
                    <td className="border p-2">{item.chemicalName}</td>
                    <td className="border p-2">{item.type}</td>
                    <td className="border p-2 text-center">{item.quantity}</td>
                    <td className="border p-2 text-center">
                      ${item.costPerOz}
                    </td>
                    <td className="border p-2 text-center">
                      ${item.pricePerOz}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TOTALS */}
            <div className="bg-green-200 px-4 py-2 font-semibold mt-2">
              COST PER TANK (100 GAL): $
              {totalCostPerTank.toFixed(2)}
            </div>
            <div className="bg-blue-200 px-4 py-2 font-semibold mt-2">
             
              PRICE PER TANK (100 GAL): $
              {totalPricePerTank.toFixed(2)}
            </div>
          </div>

          {/* NOTES */}
          <div className="m-4">
            <label className="font-semibold">Notes</label>
            <textarea
              className="w-full border px-3 py-2 mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes for this mix"
              rows={3}
            />
          </div>

          {/* FOOTER */}
          <div className="flex justify-end gap-3 border-t p-4">
            <button
              className="border px-4 py-2"
              type="button"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              disabled={isSaving}
              className={`bg-green-700 text-white px-4 py-2 ${
                isSaving ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {isSaving ? "Saving..." : "Save Mix"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddNewMix;
