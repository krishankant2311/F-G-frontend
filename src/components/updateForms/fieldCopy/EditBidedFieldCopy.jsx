// import React, { useEffect, useState } from "react";
// import Layout from "../../layout/Layout";
// import axios from "axios";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useNavigate, useParams } from "react-router-dom";
// import { useTableContext } from "../../../context/TableContext";

// export default function EditBidedFieldCopy() {
//   const [formData, setFormData] = useState({
//     customerName: "",
//     customerEmail: "",
//     customerPhone: "",
//     billingType: "",
//     jobAddress: "",
//     jobType: "",
//     crewCategory: "",
//     description: "",
//     crew: [],
//     truckNo: "",
//     trailerNo: "",
//   });
//   const [forms, setForms] = useState([
//     {
//       source: "F&G",
//       type: "Material",
//       reference: "",
//       measure: "",
//       quantity: "",
//       price: "",
//       totalPrice: "",
//       isTaxable: false,
//       startDate: Date.now(),
//       endDate: Date.now(),
//     },
//   ]);
//   const [materials, setMaterials] = useState([]);
//   const [labors, setLabors] = useState([]);
//   const [disableBtn, setDisableBtn] = useState(false);
//   const [fieldCopies, setFieldCopies] = useState([]);
//   const [jobType, setJobType] = useState("");
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const { tableSize } = useTableContext();

//   useEffect(() => {
//     getProjectById();
//     getJobTypeById();
//     getMaterials();
//     getCrews();
//     window.scrollTo(0, 0);
//   }, []);

//   useEffect(() => {
//     getJobTypeById();
//   }, [formData]);

//   const getProjectById = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/project/get-project/${id}`,
//         { headers: headers }
//       );
//       console.log("Response in Edit biding", response);
//       if (response.data.statusCode === 200) {
//         if(!response.data.result.isProjectStarted){
//           navigate(-1);
//         }
//         let compiledForms = compileMaterials(response.data.result.bidedCopy);
//         console.log("compiled Forms", compiledForms);
//         setFormData(response.data.result);
//         setFieldCopies(compiledForms); // Store the compiled forms for editing
//         compiledForms = compiledForms.map((form) => {
//           form.intialReference = form.reference
//           return form
//         })
//         setForms(compiledForms); // Set the compiled forms to be edited
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.error(error);
//       toast.error(error.response.message);
//     }
//   };

//   const compileMaterials = (forms) => {
//     const compiled = {};

//     console.log("Forms in complied function", forms);

//     forms.forEach((form) => {
//       const { reference, measure, quantity, price,totalPrice } = form;
//       // Use both reference and measure as the key
//       const key = `${reference}-${measure}-${price}`;

//       if (compiled[key]) {
//         compiled[key].quantity += parseFloat(quantity);
//         compiled[key].totalPrice += parseFloat(totalPrice);
//       } else {
//         compiled[key] = {
//           ...form,
//           quantity: parseFloat(quantity),
//           totalPrice: parseFloat(totalPrice),
//         };
//       }
//     });

//     return Object.values(compiled);
//   };

//   const getJobTypeById = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       if (!formData.jobType) {
//         return;
//       }
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/project/get-job-type/${formData.jobType}`,
//         { headers: headers }
//       );
//       if (response.data.statusCode === 200) {
//         setJobType(response.data.result.jobName);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.error(error);
//       toast.error(error.response.message);
//     }
//   };

//   const handleInputChange = (e, index) => {
//     const { name, value } = e.target;
//     const updatedForms = [...forms];

//     if (name === "source") {
//       updatedForms[index] = {
//         ...updatedForms[index],
//         [name]: value,
//         type: "Other",
//         reference: "",
//         measure: "",
//         quantity: "",
//         price: "",
//         totalPrice: "",
//         isTaxable: false,
//       };
//     }

//     if (name === "type") {
//       updatedForms[index] = {
//         ...updatedForms[index],
//         [name]: value,
//         reference: "",
//         measure: "",
//         quantity: "",
//         price: "",
//         totalPrice: "",
//         isTaxable: false,
//       };
//     }

//     const updatedForm = { ...updatedForms[index], [name]: value };

//     // Calculate total price if both price and quantity are filled
//     if (
//       (name === "price" || name === "quantity") &&
//       updatedForm.source === "F&G"
//     ) {
//       const price = parseFloat(updatedForm.price) || 0;
//       const quantity = parseFloat(updatedForm.quantity) || 0;
//       updatedForm.totalPrice = price && quantity ? price * quantity : "";
//     }

//     updatedForms[index] = updatedForm;
//     setForms(updatedForms);
//   };

//   const handleMaterialChange = (e, index) => {
//     const materialName = e.target.value;
//     const material = materials.find(
//       (material) => material.name === materialName
//     );
//     const updatedForms = [...forms];
//     updatedForms[index] = {
//       ...updatedForms[index],
//       reference: material.name,
//       measure: material.measure,
//       price: material.price,
//       isTaxable: material.isTaxable,
//       totalPrice:
//         Number.parseFloat(material.price) *
//         Number.parseFloat(forms[index].quantity),
//     };
//     setForms(updatedForms);
//   };

//   const handleLaborChange = (e, index) => {
//     const jobName = e.target.value;
//     const labor = labors.find((labor) => labor.jobName === jobName);
//     const updatedForms = [...forms];
//     updatedForms[index] = {
//       ...updatedForms[index],
//       reference: labor.jobName,
//       measure: labor.measure,
//       price: labor.price,
//       isTaxable: labor.isTaxable,
//       totalPrice:
//         Number.parseFloat(labor.price) *
//         Number.parseFloat(forms[index].quantity),
//     };
//     setForms(updatedForms);
//   };

//   const deleteForm = (index) => {
//     const updatedForms = forms.filter((_, i) => i !== index);
//     setForms(updatedForms);
//   };

//   const addForm = () => {
//     setForms([
//       ...forms,
//       {
//         source: "F&G",
//         type: "Material",
//         reference: "",
//         measure: "",
//         quantity: "",
//         price: "",
//         totalPrice: "",
//         isTaxable: "",
//       },
//     ]);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     // return;
//     try {

//       let isValidPrice = forms.some((form) => {
//         return (
//           Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
//             Number.parseFloat(form.totalPrice) && form.source === "F&G"
//         );
//       });

//       if (isValidPrice) {
//         toast.error("Please ensure all field copies have valid prices.");
//         return;
//       }

//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//       };
//       setDisableBtn(true);

//       const formdata = new FormData();

//       formdata.append("forms", JSON.stringify(forms));

//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/project/edit-bided-field-copy/${id}`,
//         formdata,
//         {
//           headers: headers,
//         }
//       );

//       if (response.data.statusCode === 200) {
//         toast.success(response.data.message);
//         navigate(-1);
//       } else {
//         toast.error(response.data.message);
//       }

//       // navigate(`/panel/office/project/view/${id}`);
//     } catch (error) {
//       console.log("Error", error);
//       toast.error(error.response.message);
//     }
//     setDisableBtn(false);
//   };

//   const getMaterials = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/project/get-materials-dpd`,
//         { headers: headers }
//       );

//       if (response.data.statusCode === 200) {
//         setMaterials(response.data.result);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log("Error", error);
//     }
//   };

