// import React, { useEffect, useRef, useState } from "react";
// import Layout from "../../layout/Layout";
// import axios from "axios";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useTableContext } from "../../../context/TableContext";
// import { useNavigate, useParams } from "react-router-dom";

// export default function EditDraftCopyForm() {
//   const [forms, setForms] = useState([
//     {
//       source: "F&G",
//       type: "",
//       vendorName: "",
//       markup: 0,
//       reference: "",
//       measure: "",
//       quantity: "",
//       price: "",
//       totalCost: 0,
//       totalPrice: 0,
//       invoice: "",
//       PO: "",
//       isTaxable: true,
//       startDate: Date.now(),
//       endDate: Date.now(),
//     },
//   ]);
//   const [laborForms, setLaborForms] = useState([
//     {
//       laborCount: 1,
//       totalManHours: 0,
//       type: "",
//       perHourCost: 0,
//       totalLaborCost: 0,
//     },
//   ]);
//   const [startTime, setStartTime] = useState("");
//   const [endTime, setEndTime] = useState("");
//   const [jobTypes, setJobTypes] = useState([]);
//   const [fieldJobType, setFieldJobType] = useState("");
//   const [fieldJobCost, setFieldJobCost] = useState(0);
//   const [totalLabors, setTotalLabors] = useState(0);
//   const [materials, setMaterials] = useState([]);
//   const [adminTax, setAdminTax] = useState(0);
//   const [disableBtn, setDisableBtn] = useState(false);
//   const [totalManHours, setTotalManHours] = useState(0);
//   const [draftCopies, setDraftCopies] = useState([]);
//   // const [selectedJobTypes]
//   const navigate = useNavigate();
//   const { id, date } = useParams();

//   useEffect(() => {
//     getDraftCopyByDate();
//     getMaterials();
//     getJobTypes();
//     getTaxPercentage();
//     window.scrollTo(0, 0);
//   }, []);

//   // useEffect to update all forms' material type when fieldJobType changes
//   // useEffect(() => {
//   //   const updatedForms = forms.map((formData) => ({
//   //     ...formData,
//   //     type: fieldJobType,
//   //   }));
//   //   setForms(updatedForms);
//   // }, [fieldJobType]);

//   const { tableSize } = useTableContext();

//   const handleJobTypeChange = (e) => {
//     setFieldJobType(e.target.value);
//     const updatedForms = forms.map((formData) => ({
//       ...formData,
//       type: e.target.value,
//     }));
//     setForms(updatedForms);
//     const jobTypePrice =
//       Number.parseFloat(
//         jobTypes.find((type) => type.jobName === e.target.value)?.price
//       ) || 0;
//     setFieldJobCost(jobTypePrice);
//   };

//   const handleInputChange = (e, index) => {
//     const { name, value } = e.target;
//     const updatedForms = [...forms];

//     if (name === "source") {
//       updatedForms[index] = {
//         ...updatedForms[index],
//         [name]: value,
//         type: value === "Lump Sum" ? "Lump Sum" : fieldJobType,
//         reference: "",
//         measure: "",
//         quantity: "",
//         price: "",
//         totalPrice: "",
//         isTaxable: true,
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
//         isTaxable: true,
//       };
//     }

//     const updatedForm = { ...updatedForms[index], [name]: value };

//     // if(name === "vendorName"){
//     //   if(containsNumberOrSpecialChar(e.target.value)){
//     //     toast.error("Vendor name cannot contain numbers or special characters.");
//     //     return;
//     //   }
//     // }

//     // if(name === "reference"){
//     //   if(containsNumberOrSpecialChar(e.target.value)){
//     //     toast.error("Material name cannot contain numbers or special characters.");
//     //     return;
//     //   }
//     // }

//     // if(name === "measure"){
//     //   if(containsNumberOrSpecialChar(e.target.value)){
//     //     toast.error("Measure cannot contain numbers or special characters.");
//     //     return;
//     //   }
//     // }

//     // Calculate total price if both price and quantity are filled
//     if (name === "price" || name === "quantity") {
//       const price = parseFloat(updatedForm.price) || 0;
//       const quantity = parseFloat(updatedForm.quantity) || 0;
//       if (updatedForm.source === "Other") {
//         updatedForm.totalCost = price && quantity ? price * quantity : "";
//         const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
//         const markup = parseFloat(updatedForm.markup) || 0;

//         if (false) {
//           const intermediatePrice =
//             updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
//           updatedForm.totalPrice =
//             intermediatePrice + (adminTax * intermediatePrice) / 100;
//         } else {
//           updatedForm.totalPrice =
//             updatedForm.totalCost +
//             (updatedForm.markup * updatedForm.totalCost) / 100;
//         }
//       } else {
//         updatedForm.totalPrice = price && quantity ? price * quantity : "";
//         updatedForm.totalCost = price && quantity ? price * quantity : "";
//       }
//     }

//     if (name === "markup") {
//       const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
//       const markup = parseFloat(updatedForm.markup) || 0;
//       if (false) {
//         const intermediatePrice =
//           updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
//         updatedForm.totalPrice =
//           intermediatePrice + (adminTax * intermediatePrice) / 100;
//       } else {
//         updatedForm.totalPrice =
//           updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
//       }
//     }

//     if (name === "isTaxable") {
//       const isTax = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
//       const markup = parseFloat(updatedForm.markup) || 0;

//       if (false) {
//         const intermediatePrice =
//           updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
//         updatedForm.totalPrice =
//           intermediatePrice + (adminTax * intermediatePrice) / 100;
//       } else {
//         const intermediatePrice =
//           updatedForm.totalCost + (markup * updatedForm.totalCost) / 100;
//         updatedForm.totalPrice =
//           intermediatePrice + (0 * intermediatePrice) / 100;
//       }
//       updatedForm.isTaxable = updatedForm.isTaxable === "true" || updatedForm.isTaxable === true ? true : false;
//     }

//     updatedForms[index] = updatedForm;
//     setForms(updatedForms);
//   };

//   function validateLaborForms() {
//     return laborForms.every((form) => {
//       return (
//         form.laborCount > 0 &&
//         form.totalManHours > 0 &&
//         form.type.trim() !== "" &&
//         form.perHourCost > 0 &&
//         form.totalLaborCost > 0
//       );
//     });
//   }

//   const validateForm = (form) => {
//     // Required fields
//     const requiredFields = [
//       // "source",
//       // "type",
//       // "reference",
//       "measure",
//       // "quantity",
//     ];

//     // Check if each required field has a valid (non-empty) value
//     for (let field of requiredFields) {
//       if (
//         form[field] === "" ||
//         form[field] === null ||
//         form[field] === undefined
//       ) {
//         return false; // Return false if any required field is empty
//       }
//     }

//     return true; // All required fields are filled
//   };

//   const handleMaterialChange = (e, index) => {
//     // const materialName = e.target.value;
//     const materialName = e;
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

//   function containsNumberOrSpecialChar(text) {
//     // Regular expression to check for numbers (0-9) or special characters
//     const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

//     // Test the text against the regex
//     return regex.test(text);
//   }

//   const getTotalManHours = (startTime, endTime, totalPerson = 0) => {
//     const startParts = startTime.split(":");
//     const endParts = endTime.split(":");

//     const startHours = Number.parseInt(startParts[0], 10);
//     const startMinutes = Number.parseInt(startParts[1], 10);
//     const endHours = Number.parseInt(endParts[0], 10);
//     const endMinutes = Number.parseInt(endParts[1], 10);

//     // Calculate total minutes for both times
//     const startTotalMinutes = startHours * 60 + startMinutes;
//     const endTotalMinutes = endHours * 60 + endMinutes;

//     // Calculate the difference in minutes
//     let differenceInMinutes = endTotalMinutes - startTotalMinutes;

//     // Ensure we have a non-negative difference
//     if (differenceInMinutes < 0) {
//       console.warn("End time is earlier than start time.");
//       return 0; // or handle the case as needed
//     }

//     // Convert minutes back to hours
//     const resultedHours = differenceInMinutes / 60;

//     // Return the total man-hours
//     return totalPerson * resultedHours;
//   };

//   const handleTimeChange = (e) => {
//     const name = e.target.name;
//     const value = e.target.value;

//     let manHours = 0;
//     if (name === "startTime") {
//       // start time should not be greater than end time
//       // if (value >= endTime) {
//       //   toast.error("Start time should not be greater than end time.");
//       //   return;
//       // }
//       manHours = getTotalManHours(value, endTime, totalLabors);
//       setStartTime(value);
//     }
//     if (name === "endTime") {
//       // end time should not be less than start time
//       // if (value <= startTime) {
//       //   toast.error("End time should not be less than start time.");
//       //   return;
//       // }
//       manHours = getTotalManHours(startTime, value, totalLabors);
//       setEndTime(value);
//     }

