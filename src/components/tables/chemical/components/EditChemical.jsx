// import React from "react";

// const EditChemical = ({ show, onClose }) => {
//   if (!show) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white w-[520px] rounded shadow-lg">
//         {/* Header */}
//         <div className="flex justify-between items-center p-4 border-b">
//           <h3 className="text-lg font-semibold">Add Chemical</h3>
//           <button onClick={onClose} className="text-xl font-bold">
//             ×
//           </button>
//         </div>

//         {/* Body */}
//         <div className="p-4 grid grid-cols-2 gap-3">
//           <div className="form-group">
//             <label>Chemical Name *</label>
//             <input
//               type="text"
//               className="form-control"
//               placeholder="Enter Chemical Name"
//               maxLength={100}
//               autoComplete="off"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Measure *</label>
//             <input
//               type="text"
//               className="form-control"
//               placeholder="Enter Measure"
//               maxLength={100}
//               autoComplete="off"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Brand Name *</label>
//             <input
//               type="text"
//               className="form-control"
//               placeholder="Enter Brand Name"
//               maxLength={100}
//               autoComplete="off"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Type *</label>
//             <input
//               type="text"
//               className="form-control"
//               placeholder="Enter Type"
//               maxLength={100}
//               autoComplete="off"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Cost *</label>
//             <input
//               type="number"
//               className="form-control"
//               placeholder="Enter Cost"
//               autoComplete="off"
//               required
//             />
//           </div>

//           <div className="form-group">
//             <label>Price *</label>
//             <input
//               type="number"
//               className="form-control"
//               placeholder="Enter Price"
//               autoComplete="off"
//               required
//             />
//           </div>

//           {/* Checkbox – full width */}
//           <div className="col-span-2 flex items-center gap-2 mt-2">
//             <input type="checkbox" id="isTaxable" />
//             <label htmlFor="isTaxable" className="mb-0">
//               Is Taxable
//             </label>
//           </div>
//         </div>

//         {/* Footer */}
//         <div className="flex justify-end gap-2 p-4 border-t">
//           <button onClick={onClose} className="px-4 py-1 border">
//             Cancel
//           </button>
//           <button className="px-4 py-1 bg-[#00613e] text-white">
//             Save
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default EditChemical;

import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const EditChemical = ({ show, onClose, data, onSuccess }) => {
  const [formData, setFormData] = useState({
    _id: "",
    chemicalName: "",
    measure: "",
    brandName: "",
    type: "",
    cost: "",
    price: "",
    isTaxable: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Populate form when a row is selected
  useEffect(() => {
    if (data) {
      setFormData({
        _id: data._id || "",
        chemicalName: data.chemicalName || "",
        measure: data.measure || "",
        brandName: data.brandName || "",
        type: data.type || "",
        cost: data.cost ?? "",
        price: data.price ?? "",
        isTaxable: !!data.isTaxable,
      });
    }
  }, [data]);

  const SPECIAL_CHARS_REGEX = /[#$&*()!{}\[\]\-]/g;
  const stripSpecialChars = (val) =>
    typeof val === "string" ? val.replace(SPECIAL_CHARS_REGEX, "") : val;
  const hasSpecialChars = (val) =>
    val != null && typeof val === "string" && /[#$&*()!{}\[\]\-]/.test(val);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;
    if (type !== "checkbox" && ["chemicalName", "brandName", "type"].includes(name)) {
      finalValue = stripSpecialChars(finalValue);
    }
    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };
  const MEASURE_OPTIONS = [
    "FT",
    "SACK",
    "UNIT",
  ];


  const handleSave = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // 🔒 STOP multiple clicks

    setIsSubmitting(true);

    if (hasSpecialChars(formData.chemicalName) || hasSpecialChars(formData.brandName) || hasSpecialChars(formData.type)) {
      toast.error("Please do not use special characters like # $ & * ( ) ! { } [ ] - in Chemical Name, Brand Name or Type.", { id: "specialChars" });
      setIsSubmitting(false);
      return;
    }
    if (!formData.chemicalName.trim()) {
      toast.error("Please enter Chemical Name",{id:"chemicalName"});
      setIsSubmitting(false);
      return;
    }
    if (!formData.measure.trim()) {
      toast.error("Please enter Measure",{id:"measure"});
      return;
    }
    if (!formData.brandName.trim()) {
      toast.error("Please enter Brand Name",{id:"brandName"});
      return;
    }
    if (!formData.type.trim()) {
      toast.error("Please enter Type",{id:"type"});
      return;
    }
    if (formData.cost === "" || isNaN(Number(formData.cost))) {
      toast.error("Please enter valid Cost" ,{id:"cost"});
      return;
    }
    if (formData.price === "" || isNaN(Number(formData.price))) {
      toast.error("Please enter valid Price",{id:"price"});
      return;
    }


    try {
      const token = localStorage.getItem("f&gstafftoken");
      const res = await axios.put(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/update-chemical/${formData._id}`,
        {
          chemicalName: formData.chemicalName,
          measure: formData.measure,
          brandName: formData.brandName,
          type: formData.type,
          cost: Number(formData.cost),
          price: Number(formData.price),
          isTaxable: formData.isTaxable,
        },
        {
          headers: {
            token,
          },
        }
      );

      if (res.data.success) {
        toast.success("Chemical updated successfully",{id:"chemicalUpdated"});
        if (typeof onSuccess === "function") {
          onSuccess();
        }
        onClose();
      } else {
        toast.error(res.data.message || "Failed to update chemical",{id:"chemicalUpdated"});
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to update chemical",{id:"chemicalUpdated"}
      );
    }
    finally {
      setIsSubmitting(false); // 🔓 unlock button
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[520px] rounded shadow-lg border-2 border-[#00613e]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[#00613e] bg-[#00613e] text-white">
          <h3 className="text-lg font-semibold">Edit Chemical</h3>
          <button
            onClick={onClose}
            className="text-xl font-bold text-white hover:opacity-80"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSave}>
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="form-group">
              <label>Chemical Name *</label>
              <input
                type="text"
                name="chemicalName"
                value={formData.chemicalName}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Chemical Name"
                maxLength={100}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group">
              <label>Measure *</label>
              {/* <input
                type="text"
                name="measure"
                value={formData.measure}
                onChange={handleChange}
                className="form-control"
                placeholder="Enter Measure (e.g., Liter, Kg)"
                maxLength={100}
                autoComplete="off"
                required
              /> */}
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
              <label htmlFor="isTaxable" className="mb-0 cursor-pointer">
                Is Taxable
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1 border hover:bg-gray-100"
            >
              Cancel
            </button>
           <button
  type="submit"
  disabled={isSubmitting}
  className={`px-4 py-1 text-white 
    ${isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-[#00613e] hover:bg-[#004d2f]"}`}
>
  {isSubmitting ? "Updating..." : "Update Chemical"}
</button>

          </div>
        </form>
      </div>
    </div>
  );
};

export default EditChemical;