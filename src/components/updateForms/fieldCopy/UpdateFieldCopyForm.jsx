// import React, { useEffect, useState } from "react";
// import Layout from "../../layout/Layout";
// import axios from "axios";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { useNavigate, useParams } from "react-router-dom";
// import { useTableContext } from "../../../context/TableContext";

// export default function UpdateFieldCopyForm() {
//   const [formData, setFormData] = useState({
//     source: "",
//     description: "",
//     measure: "",
//     startDate: "",
//     endDate: "",
//     quantity: "",
//     price: "",
//     totalPrice: "",
//   });
//   const [materials, setMaterials] = useState([]);
//   const [disableBtn, setDisableBtn] = useState(false);
//   const { id,fieldId } = useParams();
//   const navigate = useNavigate();

//   const { tableSize } = useTableContext();

//   const handleInputChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value,
//     });

//     if (e.target.name === "price" && e.target.name === "quantity") {
//       totalPrice = Number.parseFloat(formData.price) * Number.parseFloat(formData.quantity);
//       setFormData({
//        ...formData,
//         totalPrice,
//       });
//     }

//   };

//   useEffect(() => {
//     getProjectById();
//     getCrewCategories();
//     getCrews();
//     // Set selected crews based on the project data
//   }, []);

//   useEffect(() => {
//     console.log("Formdata crews", formData);
//     console.log("all crews", crews);
//     const selected = crews.filter((crew) => {
//       return formData.crew.includes(crew._id);
//     });
//     console.log("Checking selected", selected);
//     setSelectedCrews(selected);
//   }, [crews, formData]);

//   const getFieldCopyById = async () => {
//     console.log("getProjectById API called");
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/project/get-field-copy/${id}/${fieldId}`,
//         { headers: headers }
//       );
//       console.log("server response: ", response);
//       if (response.data.statusCode === 200) {
//         console.log(response.data.result);
//         setFormData({
          
//         });
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.error(error);
//       toast.error(error.response.message);
//     }
//   };

//   console.log(formData);
//   console.log("Selected Crews", selectedCrews);

//   const handleCrewChange = (e) => {
//     const selectedCrewId = e.target.value;
//     const selectedCrew = crews.find((crew) => crew._id === selectedCrewId);

//     if (selectedCrew && !selectedCrews.includes(selectedCrew)) {
//       setSelectedCrews([...selectedCrews, selectedCrew]);
//       setFormData({
//         ...formData,
//         crew: [...formData.crew, selectedCrewId],
//       });
//     }
//   };

//   const removeCrew = (crewId) => {
//     setSelectedCrews(selectedCrews.filter((crew) => crew._id !== crewId));
//     setFormData({
//       ...formData,
//       crew: formData.crew.filter((id) => id !== crewId),
//     });
//   };

//   const getCrewCategories = async () => {
//     try {
//       const token = localStorage.getItem("f&gadmintoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/admin/get-crew-categories-dpd`,
//         { headers: headers }
//       );

//       if (response.data.statusCode === 200) {
//         setCategories(response.data.result);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log("Error", error);
//     }
//   };

//   const getCrews = async () => {
//     try {
//       const token = localStorage.getItem("f&gadmintoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/admin/get-crews-dpd`,
//         { headers: headers }
//       );

//       if (response.data.statusCode === 200) {
//         setCrews(response.data.result);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log("Error", error);
//     }
//   };

//   console.log("form data: ", formData);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     console.log("before API call", formData);
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//       };
//       const formdata = new FormData();
//       formdata.append("customerName", formData.customerName);
//       formdata.append("customerEmail", formData.customerEmail);
//       formdata.append("customerPhone", formData.customerPhone);
//       formdata.append("billingType", formData.billingType);
//       formdata.append("jobAddress", formData.jobAddress);
//       formdata.append("crewCategory", formData.crewCategory);
//       formdata.append("description", formData.description);
//       formdata.append("crew", formData.crew);
//       formdata.append("truckNo", formData.truckNo);
//       formdata.append("trailerNo", formData.trailerNo);
//       setDisableBtn(true);
//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
//         formdata,
//         {
//           headers: headers,
//         }
//       );
//       console.log("server response", response);
//       if (response.data.statusCode === 200) {
//         console.log(response.data);
//         toast.success(response.data.message);
//         // navigate("/panel/office/all-projects");
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log("Error", error);
//       toast.error(error.response.message);
//     }
//     // setFormData({
//     //     crewName: "",
//     //     crewCategory: "",
//     //     rating : "",
//     //     status : ""
//     //   });
//     setDisableBtn(false);
//   };

//   const [data, setData] = useState([]);
//   const [totalPages, setTotalPages] = useState(0);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalRecords, settotalRecords] = useState(0);
//   const [sortBy, setSortBy] = useState(null);
//   const [sortOrder, setSortOrder] = useState("asc");
//   const [term, setTerm] = useState("");
//   const [loading, setLoading] = useState(false);
//   useEffect(() => {
//     getAllProjects();
//   }, [currentPage, sortBy, sortOrder]);
//   const getAllProjects = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       setLoading(true);
//       const response = await axios.get(
//         `${process.env.REACT_APP_API_BASE_URL}/project/get-projects?page=${currentPage}`,
//         { headers: headers }
//       );