//   const getCrews = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/admin/get-labors-dpd`,
//         { headers: headers }
//       );
//       if (response.data.statusCode === 200) {
//         setLabors(response.data.result);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log("Error", error);
//     }
//   };

//   return (
//     <Layout>
//       <ToastContainer />
//       <div
//         className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
//       >
//         <div className="lg:p-10 p-3">
//           <div className="card card-primary">
//             <div className="card-header">
//               <h3 className="card-title">Edit Bided Copy</h3>
//             </div>
//             <div className="mt-6 p-6 " id="">
//               <div className="flex flex-col md:flex-row gap-6 justify-around">
//                 <div className="flex flex-col w-[300px]">
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">Date</h6>
//                     <p>21 July , 2024</p>
//                   </div>
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">Customer Name</h6>
//                     <p>{formData?.customerName}</p>
//                   </div>
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">Job Address</h6>
//                     <p>{formData?.jobAddress}</p>
//                   </div>
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">Email</h6>
//                     <p>{formData?.customerEmail}</p>
//                   </div>
//                 </div>
//                 <div className="flex flex-col w-[300px]">
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">Project Code</h6>
//                     <p>{formData.projectCode}</p>
//                   </div>
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">Job Type</h6>
//                     <p>{jobType}</p>
//                   </div>
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">
//                       Description of work
//                     </h6>
//                     <p>{formData.description}</p>
//                   </div>
//                 </div>
//                 <div className="flex flex-col w-[300px]">
//                   <div className="p-2">
//                     <h6 className="font-bold text-[17px]">F&G INC</h6>
//                     <p>
//                       P.O. Box 2769 <br /> BELLAIRE, TX 77402 <br />{" "}
//                       713-667-7198
//                     </p>
//                   </div>
//                 </div>
//               </div>
//             </div>
//             <div className="mt-10">
//               <form onSubmit={handleSubmit}>
//                 <div className="card-body">
//                   {forms.map((formData, index) => (
//                     <div
//                       key={index}
//                       className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative"
//                     >
//                       <div className="form-group flex flex-col">
//                         <label htmlFor={`source-${index}`}>Source</label>
//                         <select
//                           name="source"
//                           onChange={(e) => handleInputChange(e, index)}
//                           id={`source-${index}`}
//                           className="border-b border-[grey] outline-none w-[180px]"
//                           value={formData.source}
//                           required
//                         >
//                           <option value="">Select Source</option>
//                           <option value="F&G">F&G</option>
//                           <option value="Other">Other</option>
//                         </select>
//                       </div>

//                       {formData.source === "F&G" && (
//                         <>
//                           <div className="form-group flex flex-col">
//                             <label htmlFor={`type-${index}`}>Select Type</label>
//                             <select
//                               name="type"
//                               onChange={(e) => handleInputChange(e, index)}
//                               id={`type-${index}`}
//                               className="border-b border-[grey] outline-none w-[180px]"
//                               value={formData.type}
//                               required
//                             >
//                               <option value="">Select Type</option>
//                               <option value="Material">Material</option>
//                               <option value="Labor">Labor</option>
//                             </select>
//                           </div>
//                           <div className="form-group flex flex-col w-[180px]">
//                             <label htmlFor={`reference-${index}`}>
//                               {formData.type === "Material"
//                                 ? "Material Type"
//                                 : "Labor Type"}
//                             </label>
//                             <select
//                               name="reference"
//                               onChange={(e) =>
//                                 formData.type === "Material"
//                                   ? handleMaterialChange(e, index)
//                                   : handleLaborChange(e, index)
//                               }
//                               id={`reference-${index}`}
//                               className="border-b border-[grey] outline-none"
//                               value={getMaterialNameInputValue(formData)}
//                               required
//                             >
//                               <option value="">Select One</option>
//                               {formData.type === "Material"
//                                 ? materials
//                                     .filter((item) => {
//                                       return (
//                                         item.status === "Active" ||
//                                         item.name === formData.intialReference
//                                       );
//                                     })
//                                     .map((material) => (
//                                       <option
//                                         key={material._id}
//                                         value={material.name}
//                                         className={
//                                           material.status === "Delete"
//                                             ? "text-[red]"
//                                             : "text-[black]"
//                                         }
//                                       >
//                                         {material.name}
//                                       </option>
//                                     ))
//                                 : labors
//                                     .filter((item) => {
//                                       return (
//                                         item.status === "Active" ||
//                                         item.jobName === formData.intialReference
//                                       );
//                                     })
//                                     .map((labor) => (
//                                       <option
//                                         key={labor._id}
//                                         value={labor.jobName}
//                                         className={
//                                           labor.status === "Delete"
//                                             ? "text-[red]"
//                                             : "text-[black]"
//                                         }
//                                       >
//                                         {labor.jobName}
//                                       </option>
//                                     ))}
//                             </select>
//                           </div>
//                         </>
//                       )}

//                       {formData.source === "Other" && (
//                         <>
//                           <div className="form-group flex flex-col w-[180px]">
//                             <label htmlFor={`reference-${index}`}>
//                               Name
//                             </label>
//                             <input
//                               type="text"
//                               className="border-b border-[grey] outline-none"
//                               id={`reference-${index}`}
//                               name="reference"
//                               onChange={(e) => handleInputChange(e, index)}
//                               value={getMaterialNameInputValue(formData)}
//                               placeholder="Enter Name"
//                               required
//                             />
//                           </div>
//                         </>
//                       )}

//                       <div className="form-group flex flex-col">
//                         <label htmlFor={`measure-${index}`}>Measure</label>
//                         <input
//                           type="text"
//                           className="border-b border-[grey] outline-none"
//                           id={`measure-${index}`}
//                           name="measure"
//                           onChange={(e) => handleInputChange(e, index)}
//                           value={formData.measure}
//                           placeholder="Enter measure"
//                           readOnly={formData.source === "Other" ? false : true}
//                           required
//                         />
//                       </div>

//                       <div className="form-group flex flex-col">
//                         <label htmlFor={`price-${index}`}>Price</label>
//                         <input
//                           type="number"
//                           className="border-b border-[grey] outline-none"
//                           id={`price-${index}`}
//                           name="price"
//                           onChange={(e) => handleInputChange(e, index)}
//                           value={formData.price}
//                           placeholder="Enter Price"
//                           readOnly={formData.source === "Other" ? false : true}
//                           min={0}
//                           required
//                         />
//                       </div>

//                       <div className="form-group flex flex-col">
//                         <label htmlFor={`quantity-${index}`}>Quantity</label>
//                         <input
//                           type="number"
//                           className="border-b border-[grey] outline-none"
//                           id={`quantity-${index}`}
//                           name="quantity"
//                           onChange={(e) => handleInputChange(e, index)}
//                           value={formData.quantity}
//                           placeholder="Enter Quantity"
//                           min={0}
//                           required
//                         />
//                       </div>
//                       {/* <div className="form-group flex flex-col">
//                         <label htmlFor={`totalPrice-${index}`}>
//                           Total Price
//                         </label>
//                         <input
//                           type="number"
//                           className="border-b border-[grey] outline-none"
//                           id={`totalPrice-${index}`}
//                           name="totalPrice"
//                           placeholder="Total price goes here..."
//                           value={formData.totalPrice}
//                           min={0}
//                           readOnly
//                           required
//                         />
//                       </div> */}