//     setTotalManHours(manHours || 0);
//   };

//   const deleteLaborForm = (index) => {
//     const updatedLaborForms = laborForms.filter((_, i) => i !== index);
//     setLaborForms(updatedLaborForms);
//   };

//   const handleLaborFormInputChange = (e, index) => {
//     const { name, value } = e.target;
//     const updatedForms = [...laborForms];

//     const updatedForm = { ...updatedForms[index], [name]: value };

//     if (name === "type") {
//       const val = e.target.value;
//       updatedForm.perHourCost = jobTypes.find(
//         (job) => job.jobName === val
//       ).price;

//       const laborCount = 1;
//       const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
//       const perHourCost = parseFloat(updatedForm.perHourCost) || 0;

//       updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
//     }

//     if (name === "laborCount") {
//       updatedForm.laborCount = parseFloat(e.target.value);
//     }

//     if (name === "totalManHours") {
//       updatedForm.totalManHours = parseFloat(e.target.value);
//     }

//     if (
//       name === "laborCount" ||
//       name === "totalManHours" ||
//       name === "perHourCost"
//     ) {
//       const laborCount = 1;
//       const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
//       const perHourCost = parseFloat(updatedForm.perHourCost) || 0;

//       updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
//     }

//     updatedForms[index] = updatedForm;
//     setLaborForms(updatedForms);
//   };

//   const addLaborForm = () => {
//     setLaborForms((prevForms) => [
//       ...prevForms,
//       {
//         laborCount: 1,
//         totalManHours: 0,
//         type: "",
//         perHourCost: 0,
//         totalLaborCost: 0,
//       },
//     ]);
//   };

//   const getTaxPercentage = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/staff/get-tax-percent`,
//         { headers: headers }
//       );
//       if (response.data.statusCode === 200) {
//         setAdminTax(response.data.result.taxPercent);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.error(error);
//       toast.error(error.response.message);
//     }
//   };

//   const getDraftCopyByDate = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/project/get-draft-copy/${id}/${date}`,
//         { headers: headers }
//       );
//       // console.log("Response date", response);
//       if (response.data.statusCode === 200) {
//         let copies = [];
//         let laborData = [];
//         for (let copy of response.data.result.draftCopies) {
//           copies = [...copies, ...copy.copies];
//           if (copy.totalCost !== 0) {
//             laborData = [
//               ...laborData,
//               {
//                 laborCount: 1,
//                 totalManHours: copy.totalManHours,
//                 type: copy.jobType,
//                 perHourCost: copy.perHourCost,
//                 totalLaborCost: copy.totalCost,
//               },
//             ];
//           }
//         }
//         if (copies.length != 0) {
//           setFieldJobType(copies[0].type);
//         }
//         setForms(copies);
//         setLaborForms(laborData);
//         setDraftCopies(response.data.result.draftCopies);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.error(error);
//       toast.error(error.response.message);
//     }
//   };

//   const addForm = () => {
//     setForms([
//       ...forms,
//       {
//         source: "F&G",
//         type: "",
//         vendorName: "",
//         markup: 0,
//         reference: "",
//         measure: "",
//         quantity: "",
//         price: "",
//         PO: "",
//         invoice: "",
//         totalPrice: "",
//         isTaxable: true,
//       },
//     ]);
//   };

//   const deleteForm = (index) => {
//     const updatedForms = forms.filter((_, i) => i !== index);
//     setForms(updatedForms);
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

//   const getJobTypes = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/admin/get-job-types-dpd`,
//         { headers: headers }
//       );

//       if (response.data.statusCode === 200) {
//         setJobTypes(response.data.result);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log("Error", error);
//     }
//   };

//   const groupAndMergeForms = (forms, laborForms) => {
//     // Step 1: Merge laborForms with the same type by summing their values
//     const mergedLaborForms = laborForms.reduce((acc, labor) => {
//       if (!acc[labor.type]) {
//         acc[labor.type] = { ...labor };
//       } else {
//         acc[labor.type].laborCount += labor.laborCount;
//         acc[labor.type].totalManHours += labor.totalManHours;
//         acc[labor.type].totalLaborCost += labor.totalLaborCost;
//       }
//       return acc;
//     }, {});

//     // Step 2: Map labor forms by type for quick lookups
//     const laborMap = new Map(Object.entries(mergedLaborForms));

//     // Step 3: Group forms by type
//     const formGroups = forms.reduce((acc, form) => {
//       const { type } = form;
//       if (!acc[type]) acc[type] = [];
//       acc[type].push(form);
//       return acc;
//     }, {});

//     const result = [];

//     // Step 4: Create merged result from form groups and labor forms
//     for (const [type, formGroup] of Object.entries(formGroups)) {
//       const labor = laborMap.get(type);

//       // console.log("Labor Type", type, labor);

//       result.push({
//         jobType: type,
//         totalCost: labor ? labor.totalLaborCost : 0, // Use labor cost if available, otherwise 0
//         isLaborTaxable: labor ? true : formGroup[0].isTaxable,
//         totalManHours: labor ? labor.totalManHours : 0,
//         perHourCost: labor ? labor.perHourCost : 0,
//         copies: formGroup,
//       });

//       laborMap.delete(type); // Remove from map after processing
//     }

//     // Step 5: Add remaining labor forms not present in `forms`
//     laborMap.forEach((labor, type) => {
//       const findJob = jobTypes.find((job) => job.jobName === type);

//       result.push({
//         jobType: type,
//         totalCost: labor.totalLaborCost,
//         isLaborTaxable: findJob.isTaxable,
//         perHourCost: findJob.price,
//         totalManHours: labor.totalManHours,
//         copies: [],
//       });
//     });

//     return result;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       let isValidPrice = forms.some((form) => {
//         return (
//           Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
//             Number.parseFloat(form.totalPrice) && form.source === "F&G"
//         );
//       });

//       // if (isValidPrice) {
//       //   toast.error("Please ensure all fields are completed.");
//       //   return;
//       // }

//       if (forms.length === 0 && laborForms.length === 0) {
//         toast.error("Please add some data.");
//         return;
//       }

//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//       };
//       setDisableBtn(true);

//       const resultedForms = groupAndMergeForms(forms, laborForms);

//       // console.log("Resulted Forms", resultedForms, forms, laborForms);
//       // return;

//       const formdata = new FormData();
//       formdata.append("forms", JSON.stringify(resultedForms));

//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/project/edit-draft-copy/${id}/${date}`,
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
//     } catch (error) {
//       console.log("Error", error);
//       toast.error(error.response.message);
//     }
//     setDisableBtn(false);
//   };

//   const saveDraftToOfficeCopy = async (e) => {
//     e.preventDefault();
//     try {
//       // console.log("Forms", forms);

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

//       let isValidForms = forms.some((form) => {
//         return (
//           (!form.measure || !form.price || !form.quantity || !form.totalCost) &&
//           ["F&G", "Other"].includes(form.source)
//         );
//       });

//       if (isValidForms) {
//         toast.error("Please ensure all fields are completed in materials.");
//         return;
//       }

//       // if(!validateForm(forms)){
//       //   toast.error("Please ensure all fields are completed in material.");
//       //   return;
//       // }

//       if (forms.length === 0 && laborForms.length === 0) {
//         toast.error("Please add some data.");
//         return;
//       }

//       if (!validateLaborForms()) {
//         toast.error("Please ensure all fields are completed.");
//         return;
//       }

//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//       };
//       setDisableBtn(true);

//       const resultedForms = groupAndMergeForms(forms, laborForms);

//       // console.log("Resulted Forms", resultedForms, forms, laborForms);

//       let resultedManHours = 0;
//       resultedForms.forEach((form) => {
//         resultedManHours += form.totalManHours;
//       });

//       // console.log("Resulted Man Hours", resultedManHours);

//       // return;

//       const formdata = new FormData();
//       formdata.append("forms", JSON.stringify(resultedForms));
//       formdata.append("totalManHours", resultedManHours);

//       // console.log("Resulted forms", resultedForms);
//       // return;

//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/project/save-draft-to-office/${id}/${date}`,
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
//     } catch (error) {
//       console.log("Error", error);
//       toast.error(error.response.message);
//     }
//     setDisableBtn(false);
//   };

//   const [dropdownVisibility, setDropdownVisibility] = useState(
//     forms.map(() => false) // Initialize visibility for each form
//   );
//   const [searchTerm, setSearchTerm] = useState(""); // Track search term for filtering
//   const dropdownRefs = useRef([]);

//   const toggleDropdownVisibility = (index) => {
//     const updatedVisibility = [...dropdownVisibility];

//     // Reset all dropdowns to false except the one being toggled
//     updatedVisibility.forEach((_, i) => {
//       if (i !== index) updatedVisibility[i] = false;
//     });