//       if (response.data.statusCode === 200) {
//         setData(response.data.result.projects);
//         setTotalPages(response.data.result.totalPages);
//         settotalRecords(response.data.result.totalRecords);
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log("Error", error);
//     }
//     setLoading(false);
//   };
//   const moveToEditForm = (id) => {
//     navigate(`/panel/office/project/edit/${id}`);
//   };

//   const viewProject = (id) => {
//     navigate(`/panel/office/project/view/${id}`);
//   };

//   const handleSort = (column) => {
//     if (sortBy === column) {
//       setSortOrder(sortOrder === "asc" ? "desc" : "asc");
//     } else {
//       setSortBy(column);
//       setSortOrder("asc");
//     }
//   };

//   const sortedData = () => {
//     let sorted = [...data];
//     if (sortBy) {
//       sorted.sort((a, b) => {
//         const aValue = a[sortBy];
//         const bValue = b[sortBy];
//         if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
//         if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
//         return 0;
//       });
//     }
//     return sorted;
//   };

//   const previousPage = () => {
//     if (currentPage <= 1) {
//       return;
//     }
//     setCurrentPage(currentPage - 1);
//   };

//   const nextPage = () => {
//     if (currentPage >= totalPages) {
//       return;
//     }
//     setCurrentPage(currentPage + 1);
//   };

//   const handleStatus = async (e, id, status) => {
//     e.preventDefault();
//     try {
//       const token = localStorage.getItem("f&gadmintoken");
//       const headers = {
//         token: token,
//       };
//       const formdata = new FormData();
//       formdata.append("status", status);
//       setDisableBtn(true);
//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/admin/edit-material/${id}`,
//         formdata,
//         {
//           headers: headers,
//         }
//       );
//       console.log("server response", response);
//       if (response.data.statusCode === 200) {
//         console.log(response.data);
//         toast.success(response.data.message);
//         getAllProjects();
//       } else {
//         toast.error(response.data.message);
//       }
//     } catch (error) {
//       console.log(error);
//       toast.error(error.response.message);
//     }
//     setDisableBtn(false);
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
//               <h3 className="card-title">Edit Field Copy</h3>
//             </div>
//             <form onSubmit={handleSubmit}>
//               <div className="card-body">
//                 <div className="form-group">
//                   <label htmlFor="billingType">Source</label>
//                   <select
//                     name="source"
//                     onChange={handleInputChange}
//                     id="source"
//                     className="w-full border-[1px] p-2 rounded-sm border-[#d1d1d1] outline-none"
//                     value={formData.source}
//                     required
//                   >
//                     <option value="">Select Source</option>
//                     <option value="Bid">Bid</option>
//                     <option value="No Bid">No Bid</option>
//                   </select>
//                 </div>
//                 <div className="form-group">
//                   <label htmlFor="jobAddress">Description</label>
//                   <input
//                     type="text"
//                     className="form-control"
//                     id="description"
//                     placeholder="Enter description"
//                     value={formData.description}
//                     onChange={handleInputChange}
//                     name="description"
//                     required
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label htmlFor="jobAddress">Measure</label>
//                   <input
//                     type="text"
//                     className="form-control"
//                     id="measure"
//                     placeholder="Enter measure"
//                     value={formData.measure}
//                     onChange={handleInputChange}
//                     name="measure"
//                     required
//                   />
//                 </div>

//                 <div className="form-group mt-3">
//                   <label htmlFor="startDate">Start Date</label>
//                   <input
//                     type="date"
//                     className="form-control"
//                     id="startDate"
//                     placeholder="Enter Start Date"
//                     value={formData.startDate}
//                     onChange={handleInputChange}
//                     name="startDate"
//                     required
//                   />
//                 </div>
//                 <div className="form-group mt-3">
//                   <label htmlFor="startDate">End Date</label>
//                   <input
//                     type="date"
//                     className="form-control"
//                     id="endDate"
//                     placeholder="Enter End Date"
//                     value={formData.endDate}
//                     onChange={handleInputChange}
//                     name="endDate"
//                     required
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label htmlFor="price">Price</label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="price"
//                     placeholder="Enter Trailer No"
//                     value={formData.price}
//                     onChange={handleInputChange}
//                     name="price"
//                     min={0}
//                     required
//                   />
//                 </div>
//                 <div className="form-group">
//                   <label htmlFor="totalPrice">Total Price</label>
//                   <input
//                     type="number"
//                     className="form-control"
//                     id="totalPrice"
//                     placeholder="Enter Total Price"
//                     value={formData.totalPrice}
//                     onChange={handleInputChange}
//                     name="totalPrice"
//                     min={0}
//                     required
//                   />
//                 </div>
//               </div>
//               <div className="card-footer">
//                 <button
//                   type="submit"
//                   className="btn btn-primary"
//                   disabled={disableBtn}
//                 >
//                   {disableBtn ? "Please wait..." : "Edit Field Copy"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       </div>
//     </Layout>
//   );
// }