//                       {formData.source === "F&G" ? (
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`totalPrice-${index}`}>
//                             Total Price
//                           </label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`totalPrice-${index}`}
//                             name="totalPrice"
//                             placeholder="Total price goes here..."
//                             value={formData.totalPrice}
//                             readOnly
//                             min={0}
//                             required
//                           />
//                         </div>
//                       ) : (
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`totalPrice-${index}`}>
//                             Total Price
//                           </label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`totalPrice-${index}`}
//                             name="totalPrice"
//                             placeholder="Enter total price"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.totalPrice}
//                             min={0}
//                             required
//                           />
//                         </div>
//                       )}

//                       {/* <div className="form-group flex-col hidden">
//                         <label htmlFor={`isTaxable-${index}`}>Taxable</label>
//                         <input
//                           type="checkbox"
//                           className="border-b border-[grey] outline-none"
//                           id={`isTaxable-${index}`}
//                           name="isTaxable"
//                           onChange={(e) => handleInputChange(e, index)}
//                           value={formData.isTaxable}
//                           checked={formData.isTaxable}
//                           placeholder="Enter isTaxable"
//                           disabled={true}
//                         />
//                       </div> */}

//                       {formData.reference && formData.source === "F&G" && (
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`isTaxable-${index}`}>Taxable</label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`isTaxable-${index}`}
//                             name="isTaxable"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.isTaxable ? "Yes" : "No"}
//                             placeholder="Enter isTaxable"
//                             disabled={true}
//                           />
//                         </div>
//                       )}

//                       {formData.source === "Other" && (
//                         <div className="form-group flex-col hidden">
//                           <label htmlFor={`isTaxable-${index}`}>Taxable</label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`isTaxable-${index}`}
//                             name="isTaxable"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.isTaxable ? "Yes" : "No"}
//                             placeholder="Enter isTaxable"
//                             disabled={true}
//                           />
//                         </div>
//                       )}

//                       <button
//                         type="button"
//                         className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
//                         onClick={() => deleteForm(index)}
//                       >
//                         <i className="fa fa-close text-white"></i>
//                       </button>
//                     </div>
//                   ))}
//                   <div className="text-center">
//                     <button
//                       type="button"
//                       className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
//                       onClick={addForm}
//                     >
//                       <i className="fa fa-plus"></i>
//                     </button>
//                   </div>
//                 </div>
//                 <div className="card-footer">
//                   <button
//                     type="submit"
//                     className="btn btn-primary"
//                     disabled={disableBtn}
//                   >
//                     {disableBtn ? "Please wait..." : "Edit Bided Copy"}
//                   </button>
//                 </div>
//               </form>
//             </div>
//           </div>
//         </div>
//       </div>
//     </Layout>
//   );
// }