//     // Toggle the current dropdown
//     updatedVisibility[index] = !updatedVisibility[index];

//     setDropdownVisibility(updatedVisibility);

//     // Reset search term when opening a new dropdown
//     if (updatedVisibility[index]) {
//       setSearchTerm("");
//     }
//   };

//   useEffect(() => {
//     const handleOutsideClick = (event) => {
//       // Check if the clicked element is not inside any of the dropdowns
//       if (
//         dropdownRefs.current.every((ref) => ref && !ref.contains(event.target))
//       ) {
//         setDropdownVisibility(forms.map(() => false)); // Close all dropdowns
//       }
//     };

//     document.addEventListener("mousedown", handleOutsideClick);

//     return () => {
//       document.removeEventListener("mousedown", handleOutsideClick);
//     };
//   }, [forms]); // No need to include dropdownVisibility in the dependency array

//   // Handle search term change
//   const handleSearchChange = (e) => {
//     setSearchTerm(e.target.value);
//   };

//   return (
//     <Layout>
//       <div
//         className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
//       >
//         <ToastContainer />
//         <div className="lg:p-10 p-3">
//           <div className="card">
//             <div className="card-header bg-[#00613e] text-white">
//               <h3 className="card-title mt-1"> <button
//                     onClick={() => {
//                       navigate(-1);
//                     }}
//                   >
//                     <i className="fa fa-arrow-left mr-2"></i>
//                   </button>{" "}Edit Draft Copy</h3>
//             </div>
//             <form onSubmit={handleSubmit}>
//               <div className="card-body">
//                 <div className="flex justify-end gap-4 mr-2">
//                   {/* <div className="">
//                     <label htmlFor="jobType">Job Type *</label>
//                     <br />
//                     <select
//                       name="fieldJobType"
//                       onChange={handleJobTypeChange}
//                       id="fieldJobType"
//                       className="w-[150px] border-[1px] p-1 rounded-sm border-[black] outline-none"
//                       value={fieldJobType}
//                       required={forms.length !== 0}
//                     >
//                       <option value="">Select Job Type</option>
//                       {jobTypes
//                         .filter((item) => {
//                           return item.status === "Active";
//                         })
//                         .map((item, index) => (
//                           <option key={index} value={item.jobName}>
//                             {item.jobName}
//                           </option>
//                         ))}
//                     </select>
//                   </div> */}
//                   {/* <div className="form-group flex flex-col">
//                     <label htmlFor="project">Start Time</label>
//                     <input
//                       type="time"
//                       id="startTime"
//                       name="startTime"
//                       className="border-[1px] border-[black] outline-none w-[100px] p-1 text-sm rounded-[2px]"
//                       value={startTime}
//                       onChange={handleTimeChange}
//                       required
//                     />
//                   </div>
//                   <div className="form-group flex flex-col">
//                     <label htmlFor="project">End Time</label>
//                     <input
//                       type="time"
//                       id="endTime"
//                       name="endTime"
//                       className="border-[1px] border-[black] outline-none w-[100px] p-1 text-sm rounded-[2px]"
//                       value={endTime}
//                       min={startTime}
//                       onChange={handleTimeChange}
//                       required
//                     />
//                   </div>
//                   <div className="form-group flex flex-col">
//                     <label htmlFor="project">Total Man Hours</label>
//                     <p>{totalManHours?.toLocaleString("en-US", {
//                         minimumFractionDigits: 2,
//                         maximumFractionDigits: 2,
//                       })}</p>
//                   </div> */}
//                 </div>

//                 {forms.map((formData, index) => (
//                   <div
//                     key={index}
//                     className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative mt-8"
//                   >
//                     <div className="form-group flex flex-col">
//                       <label htmlFor={`source-${index}`}>Source</label>
//                       <select
//                         name="source"
//                         onChange={(e) => handleInputChange(e, index)}
//                         id={`source-${index}`}
//                         className="border-b border-[grey] outline-none w-[180px]"
//                         value={formData.source}
//                         required
//                       >
//                         {/* <option value="">Select Source</option> */}
//                         <option value="F&G">F&G</option>
//                         <option value="Other">Other</option>
//                         <option value="Lump Sum">Lump Sum</option>
//                         <option value="Labor">Labor</option>
//                         {/* <option value="Drainage Lump Sum">Drainage Lump Sum</option>
//                         <option value="Electrical Lump Sum">Electrical Lump Sum</option>
//                         <option value="Hardscape Lump Sum">Hardscape Lump Sum</option>
//                         <option value="Irrigation Lump Sum">Irrigation Lump Sum</option>
//                         <option value="Landscape Lump Sum">Landscape Lump Sum</option>
//                         <option value="Mosquito Lump Sum">Mosquito Lump Sum</option>
//                         <option value="Plumbing Lump Sum">Plumbing Lump Sum</option>
//                         <option value="Pool Lump Sum">Pool Lump Sum</option> */}
//                       </select>
//                     </div>

//                     {formData.source === "F&G" && (
//                       <>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`type-${index}`}>Material Type</label>
//                           <select
//                             name="type"
//                             onChange={(e) => handleInputChange(e, index)}
//                             id={`type-${index}`}
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             value={formData.type}
//                             required
//                             // disabled
//                           >
//                             <option value="">Select</option>
//                             {jobTypes
//                               .filter((item) => {
//                                 return item.status === "Active";
//                               })
//                               .map((item, index) => (
//                                 <option key={index} value={item.jobName}>
//                                   {item.jobName}
//                                 </option>
//                               ))}
//                             {/* <option value={fieldJobType}>{fieldJobType}</option> */}
//                           </select>
//                         </div>
//                         {/* <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`reference-${index}`}>
//                             Material Name
//                           </label>
//                           <select
//                             name="reference"
//                             onChange={(e) => handleMaterialChange(e, index)}
//                             id={`reference-${index}`}
//                             className="border-b border-[grey] outline-none"
//                             value={formData.reference}
//                             required
//                           >
//                             <option value="">Select One</option>
//                             {materials
//                               .filter((item) => {
//                                 return item.status === "Active";
//                               })
//                               .map((material) => (
//                                 <option
//                                   key={material?._id}
//                                   value={material.name}
//                                 >
//                                   {material.name}
//                                 </option>
//                               ))}
//                           </select>
//                         </div> */}

//                         <div
//                           className="form-group flex flex-col w-[180px] relative cursor-pointer"
//                           key={index}
//                           ref={(el) => (dropdownRefs.current[index] = el)} // Assign ref to each dropdown
//                         >
//                           <label htmlFor={`reference-${index}`}>
//                             Material Name
//                           </label>
//                           <div className="relative cursor-pointer">
//                             <div
//                               className=""
//                               onClick={() => toggleDropdownVisibility(index)}
//                             >
//                               <input
//                                 type="text"
//                                 id={`materialName-${index}`}
//                                 name={`materialName-${index}`}
//                                 className="border-b border-[grey] outline-none w-[180px] pr-3 cursor-pointer"
//                                 value={formData.reference}
//                                 readOnly
//                                 placeholder="Select Material Name"
//                                 // onClick={() => toggleDropdownVisibility(index)} // Toggle dropdown
//                                 required
//                               />
//                               <span className="absolute right-0 cursor-pointer">
//                                 <i className="fa fa-caret-down"></i>
//                               </span>
//                             </div>

//                             {dropdownVisibility[index] && (
//                               <div className="h-[400px] w-[200px] scrollbar-content overflow-y-auto absolute top-[100%] bg-[white] shadow-md mt-1 z-10">
//                                 {/* Search Input */}
//                                 <input
//                                   type="text"
//                                   className="w-full px-2 py-1 border-b"
//                                   placeholder="Search material..."
//                                   value={searchTerm}
//                                   onChange={handleSearchChange}
//                                 />
//                                 {/* Filtered and Searched Materials */}
//                                 {materials
//                                   .filter(
//                                     (item) =>
//                                       item.status === "Active" &&
//                                       item.name
//                                         .toLowerCase()
//                                         .includes(searchTerm.toLowerCase())
//                                   )
//                                   .map((material) => (
//                                     <div
//                                       key={material?._id}
//                                       onClick={() => {
//                                         handleMaterialChange(
//                                           material.name,
//                                           index
//                                         );
//                                         toggleDropdownVisibility(index); // Close dropdown
//                                       }}
//                                       className="text-sm hover:bg-[#e3e3e3] cursor-pointer p-2"
//                                     >
//                                       {material.name}
//                                     </div>
//                                   ))}

//                                 {/* No Results Found */}
//                                 {materials.filter(
//                                   (item) =>
//                                     item.status === "Active" &&
//                                     item.name
//                                       .toLowerCase()
//                                       .includes(searchTerm.toLowerCase())
//                                 ).length === 0 && (
//                                   <div className="p-2 text-gray-500 text-center text-sm">
//                                     No materials found
//                                   </div>
//                                 )}
//                               </div>
//                             )}
//                           </div>
//                         </div>
//                       </>
//                     )}

//                     {formData.source === "Other" && (
//                       <>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`vendorName-${index}`}>
//                             Vendor Name
//                           </label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`vendorName-${index}`}
//                             name="vendorName"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.vendorName}
//                             placeholder="Enter Vendor Name"
//                             // required
//                           />
//                         </div>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`reference-${index}`}>
//                             Material Name
//                           </label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`reference-${index}`}
//                             name="reference"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.reference}
//                             placeholder="Enter Name"
//                             required
//                           />
//                         </div>

//                       </>
//                     )}

//                     {formData.source === "Labor" && (
//                       <>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`type-${index}`}>Job Type *</label>
//                           <select
//                             name="type"
//                             onChange={(e) => handleInputChange(e, index)}
//                             id={`type-${index}`}
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             value={formData.type}
//                             required
//                             // disabled
//                           >
//                             <option value="">Select</option>
//                             {/* <option value={fieldJobType}>{fieldJobType}</option> */}
//                             {jobTypes
//                               .filter((item) => {
//                                 return item.status === "Active";
//                               })
//                               .map((item, index) => (
//                                 <option key={index} value={item.jobName}>
//                                   {item.jobName}
//                                 </option>
//                               ))}
//                           </select>
//                         </div>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`vendorName-${index}`}>
//                             Vendor Name
//                           </label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`vendorName-${index}`}
//                             name="vendorName"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.vendorName}
//                             placeholder="Enter Vendor Name"
//                             maxLength={50}
//                             // required
//                           />
//                         </div>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`reference-${index}`}>
//                             Description *
//                           </label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`reference-${index}`}
//                             name="reference"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.reference}
//                             maxLength={100}
//                             placeholder="Enter Description"
//                             required
//                           />
//                         </div>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`source-${index}`}>Taxable *</label>
//                           <select
//                             name="isTaxable"
//                             onChange={(e) => handleInputChange(e, index)}
//                             id={`isTaxable-${index}`}
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             value={formData.isTaxable}
//                             required
//                           >
//                             <option value="">Select Option</option>
//                             <option value="true">Yes</option>
//                             <option value="false">No</option>
//                           </select>
//                         </div>
//                       </>
//                     )}

//                     {formData.source.includes("Lump Sum") && (
//                       <>
//                         <div className="form-group flex flex-col hidden">
//                           <label htmlFor={`type-${index}`}>Material Type</label>
//                           <select
//                             name="type"
//                             id={`type-${index}`}
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             value="Lump Sum"
//                             required
//                           >
//                             <option value="">Select</option>
//                             <option value="Lump Sum">
//                               Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                           </select>
//                         </div>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`type-${index}`}>Lump Sum Type</label>
//                           <select
//                             name="type"
//                             id={`type-${index}`}
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             value={formData.type}
//                             onChange={(e) => handleInputChange(e, index)}
//                             required
//                           >
//                             <option value="">Select</option>
//                             <option value="Lump Sum">Lump Sum</option>
//                             <option value="Drainage Lump Sum">
//                               Drainage Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                             <option value="Electrical Lump Sum">
//                               Electrical Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                             <option value="Hardscape Lump Sum">
//                               Hardscape Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                             <option value="Irrigation Lump Sum">
//                               Irrigation Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                             <option value="Landscape Lump Sum">
//                               Landscape Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                             <option value="Mosquito Lump Sum">
//                               Mosquito Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                             <option value="Plumbing Lump Sum">
//                               Plumbing Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                             <option value="Pool Lump Sum">
//                               Pool Lump Sum (Sales Tax Paid on Materials)
//                             </option>
//                           </select>
//                         </div>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`vendorName-${index}`}>
//                             Vendor Name
//                           </label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`vendorName-${index}`}
//                             name="vendorName"
//                             onChange={(e) => handleInputChange(e, index)}
//                             maxLength={50}
//                             value={formData.vendorName}
//                             placeholder="Enter Vendor Name"
//                             // required
//                           />
//                         </div>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`reference-${index}`}>
//                             Description *
//                           </label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`reference-${index}`}
//                             name="reference"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.reference}
//                             maxLength={100}
//                             placeholder="Enter Description"
//                             required
//                           />
//                         </div>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`source-${index}`}>Taxable *</label>
//                           <select
//                             name="isTaxable"
//                             onChange={(e) => handleInputChange(e, index)}
//                             id={`isTaxable-${index}`}
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             value={formData.isTaxable}
//                             required
//                           >
//                             <option value="">Select Option</option>
//                             <option value="true">Yes</option>
//                             <option value="false">No</option>
//                           </select>
//                         </div>
//                       </>
//                     )}

//                     {["F&G", "Other"].includes(formData.source) && (
//                       <>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`measure-${index}`}>Measure</label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`measure-${index}`}
//                             name="measure"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.measure}
//                             placeholder="Enter measure"
//                             readOnly={
//                               formData.source === "Other" ? false : true
//                             }
//                             // required
//                           />
//                         </div>

//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`quantity-${index}`}>Quantity</label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             id={`quantity-${index}`}
//                             name="quantity"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.quantity}
//                             placeholder="Enter Quantity"
//                             min={0}
//                             max={10000000}
//                             step="any"
//                             // required
//                           />
//                         </div>

//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`price-${index}`}>Price</label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`price-${index}`}
//                             name="price"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.price}
//                             placeholder="Enter Price"
//                             // readOnly={
//                             //   formData.source === "Other" ? false : true
//                             // }
//                             max={10000000}
//                             min={0}
//                             step="any"
//                             // required
//                           />
//                         </div>


//                       </>
//                     )}

//                     {formData.source === "Other" && (
//                       <>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`totalCost-${index}`}>
//                             Total Cost
//                           </label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`totalCost-${index}`}
//                             name="totalCost"
//                             placeholder="Total cost goes here ..."
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.totalCost}
//                             min={0}
//                             // required
//                             readOnly
//                           />
//                         </div>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`markup-${index}`}>Mark up</label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             id={`markup-${index}`}
//                             name="markup"
//                             placeholder="Enter percent"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData?.markup}
//                             min={0}
//                             max={100}
//                             // required
//                           />
//                         </div>
//                         <div className="form-group flex flex-col">
//                           <label htmlFor={`source-${index}`}>Taxable</label>
//                           <select
//                             name="isTaxable"
//                             onChange={(e) => handleInputChange(e, index)}
//                             id={`isTaxable-${index}`}
//                             className="border-b border-[grey] outline-none w-[180px]"
//                             value={formData.isTaxable}
//                             // required
//                           >
//                             <option value="">Select Option</option>
//                             <option value="true">Yes</option>
//                             <option value="false">No</option>
//                           </select>
//                         </div>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`invoice-${index}`}>Invoice</label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`invoice-${index}`}
//                             name="invoice"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.invoice}
//                             placeholder="Enter invoice"
//                             // required
//                           />
//                         </div>
//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`PO-${index}`}>P.O.</label>
//                           <input
//                             type="text"
//                             className="border-b border-[grey] outline-none"
//                             id={`PO-${index}`}
//                             name="PO"
//                             onChange={(e) => handleInputChange(e, index)}
//                             value={formData.PO}
//                             placeholder="Enter PO"
//                             // required
//                           />
//                         </div>
//                       </>
//                     )}

//                     {["F&G", "Other"].includes(formData.source) ? (
//                       <div className="form-group flex flex-col">
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
//                           readOnly
//                           min={0}
//                           step="any"
//                           // required
//                         />
//                       </div>
//                     ) : (
//                       <div className="form-group flex flex-col">
//                         <label htmlFor={`totalPrice-${index}`}>
//                           Total Price *
//                         </label>
//                         <input
//                           type="number"
//                           className="border-b border-[grey] outline-none"
//                           id={`totalPrice-${index}`}
//                           name="totalPrice"
//                           placeholder="Total price goes here..."
//                           value={formData.totalPrice}
//                           max={10000000}
//                           step="any"
//                           // readOnly
//                           onChange={(e) => handleInputChange(e, index)}
//                           min={0}
//                           // required
//                         />
//                       </div>
//                     )}

//                     {/* <div className="form-group flex flex-col">
//                       <label htmlFor={`totalPrice-${index}`}>Total Price</label>
//                       <input
//                         type="number"
//                         className="border-b border-[grey] outline-none"
//                         id={`totalPrice-${index}`}
//                         name="totalPrice"
//                         placeholder="Total price goes here..."
//                         value={formData.totalPrice}
//                         readOnly
//                         min={0}
//                         step="any"
//                         // required
//                       />
//                     </div> */}