import React, { useEffect, useRef, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import parse from "html-react-parser";
import {
  applyReferenceVendorToForm,
  getMaterialNameInputValue,
  materialNameBaseForEdit,
  toPersistedCopy,
} from "../../../utils/materialReference";

export default function EditBidedFieldCopy() {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    billingType: "",
    jobAddress: "",
    jobType: "",
    crewCategory: "",
    description: "",
    crew: [],
    truckNo: "",
    trailerNo: "",
  });
  const [forms, setForms] = useState([
    {
      source: "F&G",
      type: "",
      vendorName: "",
      referenceBase: "",
      markup: 0,
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      totalCost: 0,
      totalPrice: 0,
      invoice: "",
      PO: "",
      isTaxable: true,
      startDate: Date.now(),
      endDate: Date.now(),
    },
  ]);
  const [materials, setMaterials] = useState([]);
  const [disableBtn, setDisableBtn] = useState(false);
  const [jobTypes, setJobTypes] = useState([]);
  const [jobType, setJobType] = useState("");
  const [laborData, setLaborData] = useState([]);
  const [adminTax, setAdminTax] = useState(0);
  const [address, setAddress] = useState("");
  const [initialBids, setInitialBids] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();
  const [laborForms, setLaborForms] = useState([
    {
      laborCount: 1,
      totalManHours: 1,
      type: "",
      perHourCost: 1,
      totalLaborCost: 0,
    },
  ]);

  const { tableSize } = useTableContext();

  useEffect(() => {
    getProjectById();
    getJobTypeById();
    getBidedFieldCopyData();
    getMaterials();
    getTaxPercentage();
    getJobTypes();
    getFGAddress();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    getJobTypeById();
  }, [formData]);

  const getProjectById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-project/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        // if (!response.data.result.isProjectStarted) {
        //   navigate(-1);
        // }

        setFormData(response.data.result);

        let emptyBided = response.data?.result?.bidedCopy;
        emptyBided = emptyBided.filter((bid) => {
          return bid.copies.length === 0;
        });

        setInitialBids(emptyBided);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const getFGAddress = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-fg-address`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setAddress(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const getBidedFieldCopyData = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-bided-field-copy/${id}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        let compiledForms = compileMaterials(
          response.data.result.bidedCopiesData || []
        );
        compiledForms = compiledForms.map((form) => {
          form.intialReference = form.reference;
          form.initialJobType = form.type;
          form.referenceBase = materialNameBaseForEdit(
            String(form.reference || ""),
            form.vendorName
          );
          return form;
        });

        setForms(compiledForms);
        const laborData = response.data.result.laborData
          .filter((labor) => labor.totalPrice !== 0)
          .map((laborData) => ({
            laborCount: 1,
            totalManHours: 1,
            type: laborData.jobType,
            perHourCost: 1,
            totalLaborCost: laborData.totalPrice,
          }));
        setLaborForms(laborData || []);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  // console.log("Labors Forms", laborForms);

  const compileMaterials = (forms) => {
    const compiled = {};

    forms.forEach((form) => {
      const { reference, measure, quantity, price, totalPrice, type } = form;
      // Use both reference and measure as the key
      const key = `${reference}-${type}-${measure}-${price}`;

      if (compiled[key]) {
        compiled[key].quantity += parseFloat(quantity);
        compiled[key].totalPrice += parseFloat(totalPrice);
      } else {
        compiled[key] = {
          ...form,
          quantity: parseFloat(quantity),
          totalPrice: parseFloat(totalPrice),
        };
      }
    });

    return Object.values(compiled);
  };

  const compileFormData = (forms) => {
    const compiled = {};

    forms.forEach((form) => {
      const persisted = toPersistedCopy(form);
      const { reference, measure, quantity, price, totalPrice, type } = persisted;
      // Use both reference and measure as the key
      const key = `${type}-${reference}`;

      if (compiled[key]) {
        compiled[key].quantity += parseFloat(quantity);
        compiled[key].totalPrice += parseFloat(totalPrice);
      } else {
        compiled[key] = {
          ...persisted,
          quantity: parseFloat(quantity),
          totalPrice: parseFloat(totalPrice),
        };
      }
    });

    return Object.values(compiled);
  };

  // const groupByType = (compiledData, laborData) => {
  //   const groupedData = compiledData.reduce((acc, item) => {
  //     const { type, ...copyData } = item;

  //     // Find the existing jobType group in the accumulator (array)
  //     const existingGroup = acc.find((group) => group.jobType === type);

  //     // Find the labor data for this jobType
  //     const laborInfo = laborData.find((labor) => labor.jobType === type);

  //     // Get labor cost and taxable status, default to 0 and false if not found
  //     const totalCost = laborInfo ? laborInfo.totalPrice : 0;
  //     const isLaborTaxable = laborInfo ? laborInfo.isLaborTaxable : false;

  //     if (existingGroup) {
  //       // Add the current item's totalLaborCost to the jobType level totalLaborCost
  //       existingGroup.totalCost = totalCost;

  //       // If any labor data under the same jobType is taxable, mark jobType as taxable
  //       if (isLaborTaxable) {
  //         existingGroup.isLaborTaxable = true;
  //       }

  //       // Push the copy (other details) into the copies array under the same jobType
  //       existingGroup.copies.push({
  //         ...copyData,
  //         type,
  //       });
  //     } else {
  //       // If the jobType does not exist in the array, create a new entry
  //       acc.push({
  //         jobType: type, // Set the jobType
  //         totalCost: totalCost, // Initialize totalLaborCost
  //         isLaborTaxable: isLaborTaxable, // Set isLaborTaxable
  //         copies: [{ ...copyData, type }], // Initialize the copies array with the first copy
  //       });
  //     }

  //     return acc;
  //   }, []); // Start with an empty array to accumulate the groups

  //   return groupedData;
  // };
  // console.log("-------------------------");
  // const groupByType = (compiledData, laborData) => {

  //   console.log("Group By Data", compiledData, laborData);

  //   const groupedData = compiledData.reduce((acc, item) => {
  //     const { type, ...copyData } = item;

  //     // Find the existing group in the accumulator by jobType
  //     let existingGroup = acc.find((group) => group.jobType === type);

  //     // Find the corresponding labor information for the current type
  //     const laborInfo = laborData.find((labor) => labor.jobType === type);

  //     // Get labor cost and taxable status, default to 0 and false if not found
  //     const laborCost = laborInfo ? laborInfo.totalPrice : 0;
  //     const isLaborTaxable = laborInfo ? laborInfo.isLaborTaxable : false;

  //     if (existingGroup) {
  //       // Set the labor cost only once, not for every copy
  //       if (existingGroup.totalCost === 0) {
  //         existingGroup.totalCost = laborCost;
  //       }

  //       // If any labor is taxable, set the group as taxable
  //       if (isLaborTaxable) {
  //         existingGroup.isLaborTaxable = true;
  //       }

  //       // Add the current item's details to the copies array
  //       existingGroup.copies.push({ ...copyData, type });
  //     } else {
  //       // Create a new entry if the jobType does not exist in the accumulator
  //       acc.push({
  //         jobType: type,
  //         totalCost: laborCost, // Set the labor cost once
  //         isLaborTaxable: isLaborTaxable,
  //         copies: [{ ...copyData, type }],
  //       });
  //     }

  //     return acc;
  //   }, []); // Start with an empty array to accumulate the groups

  //   // Add any labor data that doesn't exist in compiledData
  //   laborData.forEach((labor) => {
  //     const { jobType, totalPrice, isLaborTaxable } = labor;

  //     // Check if this labor jobType already exists in groupedData
  //     if (!groupedData.find((group) => group.jobType === jobType)) {
  //       groupedData.push({
  //         jobType,
  //         totalCost: totalPrice,
  //         isLaborTaxable,
  //         copies: [], // No corresponding compiledData, so copies are empty
  //       });
  //     }
  //   });

  //   return groupedData;
  // };

  // const groupByType = (compiledData, laborData) => {
  //   const groupedData = compiledData.reduce((acc, item) => {
  //     const { type, ...copyData } = item;

  //     // Find the existing group in the accumulator by jobType
  //     let existingGroup = acc.find((group) => group.jobType === type);

  //     // Find the corresponding labor information for the current type
  //     const laborInfo = laborData.find((labor) => labor.jobType === type);

  //     // Get labor cost and taxable status, default to 0 and false if not found
  //     const laborCost = laborInfo ? laborInfo.totalPrice : 0;
  //     const isLaborTaxable = laborInfo ? laborInfo.isLaborTaxable : false;

  //     if (existingGroup) {
  //       // Update the totalCost by adding labor cost (if available)
  //       existingGroup.totalCost += laborCost;

  //       // If any labor is taxable, set the group as taxable
  //       if (isLaborTaxable) {
  //         existingGroup.isLaborTaxable = true;
  //       }

  //       // Add the current item's details to the copies array
  //       existingGroup.copies.push({ ...copyData, type });
  //     } else {
  //       // Create a new entry if the jobType does not exist in the accumulator
  //       acc.push({
  //         jobType: type,
  //         totalCost: laborCost,
  //         isLaborTaxable: isLaborTaxable,
  //         copies: [{ ...copyData, type }],
  //       });
  //     }

  //     return acc;
  //   }, []); // Start with an empty array to accumulate the groups

  //   // Add any labor data that doesn't exist in compiledData
  //   laborData.forEach((labor) => {
  //     const { jobType, totalPrice, isLaborTaxable } = labor;

  //     // Check if this labor jobType already exists in groupedData
  //     if (!groupedData.find((group) => group.jobType === jobType)) {
  //       groupedData.push({
  //         jobType,
  //         totalCost: totalPrice,
  //         isLaborTaxable,
  //         copies: [], // No corresponding compiledData, so copies are empty
  //       });
  //     }
  //   });

  //   return groupedData;
  // };

  const groupByType = (compiledData, laborForms, jobTypes) => {
    // console.log("Group By Data", compiledData, laborForms, jobTypes);

    const groupedData = compiledData.reduce((acc, item) => {
      const { type, ...copyData } = item;

      // Find the existing group in the accumulator by jobType
      let existingGroup = acc.find((group) => group.jobType === type);

      // Find the corresponding labor information for the current type
      const laborInfo = laborForms.find((labor) => labor.type === type);

      // Find the job type information from jobTypes array
      const jobTypeInfo = jobTypes.find((job) => job.jobName === type);

      // Get labor cost and taxable status
      const laborCost = laborInfo ? laborInfo.totalLaborCost : 0;
      const isLaborTaxable = jobTypeInfo
        ? jobTypeInfo.isTaxable || false
        : false;

      if (existingGroup) {
        // Set the labor cost only once, not for every copy
        if (existingGroup.totalCost === 0) {
          existingGroup.totalCost = laborCost;
        }

        // If the job type is taxable, set the group as taxable
        existingGroup.isLaborTaxable = isLaborTaxable;

        // Add the current item's details to the copies array
        existingGroup.copies.push({ ...copyData, type });
      } else {
        // Create a new entry if the jobType does not exist in the accumulator
        acc.push({
          jobType: type,
          totalCost: laborCost, // Set the labor cost once
          isLaborTaxable: isLaborTaxable, // Determine from jobTypeInfo
          copies: [{ ...copyData, type }],
        });
      }

      return acc;
    }, []); // Start with an empty array to accumulate the groups

    // Add any labor data that doesn't exist in compiledData
    laborForms.forEach((labor) => {
      const { type, totalLaborCost } = labor;

      // Find the job type information from jobTypes array
      const jobTypeInfo = jobTypes.find((job) => job.jobName === type);

      // Check if this labor type already exists in groupedData
      if (!groupedData.find((group) => group.jobType === type)) {
        groupedData.push({
          jobType: type,
          totalCost: totalLaborCost,
          isLaborTaxable: jobTypeInfo ? jobTypeInfo.isTaxable || false : false,
          copies: [], // No corresponding compiledData, so copies are empty
        });
      }
    });

    return groupedData;
  };

  const getJobTypeById = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      if (!formData.jobType) {
        return;
      }
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-job-type/${formData.jobType}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setJobType(response.data.result.jobName);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  const handleInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedForms = [...forms];

    if (name === "source") {
      updatedForms[index] = {
        ...updatedForms[index],
        [name]: value,
        type: value.includes("Lump Sum") ? value : "",
        reference: "",
        referenceBase: "",
        measure: "",
        quantity: "",
        price: "",
        totalPrice: "",
        isTaxable: true,
      };
    }

    if (name === "type") {
      updatedForms[index] = {
        ...updatedForms[index],
        [name]: value,
        reference: "",
        referenceBase: "",
        measure: "",
        quantity: "",
        price: "",
        totalPrice: "",
        isTaxable: true,
      };
    }

    const updatedForm = { ...updatedForms[index], [name]: value };

    // if (name === "vendorName") {
    //   if (containsNumberOrSpecialChar(e.target.value)) {
    //     toast.error(
    //       "Vendor name cannot contain numbers or special characters."
    //     );
    //     return;
    //   }
    // }

    // if (name === "reference") {
    //   if (containsNumberOrSpecialChar(e.target.value)) {
    //     toast.error(
    //       "Material name cannot contain numbers or special characters."
    //     );
    //     return;
    //   }
    // }

    // if (name === "measure") {
    //   if (containsNumberOrSpecialChar(e.target.value)) {
    //     toast.error("Measure cannot contain numbers or special characters.");
    //     return;
    //   }
    // }

    // Calculate total price if both price and quantity are filled
    if (name === "price" || name === "quantity") {
      const price = parseFloat(updatedForm.price) || 0;
      const quantity = parseFloat(updatedForm.quantity) || 0;
      if (updatedForm.source === "Other") {
        updatedForm.totalCost = price && quantity ? price * quantity : "";
        const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
        const markup = parseFloat(updatedForm.markup) || 0;

        if (false) {
          const intermediatePrice =
            updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
          updatedForm.totalPrice =
            intermediatePrice + (adminTax * intermediatePrice) / 100;
        } else {
          updatedForm.totalPrice =
            updatedForm.totalCost +
            (updatedForm.markup * updatedForm.totalCost) / 100;
        }
      } else {
        updatedForm.totalPrice = price && quantity ? price * quantity : "";
        updatedForm.totalCost = price && quantity ? price * quantity : "";
      }
    }

    if (name === "markup") {
      const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
      const markup = parseFloat(updatedForm.markup) || 0;
      if (false) {
        const intermediatePrice =
          updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
        updatedForm.totalPrice =
          intermediatePrice + (adminTax * intermediatePrice) / 100;
      } else {
        updatedForm.totalPrice =
          updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
      }
    }

    if (name === "isTaxable") {
      const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
      const markup = parseFloat(updatedForm.markup) || 0;

      if (false) {
        const intermediatePrice =
          updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
        updatedForm.totalPrice =
          intermediatePrice + (adminTax * intermediatePrice) / 100;
      } else {
        const intermediatePrice =
          updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
        updatedForm.totalPrice =
          intermediatePrice + (0 * intermediatePrice) / 100;
      }
      updatedForm.isTaxable = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
    }

    if (name === "reference") {
      updatedForm.referenceBase = value;
    }

    updatedForms[index] = applyReferenceVendorToForm(updatedForm);
    setForms(updatedForms);
  };

  const handleMaterialChange = (e, index) => {
    const materialName = e;
    // const materialName = e.target.value;
    const material = materials.find(
      (material) => material.name === materialName
    );
    const updatedForms = [...forms];
    const row = {
      ...updatedForms[index],
      referenceBase: material.name,
      reference: material.name,
      measure: material.measure,
      price: material.price,
      isTaxable: material.isTaxable,
      totalPrice:
        Number.parseFloat(material.price) *
        Number.parseFloat(forms[index].quantity),
    };
    updatedForms[index] = applyReferenceVendorToForm(row);
    setForms(updatedForms);
  };

  const handleLaborFormInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedForms = [...laborForms];

    const updatedForm = { ...updatedForms[index], [name]: value };

    if (name === "type") {
      // const val = e.target.value;
      updatedForm.type = value;
      // updatedForm.perHourCost = jobTypes.find(
      //   (job) => job.jobName === val
      // ).price;

      // const laborCount = 1;
      // const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
      // const totalManHours = 1;
      // const perHourCost = parseFloat(updatedForm.perHourCost) || 0;
      // const perHourCost = 1;

      // updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
      updatedForm.totalLaborCost = 0;
    }

    if (name === "totalLaborCost") {
      const amount = Number.parseFloat(value);
      if (amount < 0) {
        toast.error("Total labor cost cannot be negative.");
        updatedForm.totalLaborCost = 0;
        return;
      }
      updatedForm.totalLaborCost = amount;
    }

    // if (name === "laborCount") {
    //   updatedForm.laborCount = parseFloat(e.target.value);
    // }

    // if (name === "totalManHours") {
    //   updatedForm.totalManHours = parseFloat(e.target.value);
    // }

    // if (
    //   name === "laborCount" ||
    //   name === "totalManHours" ||
    //   name === "perHourCost"
    // ) {
    //   const laborCount = 1;
    //   const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
    //   const perHourCost = parseFloat(updatedForm.perHourCost) || 0;

    //   updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
    // }

    updatedForms[index] = updatedForm;
    setLaborForms(updatedForms);
  };

  const addLaborForm = () => {
    setLaborForms((prevForms) => [
      ...prevForms,
      {
        laborCount: 1,
        totalManHours: 1,
        type: "",
        perHourCost: 1,
        totalLaborCost: 0,
      },
    ]);
  };

  const deleteLaborForm = (index) => {
    const updatedLaborForms = laborForms.filter((_, i) => i !== index);
    setLaborForms(updatedLaborForms);
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const deleteForm = (index) => {
    const updatedForms = forms.filter((_, i) => i !== index);
    setForms(updatedForms);
  };

  const addForm = () => {
    setForms([
      ...forms,
      {
        source: "F&G",
        type: "",
        vendorName: "",
        referenceBase: "",
        markup: 0,
        reference: "",
        measure: "",
        quantity: "",
        price: "",
        PO: "",
        invoice: "",
        totalPrice: "",
        isTaxable: true,
      },
    ]);
  };

  const getTaxPercentage = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/staff/get-tax-percent`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setAdminTax(response.data.result.taxPercent);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  // Function to handle price updates
  const handlePriceChange = (jobType, value) => {
    const updatedLaborData = laborData.map((labor) => {
      if (labor.jobType === jobType) {
        return { ...labor, totalPrice: parseFloat(value) || 0 }; // Ensure a number
      }
      return labor;
    });
    setLaborData(updatedLaborData);
  };

  const getJobTypes = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-job-types-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setJobTypes(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getMaterials = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-materials-dpd`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setMaterials(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatedForms = compileFormData(forms);
    let groupedForms = groupByType(updatedForms, laborForms, jobTypes);
    // console.log("Grouped Form", groupedForms);
    // return;
    try {
      // Validate endTime > startTime for each form entry
      //   const isValid = forms.every((formData) => {
      //     const startTime = new Date(`1970-01-01T${formData.startDate}`);
      //     const endTime = new Date(`1970-01-01T${formData.endDate}`);
      //     return endTime > startTime;
      //   });

      //   if (!isValid) {
      //     toast.error(
      //       "End time must be greater than start time for all entries."
      //     );
      //     return;
      //   }

      // let isValidPrice = forms.some((form) => {
      //   return (
      //     Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
      //       Number.parseFloat(form.totalPrice) && form.source === "F&G"
      //   );
      // });

      // if (isValidPrice) {
      //   toast.error("Please ensure all field copies have valid prices.");
      //   return;
      // }

      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);

      const formdata = new FormData();

      formdata.append("forms", JSON.stringify(groupedForms));

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-bided-field-copy/${id}`,
        formdata,
        {
          headers: headers,
        }
      );

      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        navigate(-1);
      } else {
        toast.error(response.data.message);
      }

      // navigate(`/panel/office/project/view/${id}`);
    } catch (error) {
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  function formatDate(dateString) {
    const options = { day: "2-digit", month: "long", year: "numeric" };
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", options); // Use 'en-GB' to get the desired format
  }

  const [dropdownVisibility, setDropdownVisibility] = useState(
    forms.map(() => false) // Initialize visibility for each form
  );
  const [searchTerm, setSearchTerm] = useState(""); // Track search term for filtering
  const dropdownRefs = useRef([]);

  const toggleDropdownVisibility = (index) => {
    const updatedVisibility = [...dropdownVisibility];

    // Reset all dropdowns to false except the one being toggled
    updatedVisibility.forEach((_, i) => {
      if (i !== index) updatedVisibility[i] = false;
    });

    // Toggle the current dropdown
    updatedVisibility[index] = !updatedVisibility[index];

    setDropdownVisibility(updatedVisibility);

    // Reset search term when opening a new dropdown
    if (updatedVisibility[index]) {
      setSearchTerm("");
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Check if the clicked element is not inside any of the dropdowns
      if (
        dropdownRefs.current.every((ref) => ref && !ref.contains(event.target))
      ) {
        setDropdownVisibility(forms.map(() => false)); // Close all dropdowns
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [forms]); // No need to include dropdownVisibility in the dependency array

  // Handle search term change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <Layout>
      <ToastContainer />
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title mt-1"><button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}Edit Bided Copy</h3>
            </div>
            <div className="mt-6 p-6 " id="">
              <div className="flex flex-col md:flex-row gap-6 justify-around">
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Bidding Date</h6>
                    <p>
                      {formData?.createdAt
                        ? formatDate(formData.createdAt)
                        : ""}
                    </p>
                  </div>
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Customer Name</h6>
                    <p>{formData?.customerName}</p>
                  </div>
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Job Address</h6>
                    <p>{formData?.jobAddress}</p>
                  </div>
                  {formData.customerEmail && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Email</h6>
                      <p>{formData?.customerEmail}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col w-[300px]">
                  {formData.projectCode && (
                    <div className="p-2">
                      <h6 className="font-bold text-[17px]">Project Code</h6>
                      <p>{formData.projectCode}</p>
                    </div>
                  )}
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">Job Type</h6>
                    <p>{jobType}</p>
                  </div>
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">
                      Description of work
                    </h6>
                    <p>{parse(formData.description)}</p>
                  </div>
                </div>
                <div className="flex flex-col w-[300px]">
                  <div className="p-2">
                    <h6 className="font-bold text-[17px]">F&G INC</h6>
                    <pre
                      className="text-base break-words p-0 pb-3"
                      style={{ fontFamily: "Source Sans Pro" }}
                    >
                      {address}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-10">
              <form onSubmit={handleSubmit}>
                <div className="card-body">
                  {forms.map((formData, index) => (
                    <div
                      key={index}
                      className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative"
                    >
                      <div className="form-group flex flex-col">
                        <label htmlFor={`source-${index}`}>Source *</label>
                        <select
                          name="source"
                          onChange={(e) => handleInputChange(e, index)}
                          id={`source-${index}`}
                          className="border-b border-[grey] outline-none w-[180px]"
                          value={formData.source}
                          required
                        >
                          {/* <option value="">Select Source</option> */}
                          <option value="F&G">F&G</option>
                          <option value="Other">Other</option>
                          <option value="Lump Sum">Lump Sum</option>
                          <option value="Labor">Labor</option>
                          {/* <option value="Drainage Lump Sum">Drainage Lump Sum</option>
                        <option value="Electrical Lump Sum">Electrical Lump Sum</option>
                        <option value="Hardscape Lump Sum">Hardscape Lump Sum</option>
                        <option value="Irrigation Lump Sum">Irrigation Lump Sum</option>
                        <option value="Landscape Lump Sum">Landscape Lump Sum</option>
                        <option value="Mosquito Lump Sum">Mosquito Lump Sum</option>
                        <option value="Plumbing Lump Sum">Plumbing Lump Sum</option>
                        <option value="Pool Lump Sum">Pool Lump Sum</option> */}
                        </select>
                      </div>

                      {formData.source === "F&G" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>
                              Material Type *
                            </label>
                            <select
                              name="type"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              required
                              // disabled
                            >
                              <option value="">Select</option>
                              {jobTypes
                                .filter((item) => {
                                  return (
                                    item.status === "Active" ||
                                    item.jobName === formData.initialJobType
                                  );
                                })
                                .map((item, index) => (
                                  <option
                                    key={index}
                                    value={item.jobName}
                                    className={
                                      item.status === "Delete"
                                        ? "text-[red]"
                                        : "text-[black]"
                                    }
                                  >
                                    {item.jobName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          {/* <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Material Name
                            </label>
                            <select
                              name="reference"
                              onChange={(e) => handleMaterialChange(e, index)}
                              id={`reference-${index}`}
                              className="border-b border-[grey] outline-none"
                              value={getMaterialNameInputValue(formData)}
                              required
                            >
                              <option value="">Select One</option>
                              {materials
                                .filter((item) => {
                                  return (
                                    item.status === "Active" ||
                                    item.name === formData.intialReference
                                  );
                                })
                                .map((material) => (
                                  <option
                                    key={material?._id}
                                    value={material.name}
                                    className={
                                      material.status === "Delete"
                                        ? "text-[red]"
                                        : "text-[black]"
                                    }
                                  >
                                    {material.name}
                                  </option>
                                ))}
                            </select>
                          </div> */}
                          <div
                            className="form-group flex flex-col w-[180px] relative cursor-pointer"
                            key={index}
                            ref={(el) => (dropdownRefs.current[index] = el)} // Assign ref to each dropdown
                          >
                            <label htmlFor={`reference-${index}`}>
                              Material Name *
                            </label>
                            <div className="relative cursor-pointer">
                              <div
                                className=""
                                onClick={() => toggleDropdownVisibility(index)}
                              >
                                <input
                                  type="text"
                                  id={`materialName-${index}`}
                                  name={`materialName-${index}`}
                                  className="border-b border-[grey] outline-none w-[180px] pr-3 cursor-pointer"
                                  value={getMaterialNameInputValue(formData)}
                                  readOnly
                                  placeholder="Select Material Name"
                                  // onClick={() => toggleDropdownVisibility(index)} // Toggle dropdown
                                  required
                                />
                                <span className="absolute right-0 cursor-pointer">
                                  <i className="fa fa-caret-down"></i>
                                </span>
                              </div>

                              {dropdownVisibility[index] && (
                                <div className="h-[400px] w-[200px] scrollbar-content overflow-y-auto absolute top-[100%] bg-[white] shadow-md mt-1 z-10">
                                  {/* Search Input */}
                                  <input
                                    type="text"
                                    className="w-full px-2 py-1 border-b"
                                    placeholder="Search material..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                  />
                                  {/* Filtered and Searched Materials */}
                                  {materials
                                    .filter(
                                      (item) =>
                                        item.status === "Active" &&
                                        item.name
                                          .toLowerCase()
                                          .includes(searchTerm.toLowerCase())
                                    )
                                    .map((material) => (
                                      <div
                                        key={material?._id}
                                        onClick={() => {
                                          handleMaterialChange(
                                            material.name,
                                            index
                                          );
                                          toggleDropdownVisibility(index); // Close dropdown
                                        }}
                                        className="text-sm hover:bg-[#e3e3e3] cursor-pointer p-2"
                                      >
                                        {material.name}
                                      </div>
                                    ))}

                                  {/* No Results Found */}
                                  {materials.filter(
                                    (item) =>
                                      item.status === "Active" &&
                                      item.name
                                        .toLowerCase()
                                        .includes(searchTerm.toLowerCase())
                                  ).length === 0 && (
                                    <div className="p-2 text-gray-500 text-center text-sm">
                                      No materials found
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {formData.source === "Other" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>
                              Material Type *
                            </label>
                            <select
                              name="type"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              required
                              // disabled
                            >
                              <option value="">Select</option>
                              {jobTypes
                                .filter((item) => {
                                  return (
                                    item.status === "Active" ||
                                    item.jobName === formData.initialJobType
                                  );
                                })
                                .map((item, index) => (
                                  <option
                                    key={index}
                                    value={item.jobName}
                                    className={
                                      item.status === "Delete"
                                        ? "text-[red]"
                                        : "text-[black]"
                                    }
                                  >
                                    {item.jobName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`vendorName-${index}`}>
                              Vendor Name
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`vendorName-${index}`}
                              name="vendorName"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.vendorName}
                              placeholder="Enter Vendor Name"
                              // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Material Name *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`reference-${index}`}
                              name="reference"
                              onChange={(e) => handleInputChange(e, index)}
                              value={getMaterialNameInputValue(formData)}
                              placeholder="Enter Name"
                              maxLength={100}
                              required
                            />
                          </div>
                         
                        </>
                      )}

                      {formData.source === "Labor" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>Job Type *</label>
                            <select
                              name="type"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              required
                              // disabled
                            >
                              <option value="">Select</option>
                              {/* <option value={fieldJobType}>{fieldJobType}</option> */}
                              {jobTypes
                                .filter((item) => {
                                  return item.status === "Active";
                                })
                                .map((item, index) => (
                                  <option key={index} value={item.jobName}>
                                    {item.jobName}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`vendorName-${index}`}>
                              Vendor Name
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`vendorName-${index}`}
                              name="vendorName"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.vendorName}
                              placeholder="Enter Vendor Name"
                              maxLength={50}
                              // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Description *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`reference-${index}`}
                              name="reference"
                              onChange={(e) => handleInputChange(e, index)}
                              value={getMaterialNameInputValue(formData)}
                              maxLength={100}
                              placeholder="Enter Description"
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`source-${index}`}>Taxable *</label>
                            <select
                              name="isTaxable"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`isTaxable-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.isTaxable}
                              required
                            >
                              <option value="">Select Option</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                        </>
                      )}

                      {formData.source.includes("Lump Sum") && (
                        <>
                          <div className="form-group flex flex-col hidden">
                            <label htmlFor={`type-${index}`}>
                              Material Type
                            </label>
                            <select
                              name="type"
                              // onChange={(e) => handleInputChange(e, index)}
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value="Lump Sum"
                              required
                              // disabled
                            >
                              <option value="">Select</option>
                              <option value="Lump Sum">Lump Sum</option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`type-${index}`}>
                              Lump Sum Type
                            </label>
                            <select
                              name="type"
                              id={`type-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.type}
                              onChange={(e) => handleInputChange(e, index)}
                              required
                            >
                              <option value="">Select</option>
                              <option value="Lump Sum">Lump Sum</option>
                              <option value="Drainage Lump Sum">
                                Drainage Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Electrical Lump Sum">
                                Electrical Lump Sum (Sales Tax Paid on
                                Materials)
                              </option>
                              <option value="Hardscape Lump Sum">
                                Hardscape Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Irrigation Lump Sum">
                                Irrigation Lump Sum (Sales Tax Paid on
                                Materials)
                              </option>
                              <option value="Landscape Lump Sum">
                                Landscape Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Mosquito Lump Sum">
                                Mosquito Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Plumbing Lump Sum">
                                Plumbing Lump Sum (Sales Tax Paid on Materials)
                              </option>
                              <option value="Pool Lump Sum">
                                Pool Lump Sum (Sales Tax Paid on Materials)
                              </option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`vendorName-${index}`}>
                              Vendor Name
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`vendorName-${index}`}
                              name="vendorName"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.vendorName}
                              placeholder="Enter Vendor Name"
                              // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`reference-${index}`}>
                              Description *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`reference-${index}`}
                              name="reference"
                              onChange={(e) => handleInputChange(e, index)}
                              value={getMaterialNameInputValue(formData)}
                              placeholder="Enter Name"
                              maxLength={100}
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`source-${index}`}>Taxable *</label>
                            <select
                              name="isTaxable"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`isTaxable-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.isTaxable}
                              required
                            >
                              <option value="">Select Option</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                        </>
                      )}

                      {["F&G", "Other"].includes(formData.source) && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`measure-${index}`}>
                              Measure *
                            </label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`measure-${index}`}
                              name="measure"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.measure}
                              placeholder="Enter measure"
                              readOnly={
                                formData.source === "Other" ? false : true
                              }
                              required
                            />
                          </div>

                          <div className="form-group flex flex-col">
                            <label htmlFor={`quantity-${index}`}>
                              Quantity *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`quantity-${index}`}
                              name="quantity"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.quantity}
                              placeholder="Enter Quantity"
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>

                          <div className="form-group flex flex-col">
                            <label htmlFor={`price-${index}`}>Price *</label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none"
                              id={`price-${index}`}
                              name="price"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.price}
                              placeholder="Enter Price"
                              // readOnly={
                              //   formData.source === "Other" ? false : true
                              // }
                              min={0}
                              max={10000000}
                              step="any"
                              required
                            />
                          </div>

                          
                        </>
                      )}

                      {formData.source === "Other" && (
                        <>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`totalCost-${index}`}>
                              Cost *
                            </label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none"
                              id={`totalCost-${index}`}
                              name="totalCost"
                              placeholder="Total cost goes here ..."
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.totalCost}
                              min={0}
                              required
                              readOnly
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`markup-${index}`}>Mark up</label>
                            <input
                              type="number"
                              className="border-b border-[grey] outline-none w-[180px]"
                              id={`markup-${index}`}
                              name="markup"
                              placeholder="Enter percent"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData?.markup}
                              min={0}
                              max={10000000}
                              required
                            />
                          </div>
                          <div className="form-group flex flex-col">
                            <label htmlFor={`source-${index}`}>Taxable</label>
                            <select
                              name="isTaxable"
                              onChange={(e) => handleInputChange(e, index)}
                              id={`isTaxable-${index}`}
                              className="border-b border-[grey] outline-none w-[180px]"
                              value={formData.isTaxable}
                              required
                            >
                              <option value="">Select Option</option>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`invoice-${index}`}>Invoice</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`invoice-${index}`}
                              name="invoice"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.invoice}
                              placeholder="Enter invoice"
                              // required
                            />
                          </div>
                          <div className="form-group flex flex-col w-[180px]">
                            <label htmlFor={`PO-${index}`}>P.O.</label>
                            <input
                              type="text"
                              className="border-b border-[grey] outline-none"
                              id={`PO-${index}`}
                              name="PO"
                              onChange={(e) => handleInputChange(e, index)}
                              value={formData.PO}
                              placeholder="Enter PO"
                              // required
                            />
                          </div>
                        </>
                      )}

                      {["F&G", "Other"].includes(formData.source) ? (
                        <div className="form-group flex flex-col">
                          <label htmlFor={`totalPrice-${index}`}>
                            Total Price *
                          </label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none"
                            id={`totalPrice-${index}`}
                            name="totalPrice"
                            placeholder="Total price goes here..."
                            value={formData.totalPrice}
                            readOnly
                            min={0}
                            step="any"
                            required
                          />
                        </div>
                      ) : (
                        <div className="form-group flex flex-col">
                          <label htmlFor={`totalPrice-${index}`}>
                            Total Price *
                          </label>
                          <input
                            type="number"
                            className="border-b border-[grey] outline-none"
                            id={`totalPrice-${index}`}
                            name="totalPrice"
                            placeholder="Total price goes here..."
                            value={formData.totalPrice}
                            onChange={(e) => handleInputChange(e, index)}
                            min={0}
                            max={10000000}
                            step="any"
                            required
                          />
                        </div>
                      )}

                      {formData.reference && formData.source === "F&G" && (
                        <div className="form-group flex flex-col">
                          <label htmlFor={`isTaxable-${index}`}>Taxable</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`isTaxable-${index}`}
                            name="isTaxable"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.isTaxable ? "Yes" : "No"}
                            placeholder="Enter isTaxable"
                            disabled={true}
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
                        onClick={() => deleteForm(index)}
                      >
                        <i className="fa fa-close text-white"></i>
                      </button>
                    </div>
                  ))}
                  <div className="text-center">
                    <button
                      type="button"
                      className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                      onClick={addForm}
                    >
                      <i className="fa fa-plus"></i>
                    </button>
                  </div>

                  {/* Compiled data by Job Type */}
                  {/* <div className="mt-10">
                    {laborData
                      // .filter((labor) => labor.totalPrice !== 0)
                      .map((labor) => {
                        return (
                          <div className="flex justify-between mt-1">
                            <span>
                              <b>{labor.jobType} Labor</b>
                            </span>
                            <input
                              type="number"
                              value={labor.totalPrice}
                              className="outline-none border-2 pl-2 border-[grey] rounded-sm"
                              placeholder="Enter Price"
                              min={0}
                              step="any"
                              onChange={(e) =>
                                handlePriceChange(labor.jobType, e.target.value)
                              } // Update price on change
                            />
                          </div>
                        );
                      })}
                  </div> */}
                  {/* Labor logic */}
                  <div className="p-2">
                    {laborForms.length > 0 &&
                      laborForms.map((formData, index) => {
                        return (
                          <div className="flex flex-wrap justify-between gap-x-6 mt-4 shadow-md p-4 relative">
                            <button
                              type="button"
                              className="absolute top-3 right-3 bg-red-500 h-[30px] w-[30px] rounded-full"
                              onClick={() => deleteLaborForm(index)}
                            >
                              <i className="fa fa-close text-white"></i>
                            </button>
                            <div className="form-group flex flex-col w-[180px] hidden">
                              <label htmlFor={`laborCount-${index}`}>
                                Labor Count
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`laborCount-${index}`}
                                name="laborCount"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.laborCount}
                                placeholder="Enter Labor Count"
                                min={0}
                                max={10000000}
                                required
                              />
                            </div>

                            <div className="form-group flex flex-col w-[180px] hidden">
                              <label htmlFor={`totalManHours-${index}`}>
                                Total Man Hours
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`totalManHours-${index}`}
                                name="totalManHours"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.totalManHours}
                                placeholder="Enter Man Hours"
                                min={0}
                                max={10000000}
                                required
                              />
                            </div>

                            <div className="form-group flex flex-col w-[180px]">
                              <label htmlFor={`type-${index}`}>
                                Job Type *
                              </label>
                              <select
                                name="type"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                id={`type-${index}`}
                                className="border-b border-[grey] outline-none"
                                value={formData.type}
                                required
                              >
                                <option value="">Select One</option>
                                {jobTypes
                                  .filter((item) => {
                                    return item.status === "Active";
                                  })
                                  .map((job) => (
                                    <option key={job?._id} value={job.jobName}>
                                      {job.jobName}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="form-group flex flex-col w-[180px] hidden">
                              <label htmlFor={`perHourCost-${index}`}>
                                Per Hour Cost
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`perHourCost-${index}`}
                                name="perHourCost"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.perHourCost}
                                placeholder="Enter Per Hour Cost"
                                required
                                min={0}
                                readOnly
                              />
                            </div>

                            <div className="form-group flex flex-col w-[180px] mr-8">
                              <label htmlFor={`totalLaborCost-${index}`}>
                                Total Labor Cost *
                              </label>
                              <input
                                type="number"
                                className="border-b border-[grey] outline-none"
                                id={`totalLaborCost-${index}`}
                                name="totalLaborCost"
                                onChange={(e) =>
                                  handleLaborFormInputChange(e, index)
                                }
                                value={formData.totalLaborCost}
                                placeholder="Total cost goes here..."
                                min={0}
                                max={10000000}
                                step="any"
                                // readOnly
                                required
                              />
                            </div>
                          </div>
                        );
                      })}
                    <div className="text-center mt-8">
                      <button
                        type="button"
                        title="Add Labor"
                        className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                        onClick={addLaborForm}
                      >
                        <i className="fa fa-plus"></i>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-footer">
                  <button
                    type="submit"
                    className="btn bg-[#00613e] text-white"
                    disabled={disableBtn}
                  >
                    {disableBtn ? "Please wait..." : "Edit Bided Copy"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