//                     {formData.reference && formData.source === "F&G" && (
//                       <div className="form-group flex flex-col">
//                         <label htmlFor={`isTaxable-${index}`}>Taxable</label>
//                         <input
//                           type="text"
//                           className="border-b border-[grey] outline-none"
//                           id={`isTaxable-${index}`}
//                           name="isTaxable"
//                           onChange={(e) => handleInputChange(e, index)}
//                           value={formData.isTaxable ? "Yes" : "No"}
//                           placeholder="Enter isTaxable"
//                           disabled={true}
//                         />
//                       </div>
//                     )}

//                     <button
//                       type="button"
//                       className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
//                       onClick={() => deleteForm(index)}
//                     >
//                       <i className="fa fa-close text-white"></i>
//                     </button>
//                   </div>
//                 ))}

//                 <div className="text-center">
//                   <button
//                     type="button"
//                     onClick={addForm}
//                     className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
//                   >
//                     <i className="fa fa-plus"></i>
//                   </button>
//                 </div>
//               </div>

//               {/* {isLabor && (
//                 <div className="my-10 flex">
//                   <table className="w-[100%] text-center">
//                     <thead>
//                       <tr>
//                         <th>Labor Count</th>
//                         <th>Total Man Hours</th>
//                         <th>Per Hour Cost</th>
//                         <th>Total Cost</th>
//                         <th>Action</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       <tr>
//                         <td>{totalLabors ? parseFloat(totalLabors) : 0}</td>
//                         <td>{totalManHours ? parseFloat(totalManHours) : 0}</td>
//                         <td>{fieldJobCost ? parseFloat(fieldJobCost) : 0}</td>
//                         <td>{totalManHours * fieldJobCost}</td>
//                         <td>
//                           <button
//                             type="button"
//                             className="bg-red-500 h-[25px] w-[25px] rounded-full"
//                             onClick={() => setIsLabor(!isLabor)}
//                           >
//                             <i className="fa fa-close text-white"></i>
//                           </button>
//                         </td>
//                       </tr>
//                     </tbody>
//                   </table>
//                 </div>
//               )} */}

//               {/* Labor logic */}
//               <div className="p-6">
//                 {laborForms.length > 0 &&
//                   laborForms.map((formData, index) => {
//                     return (
//                       <div className="flex flex-wrap gap-x-6 mt-4 shadow-md p-4 relative">
//                         <button
//                           type="button"
//                           className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
//                           onClick={() => deleteLaborForm(index)}
//                         >
//                           <i className="fa fa-close text-white"></i>
//                         </button>
//                         <div className="form-group flex-col w-[180px] hidden">
//                           <label htmlFor={`laborCount-${index}`}>
//                             Labor Count
//                           </label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`laborCount-${index}`}
//                             name="laborCount"
//                             onChange={(e) =>
//                               handleLaborFormInputChange(e, index)
//                             }
//                             value={formData.laborCount}
//                             placeholder="Enter Labor Count"
//                             min={0}
//                             max={10000000}
//                             required
//                           />
//                         </div>

//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`totalManHours-${index}`}>
//                             Total Man Hours
//                           </label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`totalManHours-${index}`}
//                             name="totalManHours"
//                             onChange={(e) =>
//                               handleLaborFormInputChange(e, index)
//                             }
//                             value={formData.totalManHours}
//                             placeholder="Enter Man Hours"
//                             min={0}
//                             max={10000000}
//                             step="any"
//                             required
//                           />
//                         </div>

//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`type-${index}`}>Job Type</label>
//                           <select
//                             name="type"
//                             onChange={(e) =>
//                               handleLaborFormInputChange(e, index)
//                             }
//                             id={`type-${index}`}
//                             className="border-b border-[grey] outline-none"
//                             value={formData.type}
//                             required
//                           >
//                             <option value="">Select One</option>
//                             {jobTypes
//                               .filter((item) => {
//                                 return item.status === "Active";
//                               })
//                               .map((job) => (
//                                 <option key={job?._id} value={job.jobName}>
//                                   {job.jobName}
//                                 </option>
//                               ))}
//                           </select>
//                         </div>

//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`perHourCost-${index}`}>
//                             Per Hour Cost
//                           </label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`perHourCost-${index}`}
//                             name="perHourCost"
//                             onChange={(e) =>
//                               handleLaborFormInputChange(e, index)
//                             }
//                             value={formData.perHourCost}
//                             placeholder="Enter Per Hour Cost"
//                             required
//                             min={0}
//                             max={10000000}
//                             readOnly
//                           />
//                         </div>

//                         <div className="form-group flex flex-col w-[180px]">
//                           <label htmlFor={`totalLaborCost-${index}`}>
//                             Total Labor Costs
//                           </label>
//                           <input
//                             type="number"
//                             className="border-b border-[grey] outline-none"
//                             id={`totalLaborCost-${index}`}
//                             name="totalLaborCost"
//                             onChange={(e) =>
//                               handleLaborFormInputChange(e, index)
//                             }
//                             value={formData.totalLaborCost}
//                             placeholder="Total cost goes here..."
//                             min={0}
//                             readOnly
//                             required
//                           />
//                         </div>
//                       </div>
//                     );
//                   })}
//                 <div className="text-center mt-8">
//                   <button
//                     type="button"
//                     title="Add Labor"
//                     className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
//                     onClick={addLaborForm}
//                   >
//                     <i className="fa fa-plus"></i>
//                   </button>
//                 </div>
//               </div>

//               <div className="card-footer">
//                 <button
//                   type="submit"
//                   className="btn bg-[#00613e] text-white"
//                   disabled={disableBtn}
//                 >
//                   Save Draft Field Copy
//                 </button>
//                 <button
//                   type="button"
//                   className="btn bg-[#00613e] text-white ml-3"
//                   disabled={disableBtn}
//                   onClick={saveDraftToOfficeCopy}
//                 >
//                   Process Field Copy
//                 </button>
//               </div>
//             </form>
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
import { useTableContext } from "../../../context/TableContext";
import { useNavigate, useParams } from "react-router-dom";

export default function EditDraftCopyForm() {
  const [forms, setForms] = useState([
    {
      source: "F&G",
      type: "",
      vendorName: "",
      markup: 0,
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      cost: "",
      totalCost: 0,
      totalPrice: 0,
      invoice: "",
      PO: "",
      isTaxable: true,
      startDate: Date.now(),
      endDate: Date.now(),
    },
  ]);
  const [laborForms, setLaborForms] = useState([
    {
      laborCount: 1,
      totalManHours: 0,
      type: "",
      perHourCost: 0,
      totalLaborCost: 0,
    },
  ]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [jobTypes, setJobTypes] = useState([]);
  const [fieldJobType, setFieldJobType] = useState("");
  const [fieldJobCost, setFieldJobCost] = useState(0);
  const [totalLabors, setTotalLabors] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [adminTax, setAdminTax] = useState(0);
  const [disableBtn, setDisableBtn] = useState(false);
  const [totalManHours, setTotalManHours] = useState(0);
  const [draftCopies, setDraftCopies] = useState([]);
  // const [selectedJobTypes]
  const navigate = useNavigate();
  const { id, date } = useParams();

  useEffect(() => {
    getDraftCopyByDate();
    getMaterials();
    getJobTypes();
    getTaxPercentage();
    window.scrollTo(0, 0);
  }, []);

  // useEffect to update all forms' material type when fieldJobType changes
  // useEffect(() => {
  //   const updatedForms = forms.map((formData) => ({
  //     ...formData,
  //     type: fieldJobType,
  //   }));
  //   setForms(updatedForms);
  // }, [fieldJobType]);

  const { tableSize } = useTableContext();

  const handleJobTypeChange = (e) => {
    setFieldJobType(e.target.value);
    const updatedForms = forms.map((formData) => ({
      ...formData,
      type: e.target.value,
    }));
    setForms(updatedForms);
    const jobTypePrice =
      Number.parseFloat(
        jobTypes.find((type) => type.jobName === e.target.value)?.price
      ) || 0;
    setFieldJobCost(jobTypePrice);
  };

const handleInputChange = (e, index) => {
  const { name, value } = e.target;
  const updatedForms = [...forms];

  // ---------- SOURCE CHANGE ----------
  if (name === "source") {
    updatedForms[index] = {
      ...updatedForms[index],
      source: value,
      type: value === "Lump Sum" ? "Lump Sum" : fieldJobType,
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      cost: "",
      markup: updatedForms[index].markup ?? updatedForms[index].markUp ?? 0,
      totalCost: 0,
      totalPrice: "",
      isTaxable: true,
    };
  }

  // ---------- TYPE CHANGE ----------
  if (name === "type") {
    updatedForms[index] = {
      ...updatedForms[index],
      type: value,
      reference: "",
      measure: "",
      quantity: "",
      price: "",
      cost: "",
      markup: updatedForms[index].markup ?? updatedForms[index].markUp ?? 0,
      totalCost: 0,
      totalPrice: "",
      isTaxable: true,
    };
  }

  let updatedForm = {
    ...updatedForms[index],
    [name]: value,
  };

  // ✅ NORMALIZE markup / markUp (MAIN FIX)
  if (name === "markUp" || name === "markup") {
    updatedForm.markup = parseFloat(value) || 0;
  }

  // if old data came with markUp
  if (updatedForm.markup === undefined && updatedForm.markUp !== undefined) {
    updatedForm.markup = parseFloat(updatedForm.markUp) || 0;
  }

  // ---------- PRICE / QUANTITY ----------
  if (name === "price" || name === "quantity") {
    const price = parseFloat(updatedForm.price) || 0;
    const quantity = parseFloat(updatedForm.quantity) || 0;

    if (updatedForm.source === "Other") {
      updatedForm.totalCost = price && quantity ? price * quantity : 0;
      updatedForm.totalPrice =
        updatedForm.totalCost +
        (updatedForm.totalCost * (updatedForm.markup || 0)) / 100;
    } else {
      updatedForm.totalCost = price && quantity ? price * quantity : 0;
      updatedForm.totalPrice = updatedForm.totalCost;
    }
  }

  // ---------- Labor & Lump Sum ----------
  if (
    updatedForm.source === "Labor" ||
    updatedForm.source?.includes("Lump Sum")
  ) {
    const cost = parseFloat(updatedForm.cost) || 0;
    const markup = parseFloat(updatedForm.markup) || 0;

    updatedForm.totalCost = cost;
    updatedForm.totalPrice = cost + (cost * markup) / 100;
  }

  // ---------- MARKUP CHANGE ----------
  if (name === "markup" || name === "markUp") {
    const cost = parseFloat(updatedForm.totalCost) || 0;
    const markup = parseFloat(updatedForm.markup) || 0;

    updatedForm.totalPrice = cost + (cost * markup) / 100;
  }

  // ---------- TAXABLE ----------
  if (name === "isTaxable") {
    updatedForm.isTaxable =
      updatedForm.isTaxable === "true" || updatedForm.isTaxable === true;
  }

  updatedForms[index] = updatedForm;
  setForms(updatedForms);
};


// const handleInputChange = (e, index) => {
//   const { name, value } = e.target;
//   const updatedForms = [...forms];

//   // ---------- SOURCE CHANGE ----------
//   if (name === "source") {
//     updatedForms[index] = {
//       ...updatedForms[index],
//       source: value,
//       type: value === "Lump Sum" ? "Lump Sum" : fieldJobType,
//       reference: "",
//       measure: "",
//       quantity: "",
//       price: "",
//       cost: "",
//       markup: 0,
//       totalCost: 0,
//       totalPrice: "",
//       isTaxable: true,
//     };
//   }

//   // ---------- TYPE CHANGE ----------
//   if (name === "type") {
//     updatedForms[index] = {
//       ...updatedForms[index],
//       type: value,
//       reference: "",
//       measure: "",
//       quantity: "",
//       price: "",
//       cost: "",
//       markup: 0,
//       totalCost: 0,
//       totalPrice: "",
//       isTaxable: true,
//     };
//   }

//   const updatedForm = { ...updatedForms[index], [name]: value };

//    // ✅ AUTO CALCULATION FOR LUMP SUM & LABOR
//   if (
//     updatedForm.source === "Lump Sum" ||
//     updatedForm.source === "Labor"
//   ) {
//     const cost = parseFloat(updatedForm.cost) || 0;
//     const markupPercent = parseFloat(updatedForm.markUp) || 0;

//     updatedForm.totalCost = cost;
//     updatedForm.totalPrice = cost + (cost * markupPercent) / 100;
//   }
//   // ---------- PRICE / QUANTITY (F&G + Other) ----------
//   if (name === "price" || name === "quantity") {
//     const price = parseFloat(updatedForm.price) || 0;
//     const quantity = parseFloat(updatedForm.quantity) || 0;

//     if (updatedForm.source === "Other") {
//       updatedForm.totalCost = price && quantity ? price * quantity : 0;
//       const markup = parseFloat(updatedForm.markup) || 0;

//       updatedForm.totalPrice =
//         updatedForm.totalCost +
//         (markup * updatedForm.totalCost) / 100;
//     } else if (updatedForm.source === "F&G") {
//       updatedForm.totalCost = price && quantity ? price * quantity : 0;
//       updatedForm.totalPrice = updatedForm.totalCost;
//     }
//   }

//   // ---------- MARKUP (ONLY Other) ----------
//   if (name === "markup" && updatedForm.source === "Other") {
//     const markup = parseFloat(updatedForm.markup) || 0;
//     updatedForm.totalPrice =
//       updatedForm.totalCost +
//       (markup * updatedForm.totalCost) / 100;
//   }

//   // ---------- TAXABLE CHANGE ----------
//   if (name === "isTaxable") {
//     updatedForm.isTaxable =
//       updatedForm.isTaxable === "true" || updatedForm.isTaxable === true;
//   }

//   // ---------- Labor & Lump Sum (COST + MARKUP) ----------
//   if (
//     (name === "cost" || name === "markup") &&
//     (updatedForm.source === "Labor" ||
//       updatedForm.source?.includes("Lump Sum"))
//   ) {
//     const cost = parseFloat(updatedForm.cost) || 0;
//     const markup = parseFloat(updatedForm.markup) || 0;

//     updatedForm.totalCost = cost;
//     updatedForm.totalPrice = cost + (cost * markup) / 100;
//   }

//   // ---------- FINAL SET ----------
//   updatedForms[index] = updatedForm;
//   setForms(updatedForms);
// };

  function validateLaborForms() {
    return laborForms.every((form) => {
      return (
        form.laborCount > 0 &&
        form.totalManHours > 0 &&
        form.type.trim() !== "" &&
        form.perHourCost > 0 &&
        form.totalLaborCost > 0
      );
    });
  }

  const validateForm = (form) => {
    // Required fields
    const requiredFields = [
      // "source",
      // "type",
      // "reference",
      "measure",
      // "quantity",
    ];

    // Check if each required field has a valid (non-empty) value
    for (let field of requiredFields) {
      if (
        form[field] === "" ||
        form[field] === null ||
        form[field] === undefined
      ) {
        return false; // Return false if any required field is empty
      }
    }

    return true; // All required fields are filled
  };

  const handleMaterialChange = (e, index) => {
    // const materialName = e.target.value;
    const materialName = e;
    const material = materials.find(
      (material) => material.name === materialName
    );
    const updatedForms = [...forms];
    updatedForms[index] = {
      ...updatedForms[index],
      reference: material.name,
      measure: material.measure,
      price: material.price,
      isTaxable: material.isTaxable,
      totalPrice:
        Number.parseFloat(material.price) *
        Number.parseFloat(forms[index].quantity),
    };
    setForms(updatedForms);
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const getTotalManHours = (startTime, endTime, totalPerson = 0) => {
    const startParts = startTime.split(":");
    const endParts = endTime.split(":");

    const startHours = Number.parseInt(startParts[0], 10);
    const startMinutes = Number.parseInt(startParts[1], 10);
    const endHours = Number.parseInt(endParts[0], 10);
    const endMinutes = Number.parseInt(endParts[1], 10);

    // Calculate total minutes for both times
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // Calculate the difference in minutes
    let differenceInMinutes = endTotalMinutes - startTotalMinutes;

    // Ensure we have a non-negative difference
    if (differenceInMinutes < 0) {
      console.warn("End time is earlier than start time.");
      return 0; // or handle the case as needed
    }

    // Convert minutes back to hours
    const resultedHours = differenceInMinutes / 60;

    // Return the total man-hours
    return totalPerson * resultedHours;
  };

  const handleTimeChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;

    let manHours = 0;
    if (name === "startTime") {
      // start time should not be greater than end time
      // if (value >= endTime) {
      //   toast.error("Start time should not be greater than end time.");
      //   return;
      // }
      manHours = getTotalManHours(value, endTime, totalLabors);
      setStartTime(value);
    }
    if (name === "endTime") {
      // end time should not be less than start time
      // if (value <= startTime) {
      //   toast.error("End time should not be less than start time.");
      //   return;
      // }
      manHours = getTotalManHours(startTime, value, totalLabors);
      setEndTime(value);
    }

    setTotalManHours(manHours || 0);
  };

  const deleteLaborForm = (index) => {
    const updatedLaborForms = laborForms.filter((_, i) => i !== index);
    setLaborForms(updatedLaborForms);
  };

  const handleLaborFormInputChange = (e, index) => {
    const { name, value } = e.target;
    const updatedForms = [...laborForms];

    const updatedForm = { ...updatedForms[index], [name]: value };

    if (name === "type") {
      const val = e.target.value;
      updatedForm.perHourCost = jobTypes.find(
        (job) => job.jobName === val
      ).price;

      const laborCount = 1;
      const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
      const perHourCost = parseFloat(updatedForm.perHourCost) || 0;

      updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
    }

    if (name === "laborCount") {
      updatedForm.laborCount = parseFloat(e.target.value);
    }

    if (name === "totalManHours") {
      updatedForm.totalManHours = parseFloat(e.target.value);
    }

    if (
      name === "laborCount" ||
      name === "totalManHours" ||
      name === "perHourCost"
    ) {
      const laborCount = 1;
      const totalManHours = parseFloat(updatedForm.totalManHours) || 0;
      const perHourCost = parseFloat(updatedForm.perHourCost) || 0;

      updatedForm.totalLaborCost = laborCount * totalManHours * perHourCost;
    }

    updatedForms[index] = updatedForm;
    setLaborForms(updatedForms);
  };

  const addLaborForm = () => {
    setLaborForms((prevForms) => [
      ...prevForms,
      {
        laborCount: 1,
        totalManHours: 0,
        type: "",
        perHourCost: 0,
        totalLaborCost: 0,
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

  // const getDraftCopyByDate = async () => {
  //   try {
  //     const token = localStorage.getItem("f&gstafftoken");
  //     const headers = {
  //       token: token,
  //       "Content-Type": "application/json",
  //     };
  //     const response = await axios.get(
  //       `${process.env.REACT_APP_API_BASE_URL}/project/get-draft-copy/${id}/${date}`,
  //       { headers: headers }
  //     );
  //     // console.log("Response date", response);
  //     if (response.data.statusCode === 200) {
  //       let copies = [];
  //       let laborData = [];
  //       for (let copy of response.data.result.draftCopies) {
  //         copies = [...copies, ...copy.copies];
  //         if (copy.totalCost !== 0) {
  //           laborData = [
  //             ...laborData,
  //             {
  //               laborCount: 1,
  //               totalManHours: copy.totalManHours,
  //               type: copy.jobType,
  //               perHourCost: copy.perHourCost,
  //               totalLaborCost: copy.totalCost,
  //             },
  //           ];
  //         }
  //       }
  //       if (copies.length != 0) {
  //         setFieldJobType(copies[0].type);
  //       }
  //       setForms(copies);
  //       setLaborForms(laborData);
  //       setDraftCopies(response.data.result.draftCopies);
  //     } else {
  //       toast.error(response.data.message);
  //     }
  //   } catch (error) {
  //     console.error(error);
  //     toast.error(error.response.message);
  //   }
  // };

  const getDraftCopyByDate = async () => {
  try {
    const token = localStorage.getItem("f&gstafftoken");
    const headers = {
      token: token,
      "Content-Type": "application/json",
    };

    const response = await axios.get(
      `${process.env.REACT_APP_API_BASE_URL}/project/get-draft-copy/${id}/${date}`,
      { headers }
    );

    if (response.data.statusCode === 200) {
      let copies = [];
      let laborData = [];

      for (let copy of response.data.result.draftCopies) {
        copies = [...copies, ...copy.copies];

        if (copy.totalCost !== 0) {
          laborData.push({
            laborCount: 1,
            totalManHours: copy.totalManHours,
            type: copy.jobType,
            perHourCost: copy.perHourCost,
            totalLaborCost: copy.totalCost,
          });
        }
      }

      // ✅ 🔥 IMPORTANT FIX: normalize cost & markup
      const normalizedCopies = copies.map((item) => ({
        ...item,
        // use existing cost, else fall back to saved totalCost
        cost: item.cost ?? item.totalCost ?? 0,
        // normalize markup field name both ways
        markup: item.markup ?? item.markUp ?? 0,
        markUp: item.markUp ?? item.markup ?? 0,
      }));

      if (normalizedCopies.length !== 0) {
        setFieldJobType(normalizedCopies[0].type);
      }

      setForms(normalizedCopies);     // ✅ use normalized data
      setLaborForms(laborData);
      setDraftCopies(response.data.result.draftCopies);
    } else {
      toast.error(response.data.message);
    }
  } catch (error) {
    console.error(error);
    toast.error(error.response?.message);
  }
};

  const addForm = () => {
    setForms([
      ...forms,
      {
        source: "F&G",
        type: "",
        vendorName: "",
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

  const deleteForm = (index) => {
    const updatedForms = forms.filter((_, i) => i !== index);
    setForms(updatedForms);
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

  const groupAndMergeForms = (forms, laborForms) => {
    // Step 1: Merge laborForms with the same type by summing their values
    const mergedLaborForms = laborForms.reduce((acc, labor) => {
      if (!acc[labor.type]) {
        acc[labor.type] = { ...labor };
      } else {
        acc[labor.type].laborCount += labor.laborCount;
        acc[labor.type].totalManHours += labor.totalManHours;
        acc[labor.type].totalLaborCost += labor.totalLaborCost;
      }
      return acc;
    }, {});

    // Step 2: Map labor forms by type for quick lookups
    const laborMap = new Map(Object.entries(mergedLaborForms));

    // Step 3: Group forms by type
    const formGroups = forms.reduce((acc, form) => {
      const { type } = form;
      if (!acc[type]) acc[type] = [];
      acc[type].push(form);
      return acc;
    }, {});

    const result = [];

    // Step 4: Create merged result from form groups and labor forms
    for (const [type, formGroup] of Object.entries(formGroups)) {
      const labor = laborMap.get(type);

      // console.log("Labor Type", type, labor);

      result.push({
        jobType: type,
        totalCost: labor ? labor.totalLaborCost : 0, // Use labor cost if available, otherwise 0
        isLaborTaxable: labor ? true : formGroup[0].isTaxable,
        totalManHours: labor ? labor.totalManHours : 0,
        perHourCost: labor ? labor.perHourCost : 0,
        copies: formGroup,
      });

      laborMap.delete(type); // Remove from map after processing
    }

    // Step 5: Add remaining labor forms not present in `forms`
    laborMap.forEach((labor, type) => {
      const findJob = jobTypes.find((job) => job.jobName === type);

      result.push({
        jobType: type,
        totalCost: labor.totalLaborCost,
        isLaborTaxable: findJob.isTaxable,
        perHourCost: findJob.price,
        totalManHours: labor.totalManHours,
        copies: [],
      });
    });

    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let isValidPrice = forms.some((form) => {
        return (
          Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
          Number.parseFloat(form.totalPrice) && form.source === "F&G"
        );
      });

      // if (isValidPrice) {
      //   toast.error("Please ensure all fields are completed.");
      //   return;
      // }

      if (forms.length === 0 && laborForms.length === 0) {
        toast.error("Please add some data.");
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);

      const resultedForms = groupAndMergeForms(forms, laborForms);

      // console.log("Resulted Forms", resultedForms, forms, laborForms);
      // return;

      const formdata = new FormData();
      formdata.append("forms", JSON.stringify(resultedForms));

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-draft-copy/${id}/${date}`,
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
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const saveDraftToOfficeCopy = async (e) => {
    e.preventDefault();
    try {
      // console.log("Forms", forms);

      let isValidPrice = forms.some((form) => {
        return (
          Number.parseFloat(form.price) * Number.parseFloat(form.quantity) !==
          Number.parseFloat(form.totalPrice) && form.source === "F&G"
        );
      });

      if (isValidPrice) {
        toast.error("Please ensure all field copies have valid prices.");
        return;
      }

      let isValidForms = forms.some((form) => {
        return (
          (!form.measure || !form.price || !form.quantity || !form.totalCost) &&
          ["F&G", "Other"].includes(form.source)
        );
      });

      if (isValidForms) {
        toast.error("Please ensure all fields are completed in materials.");
        return;
      }

      // if(!validateForm(forms)){
      //   toast.error("Please ensure all fields are completed in material.");
      //   return;
      // }

      if (forms.length === 0 && laborForms.length === 0) {
        toast.error("Please add some data.");
        return;
      }

      if (!validateLaborForms()) {
        toast.error("Please ensure all fields are completed.");
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);

      const resultedForms = groupAndMergeForms(forms, laborForms);

      // console.log("Resulted Forms", resultedForms, forms, laborForms);

      let resultedManHours = 0;
      resultedForms.forEach((form) => {
        resultedManHours += form.totalManHours;
      });

      // console.log("Resulted Man Hours", resultedManHours);

      // return;

      const formdata = new FormData();
      formdata.append("forms", JSON.stringify(resultedForms));
      formdata.append("totalManHours", resultedManHours);

      // console.log("Resulted forms", resultedForms);
      // return;

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/save-draft-to-office/${id}/${date}`,
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
    } catch (error) {
      console.log("Error", error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

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
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <ToastContainer />
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title mt-1"> <button
                onClick={() => {
                  navigate(-1);
                }}
              >
                <i className="fa fa-arrow-left mr-2"></i>
              </button>{" "}Edit Draft Copy</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="flex justify-end gap-4 mr-2">
                  {/* <div className="">
                    <label htmlFor="jobType">Job Type *</label>
                    <br />
                    <select
                      name="fieldJobType"
                      onChange={handleJobTypeChange}
                      id="fieldJobType"
                      className="w-[150px] border-[1px] p-1 rounded-sm border-[black] outline-none"
                      value={fieldJobType}
                      required={forms.length !== 0}
                    >
                      <option value="">Select Job Type</option>
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
                  </div> */}
                  {/* <div className="form-group flex flex-col">
                    <label htmlFor="project">Start Time</label>
                    <input
                      type="time"
                      id="startTime"
                      name="startTime"
                      className="border-[1px] border-[black] outline-none w-[100px] p-1 text-sm rounded-[2px]"
                      value={startTime}
                      onChange={handleTimeChange}
                      required
                    />
                  </div>
                  <div className="form-group flex flex-col">
                    <label htmlFor="project">End Time</label>
                    <input
                      type="time"
                      id="endTime"
                      name="endTime"
                      className="border-[1px] border-[black] outline-none w-[100px] p-1 text-sm rounded-[2px]"
                      value={endTime}
                      min={startTime}
                      onChange={handleTimeChange}
                      required
                    />
                  </div>
                  <div className="form-group flex flex-col">
                    <label htmlFor="project">Total Man Hours</label>
                    <p>{totalManHours?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</p>
                  </div> */}
                </div>

                {forms.map((formData, index) => (
                  <div
                    key={index}
                    className="flex gap-x-16 justify-start flex-wrap mb-4 p-6 pt-8 shadow-md relative mt-8"
                  >
                    <div className="form-group flex flex-col">
                      <label htmlFor={`source-${index}`}>Source</label>
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
                          <label htmlFor={`type-${index}`}>Material Type</label>
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
                                return item.status === "Active";
                              })
                              .map((item, index) => (
                                <option key={index} value={item.jobName}>
                                  {item.jobName}
                                </option>
                              ))}
                            {/* <option value={fieldJobType}>{fieldJobType}</option> */}
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
                            value={formData.reference}
                            required
                          >
                            <option value="">Select One</option>
                            {materials
                              .filter((item) => {
                                return item.status === "Active";
                              })
                              .map((material) => (
                                <option
                                  key={material?._id}
                                  value={material.name}
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
                            Material Name
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
                                value={formData.reference}
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
                        <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Cost</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="cost"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.cost}
                            placeholder="Enter cost"
                            readOnly={
                              formData.source === "Other" ? false : true
                            }
                          // required
                          />
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Mark Up</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="markUp"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.markUp}
                            placeholder="Enter markUp"
                            readOnly={
                              formData.source === "Other" ? false : true
                            }
                          // required
                          />
                        </div>
                      </>
                    )}

                    {formData.source === "Other" && (
                      <>
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
                            Material Name
                          </label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`reference-${index}`}
                            name="reference"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.reference}
                            placeholder="Enter Name"
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
                            value={formData.reference}
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
                      <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Cost</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="cost"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.cost}
                            placeholder="Enter Cost "
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                         <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Markup *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="markUp"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.markUp}
                            placeholder="Enter markUp"
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                      </>
                    )}

                    {formData.source.includes("Lump Sum") && (
                      <>
                        <div className="form-group flex flex-col hidden">
                          <label htmlFor={`type-${index}`}>Material Type</label>
                          <select
                            name="type"
                            id={`type-${index}`}
                            className="border-b border-[grey] outline-none w-[180px]"
                            value="Lump Sum"
                            required
                          >
                            <option value="">Select</option>
                            <option value="Lump Sum">
                              Lump Sum (Sales Tax Paid on Materials)
                            </option>
                          </select>
                        </div>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`type-${index}`}>Lump Sum Type</label>
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
                              Electrical Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Hardscape Lump Sum">
                              Hardscape Lump Sum (Sales Tax Paid on Materials)
                            </option>
                            <option value="Irrigation Lump Sum">
                              Irrigation Lump Sum (Sales Tax Paid on Materials)
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
                            maxLength={50}
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
                            value={formData.reference}
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
                         <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Cost *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="cost"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.cost}
                            placeholder="Enter Cost "
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                         <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>MarkUp *</label>
                          <input
                            type="text"
                            className="border-b border-[grey] outline-none"
                            id={`measure-${index}`}
                            name="markUp"
                            onChange={(e) => handleInputChange(e, index)}
                            value={formData.markUp}
                            placeholder="Enter markUp"
                            // readOnly={
                            //   formData.source === "Other" ? false : true
                            // }
                            // required
                          />
                        </div>
                      </>
                    )}

                    {["F&G", "Other"].includes(formData.source) && (
                      <>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`measure-${index}`}>Measure</label>
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
                          // required
                          />
                        </div>

                        <div className="form-group flex flex-col">
                          <label htmlFor={`quantity-${index}`}>Quantity</label>
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
                          // required
                          />
                        </div>

                        <div className="form-group flex flex-col">
                          <label htmlFor={`price-${index}`}>Price</label>
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
                            max={10000000}
                            min={0}
                            step="any"
                          // required
                          />
                        </div>


                      </>
                    )}

                    {formData.source === "Other" && (
                      <>
                        <div className="form-group flex flex-col">
                          <label htmlFor={`totalCost-${index}`}>
                            Cost
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
                            // required
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
                            max={100}
                          // required
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
                          // required
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
                          Total Price
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
                        // required
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
                          max={10000000}
                          step="any"
                          // readOnly
                          onChange={(e) => handleInputChange(e, index)}
                          min={0}
                        // required
                        />
                      </div>
                    )}

                    {/* <div className="form-group flex flex-col">
                      <label htmlFor={`totalPrice-${index}`}>Total Price</label>
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
                        // required
                      />
                    </div> */}

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
                    onClick={addForm}
                    className="bg-green-500 text-white h-[35px] w-[35px] rounded-full"
                  >
                    <i className="fa fa-plus"></i>
                  </button>
                </div>
              </div>

              {/* {isLabor && (
                <div className="my-10 flex">
                  <table className="w-[100%] text-center">
                    <thead>
                      <tr>
                        <th>Labor Count</th>
                        <th>Total Man Hours</th>
                        <th>Per Hour Cost</th>
                        <th>Total Cost</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{totalLabors ? parseFloat(totalLabors) : 0}</td>
                        <td>{totalManHours ? parseFloat(totalManHours) : 0}</td>
                        <td>{fieldJobCost ? parseFloat(fieldJobCost) : 0}</td>
                        <td>{totalManHours * fieldJobCost}</td>
                        <td>
                          <button
                            type="button"
                            className="bg-red-500 h-[25px] w-[25px] rounded-full"
                            onClick={() => setIsLabor(!isLabor)}
                          >
                            <i className="fa fa-close text-white"></i>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )} */}

              {/* Labor logic */}
              <div className="p-6">
                {laborForms.length > 0 &&
                  laborForms.map((formData, index) => {
                    return (
                      <div className="flex flex-wrap gap-x-6 mt-4 shadow-md p-4 relative">
                        <button
                          type="button"
                          className="absolute top-3 right-5 bg-red-500 h-[30px] w-[30px] rounded-full"
                          onClick={() => deleteLaborForm(index)}
                        >
                          <i className="fa fa-close text-white"></i>
                        </button>
                        <div className="form-group flex-col w-[180px] hidden">
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

                        <div className="form-group flex flex-col w-[180px]">
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
                            step="any"
                            required
                          />
                        </div>

                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`type-${index}`}>Job Type</label>
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

                        <div className="form-group flex flex-col w-[180px]">
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
                            max={10000000}
                            readOnly
                          />
                        </div>

                        <div className="form-group flex flex-col w-[180px]">
                          <label htmlFor={`totalLaborCost-${index}`}>
                            Total Labor Costs
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
                            readOnly
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

              <div className="card-footer">
                <button
                  type="submit"
                  className="btn bg-[#00613e] text-white"
                  disabled={disableBtn}
                >
                  Save Draft Field Copy
                </button>
                <button
                  type="button"
                  className="btn bg-[#00613e] text-white ml-3"
                  disabled={disableBtn}
                  onClick={saveDraftToOfficeCopy}
                >
                  Process Field Copy
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
