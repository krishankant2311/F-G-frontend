// // import React from 'react'

// // const ChemicalTable = () => {
// //   return (
// //     <div>
// //       tertr
// //     </div>
// //   )
// // }

// // export default ChemicalTable

// import axios from "axios";
// import React, { useEffect, useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { useTableContext } from "../../../context/TableContext";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import parse from "html-react-parser";
// import AddChemical from "./components/AddChemical";

// export default function ChemicalMixes() {
//   const { pageNo } = useParams();
//   const [data, setData] = useState([]);
//   const [totalPages, setTotalPages] = useState(0);
//   const [currentPage, setCurrentPage] = useState(pageNo || 1);
//   const [totalRecords, settotalRecords] = useState(0);
//   const [sortBy, setSortBy] = useState("");
//   const [sortOrder, setSortOrder] = useState("asc");
//   const [term, setTerm] = useState("");
//   const navigate = useNavigate("");
//   const [loading, setLoading] = useState(false);
//   const [disableBtn, setDisableBtn] = useState(false);
//   const [deletedId, setDeletedId] = useState("");
//   const [perPageRecords, setPerPageRecords] = useState(50);
//   const [showAddChemical, setShowAddChemical] = useState(false);

//   const { tableSize } = useTableContext();

//   useEffect(() => {
//     if (pageNo) {
//       setCurrentPage(Number(pageNo));
//     }
//   }, []);

//   useEffect(() => {
//     if (pageNo) {
//       setCurrentPage(Number(pageNo));
//     }
//   }, [pageNo]);

//   useEffect(() => {
//     getAllProjects();
//   }, [currentPage, sortBy, sortOrder]);

//   // useEffect(() => {
//   //   searchProjects();
//   // }, [term, currentPage]);

//   const getAllProjects = async () => {
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       setLoading(true);
//       const response = await axios
//         .get
//         // `${
//         //   process.env.REACT_APP_API_BASE_URL
//         // }/project/get-bid-projects?page=${currentPage}&sortBy=${sortBy}&sortOrder=${
//         //   sortOrder === "asc" ? 1 : -1
//         // }&search=${term}&limit=${perPageRecords}`,
//         // { headers: headers }
//         ();

//       if (response.data.statusCode === 200) {
//         const updatedData = response.data.result.projects.map((item, index) => {
//           return {
//             ...item,
//             serialNo: (currentPage - 1) * perPageRecords + index + 1,
//           };
//         });
//         setData(updatedData);
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

//   const searchProjects = async () => {
//     try {
//       // if (term.length > 0) {
//       //   navigate("/panel/office/bid-projects/1");
//       // }
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//         "Content-Type": "application/json",
//       };
//       setLoading(true);
//       const formdata = new FormData();
//       formdata.append("term", term);
//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/project/search-bid-project?page=${currentPage}`,
//         formdata,
//         { headers: headers }
//       );
//       if (response.data.statusCode === 200) {
//         if (response.data.result.projects.length === 0) {
//           setData([]);
//           setLoading(false);
//           settotalRecords(0);
//           return;
//         }
//         const updatedData = response.data.result.projects.map((item, index) => {
//           return {
//             ...item,
//             serialNo: (currentPage - 1) * 10 + index + 1,
//           };
//         });
//         setData(updatedData);
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
//     navigate(`/panel/office/project/edit-bid/${id}/1`, {
//       state: { data: pageNo },
//     });
//   };

//   const viewProject = (id) => {
//     navigate(`/panel/office/project/view-bid/${id}/1`, {
//       state: { data: pageNo },
//     });
//   };

//   // useEffect(() => {
//   //   navigate(`/panel/office/bid-projects/1`);
//   //   if (pageNo == 1) {
//   //     getAllProjects();
//   //   }
//   // }, [sortBy, sortOrder, term, perPageRecords]);

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
//     // setCurrentPage(currentPage - 1);
//     navigate(`/panel/office/bid-projects/${currentPage - 1}`);
//   };

//   const nextPage = () => {
//     if (currentPage >= totalPages) {
//       return;
//     }
//     // setCurrentPage(currentPage + 1);
//     navigate(`/panel/office/bid-projects/${currentPage + 1}`);
//   };

//   const handleStatus = async (e, id, status) => {
//     e.preventDefault();
//     try {
//       const token = localStorage.getItem("f&gstafftoken");
//       const headers = {
//         token: token,
//       };
//       const formdata = new FormData();
//       formdata.append("status", status);
//       setDisableBtn(true);
//       const response = await axios.post(
//         `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
//         formdata,
//         {
//           headers: headers,
//         }
//       );

//       if (response.data.statusCode === 200) {
//         toast.success(response.data.message);
//         if (data.length === 1 && status == "Delete") {
//           if (currentPage === 1) {
//             getAllProjects();
//           } else {
//             const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
//             navigate(`/panel/office/bid-projects/${page}`);
//           }
//         } else {
//           getAllProjects();
//         }
//         // getAllProjects();
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
//     <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
//       <ToastContainer />
//       <div className="card">
//         <div className="px-4 py-3 flex justify-between items-end border-b">
//           {/* <h3 className="card-title">Bid Projects</h3> */}
//           <div className="flex justify-center flex-grow">
//             <h3 className="text-lg font-bold">CHEMICALS</h3>
//           </div>
//           {/* <div className="text-end">
//             <input
//               type="text"
//               placeholder="Search"
//               className="border border-black px-2 outline-none py-1"
//               value={term}
//               onChange={(e) => setTerm(e.target.value)}
//             />
//           </div> */}
//           <div className="flex justify-end flex-wrap gap-2 w-auto">
//             <select
//               name="perPage"
//               id=""
//               value={perPageRecords}
//               onChange={(e) => {
//                 setPerPageRecords(e.target.value);
//               }}
//               className="w-[60px] border p-1 relative top-1 mr-2 outline-none cursor-pointer h-[34px]"
//             >
//               <option value={10}>10</option>
//               <option value={20}>20</option>
//               <option value={30}>30</option>
//               <option value={40}>40</option>
//               <option value={50}>50</option>
//             </select>
//             <input
//               type="text"
//               placeholder="Search"
//               className="border border-black px-2 outline-none py-1 relative top-1 mr-4 lg:mb-1 mb-0"
//               value={term}
//               onChange={(e) => setTerm(e.target.value)}
//             />
//             {/* <button
//               className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
//                 disableBtn ? "disabled" : ""
//               }`}
//               onClick={() => {
//                 navigate("/panel/office/project/add/1");
//               }}
//             >
//               <i className="fa fa-plus mr-2"></i>
//               Create New Bid
//             </button> */}
//             <button
//               className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
//                 disableBtn ? "disabled" : ""
//               }`}
//               // onClick={() => {
//               //   navigate("/panel/office/all-proposals/1");
//               // }}
//               onClick={() => setShowAddChemical(true)}

//             >
//               <i className="fa fa-plus mr-2"></i>
//               Add Chemical
//             </button>
//           </div>
//         </div>
//         <div className="card-body overflow-x-auto">
//           <table className="table table-bordered table-striped text-center">
//             <thead>
//               <tr>
//                 <th onClick={() => handleSort("serialNo")}>
//                   S. No.{" "}
//                   {/* <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "serialNo"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i> */}
//                 </th>

//                 {/* <th onClick={() => handleSort("projectCode")}>
//                   Project Code{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "projectCode"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th> */}
//                 <th onClick={() => handleSort("customerName")}>
//                   Chemical Name{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "customerName"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th>
//                 <th onClick={() => handleSort("customerName")}>
//                   Measure{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "customerName"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th>
//                 <th onClick={() => handleSort("customerName")}>
//                   Price{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "customerName"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th>
//                 <th onClick={() => handleSort("customerName")}>
//                   Cost{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "customerName"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th>
//                 <th onClick={() => handleSort("customerName")}>
//                   Is Taxable{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "customerName"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th>

//                 {/* <th onClick={() => handleSort("description")}>
//                   Description{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "description"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th> */}
//                 {/* <th onClick={() => handleSort("jobName")}>
//                   Job Name{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "jobName"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th> */}
//                 {/* <th onClick={() => handleSort("billingType")}>
//                   Billing Type{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "billingType"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th> */}
//                 <th onClick={() => handleSort("status")}>
//                   Status{" "}
//                   <i
//                     className={`${
//                       sortOrder === "asc" && sortBy === "status"
//                         ? "fa fa-sort-amount-asc"
//                         : "fa fa-sort-amount-desc"
//                     } ml-2`}
//                   ></i>
//                 </th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {!loading ? (
//                 data.length > 0 ? (
//                   data.map((item, index) => {
//                     return (
//                       <tr key={index}>
//                         <td>{item.serialNo}</td>
//                         {/* <td>{item.projectCode ? item.projectCode : "-"}</td> */}
//                         <td>{item.customerName}</td>
//                         {/* <td>{item.customerEmail}</td> */}
//                         {/* <td className="flex justify-center text-center">
//                           <div
//                             className="text-center"
//                             style={{
//                               whiteSpace: "nowrap",
//                               overflow: "hidden",
//                               // textOverflow: "ellipsis",
//                               maxWidth: "140px",
//                             }}
//                           >
//                             <span>{parse(item.description)}</span>
//                           </div>
//                           <span>...</span>
//                         </td> */}
//                         <td className="">
//                           {item.jobName ? item.jobName : "-"}
//                         </td>
//                         <td>{item.billingType}</td>
//                         <td>{item.quantity ?? "-"}</td>
//                         <td>
//                           {item.status === "Active"
//                             ? "Not Started"
//                             : item.status}
//                         </td>
//                         <td className="flex justify-center gap-4">
//                           <button
//                             onClick={() => {
//                               moveToEditForm(item._id);
//                             }}
//                             title="Edit Project"
//                           >
//                             <i className="fa fa-edit"></i>
//                           </button>
//                           {item.status === "Active" ||
//                           item.status === "Ongoing" ||
//                           item.status === "Completed" ? (
//                             <button
//                               type="button"
//                               className=""
//                               data-toggle="modal"
//                               data-target="#exampleModalCenter"
//                               onClick={() => {
//                                 setDeletedId(item._id);
//                               }}
//                             >
//                               <i className="fa fa-trash"></i>
//                             </button>
//                           ) : (
//                             <button
//                               onClick={(e) => {
//                                 handleStatus(e, item._id, "Active");
//                               }}
//                               disabled={disableBtn}
//                               title="Change Status to Active"
//                             >
//                               <i className="fa fa-refresh"></i>
//                             </button>
//                           )}
//                           <button
//                             onClick={() => {
//                               viewProject(item._id);
//                             }}
//                             title="View Project"
//                           >
//                             <i className="fa fa-eye text-sm"></i>
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })
//                 ) : (
//                   <tr>
//                     <td className="text-center" colSpan="8">
//                       No Data Available
//                     </td>
//                   </tr>
//                 )
//               ) : (
//                 <tr>
//                   <td className="text-center" colSpan="8">
//                     Loading ...
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//             <tfoot>
//               <tr>
//                 <th>S. No.</th>
//                 {/* <th>Project Code</th> */}
//                 <th>Chemical Name</th>
//                 <th>Measure </th>
//                 <th> Price</th>
//                 <th>Cost</th>
//                 <th>Taxable</th>
//                 <th>Status</th>
//                 <th>Actions</th>
//               </tr>
//             </tfoot>
//           </table>
//           <div className="flex lg:flex-row flex-col lg:items-end items-center justify-between px-1 mt-6">
//             <div>
//               <p>
//                 Showing{" "}
//                 {totalRecords === 0
//                   ? 0
//                   : perPageRecords * currentPage - (perPageRecords - 1)}{" "}
//                 to{" "}
//                 {currentPage * perPageRecords > totalRecords
//                   ? totalRecords
//                   : currentPage * perPageRecords}{" "}
//                 of {totalRecords} entries
//               </p>
//             </div>
//             <div className="flex justify-end mt-2">
//               <button
//                 className="bg-[#00613e] text-white px-2 py-1"
//                 onClick={previousPage}
//               >
//                 Previous
//               </button>
//               {Array.from({ length: totalPages }, (_, i) => {
//                 return (
//                   <button
//                     className={`border-x px-[10px] py-1 ${
//                       currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
//                     }`}
//                     key={i}
//                     onClick={() => {
//                       // setCurrentPage(i + 1)
//                       navigate(`/panel/office/bid-projects/${i + 1}`);
//                     }}
//                   >
//                     {i + 1}
//                   </button>
//                 );
//               })}
//               <button
//                 className="bg-[#00613e] text-white px-2 py-1"
//                 onClick={nextPage}
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//       <div
//         className="modal fade"
//         id="exampleModalCenter"
//         tabIndex={-1}
//         role="dialog"
//         aria-labelledby="exampleModalCenterTitle"
//         aria-hidden="true"
//       >
//         <div className="modal-dialog modal-dialog-centered" role="document">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h5 className="modal-title" id="exampleModalLongTitle">
//                 Delete Project
//               </h5>
//               <button
//                 type="button"
//                 className="close"
//                 data-dismiss="modal"
//                 aria-label="Close"
//               >
//                 <span aria-hidden="true">×</span>
//               </button>
//             </div>
//             <div className="modal-body">Are you sure ?</div>
//             <div className="modal-footer">
//               <button
//                 type="button"
//                 className="btn btn-secondary"
//                 data-dismiss="modal"
//               >
//                 Close
//               </button>
//               <button
//                 onClick={(e) => {
//                   handleStatus(e, deletedId, "Delete");
//                 }}
//                 disabled={disableBtn}
//                 title="Change Status to Delete"
//                 type="button"
//                 className="btn btn-danger"
//                 data-dismiss="modal"
//               >
//                 Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       <AddChemical
//   show={showAddChemical}
//   onClose={() => setShowAddChemical(false)}
// />

//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import { useTableContext } from "../../../context/TableContext";
import "react-toastify/dist/ReactToastify.css";
import EditChemicalMix from "./components/EditChemicalMix";
import DeleteChemicalMix from "./components/DeleteChemicalMix";
import { useNavigate } from "react-router-dom";
import {
  resolveChemicalMixLinePricing,
  sumChemicalMixTankTotals,
} from "../../../utils/chemicalMixPricing";

const DELETE_MIX_ERROR_TOAST_ID = "delete-mix-error";
const DELETE_MIX_SUCCESS_TOAST_ID = "delete-mix-success";

const ChemicalMixes = () => {
  const { tableSize } = useTableContext();

  const [mixes, setMixes] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ================= MODAL STATE ================= */

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMix, setSelectedMix] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();

  /* ================= DATA FETCH ================= */

  const fetchMixes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      const res = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/mixes`,
        {
          headers: {
            token,
          },
        }
      );

      if (res.data.success) {
        setMixes(res.data.data || []);
      } else {
        toast.error(res.data.message || "Failed to fetch chemical mixes");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to fetch chemical mixes"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMixes();
  }, []);

  /* ================= ACTION HANDLERS ================= */

  const handleEditMix = (mix, index) => {
    setSelectedMix(mix);
    setSelectedIndex(index);
    setShowEditModal(true);
  };

  const handleDeleteClick = (index) => {
    if (isDeleting) return;
    setDeleteIndex(index);
    setShowDeleteModal(true);
  };

  const confirmDeleteMix = async () => {
    if (isDeleting) return;

    try {
      const id = mixes[deleteIndex]?._id;
      if (!id) {
        toast.error("Invalid mix selected", {
          toastId: DELETE_MIX_ERROR_TOAST_ID,
        });
        return;
      }

      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.", {
          toastId: DELETE_MIX_ERROR_TOAST_ID,
        });
        return;
      }

      setIsDeleting(true);

      const res = await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/mixes/${id}`,
        {
          headers: {
            token,
          },
        }
      );

      if (res.data.success) {
        toast.success("Chemical mix deleted successfully", {
          toastId: DELETE_MIX_SUCCESS_TOAST_ID,
        });
        setShowDeleteModal(false);
        fetchMixes();
      } else {
        toast.error(res.data.message || "Failed to delete chemical mix", {
          toastId: DELETE_MIX_ERROR_TOAST_ID,
        });
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to delete chemical mix",
        {
          toastId: DELETE_MIX_ERROR_TOAST_ID,
        }
      );
    } finally {
      setIsDeleting(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">CHEMICAL MIXES</h2>
          <button
            onClick={() =>
              navigate("/panel/office/chemical-maintenance/add-New-mixs")
            }
            className="bg-green-800 text-white px-4 py-2 rounded"
          >
            + Add New Mix
          </button>
        </div>

        {loading && (
          <div className="flex justify-center items-center min-h-[200px]">
            <p className="text-gray-600">Loading chemical mixes...</p>
          </div>
        )}
        {!loading && mixes.length === 0 && <p>No chemical mixes available.</p>}
        {!loading && mixes.map((mix, idx) => {
          const mixTotals = sumChemicalMixTankTotals(mix.chemicals);
          return (
          <div key={idx} className="border mb-8">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border bg-gray-100">
                  <th className="border p-2">DESCRIPTION</th>
                  <th className="border p-2">
                    Product Brand Name and EPA Reg. #
                  </th>
                  <th className="border p-2">TYPE</th>
                  <th className="border p-2">OZ / TANK 100 GAL</th>
                  <th className="border p-2">COST / OZ</th>
                  <th className="border p-2">TOTAL COST (100 GAL)</th>
                  <th className="border p-2">PRICE / OZ</th>
                  <th className="border p-2">TOTAL PRICE (100 GAL)</th>
                  <th className="border p-2">ACTION</th>
                </tr>
              </thead>

              <tbody>
                {/* ===== DESCRIPTION ROW ===== */}
                <tr>
                  <td className="border p-2 font-semibold">
                    {mix.mixName}
                  </td>
                  <td colSpan={7} className="border"></td>
                  <td className="border p-2 text-center">
                    <div className="flex justify-center gap-4 text-lg">
                      <button onClick={() => handleEditMix(mix, idx)}>
                        <i className="fa fa-edit" />
                      </button>
                      {/* <button onClick={() => handleDeleteMix(idx)}>
                        <i className="fa fa-trash" />
                      </button> */}
                      <button onClick={() => handleDeleteClick(idx)}>
                        <i className="fa fa-trash" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* ===== ITEMS ===== */}
                {mix.chemicals?.map((item, i) => {
                  const line = resolveChemicalMixLinePricing(item);
                  return (
                  <tr key={i}>
                    <td className="border p-2"></td>
                    <td className="border p-2">
                      <div className="font-semibold">
                        {item.brandName || item.chemicalName}
                      </div>
                      <div className="text-xs">
                        {item.epaRegNo ? `EPA: ${item.epaRegNo}` : "EPA: -"}
                      </div>
                      <div className="text-xs">{item.measure}</div>
                    </td>
                    <td className="border p-2">{item.type}</td>
                    <td className="border p-2 text-center">{item.quantity}</td>
                    <td className="border p-2 text-center">
                      ${Number(line.costPerOz).toFixed(2)}
                    </td>
                    <td className="border p-2 text-center">
                      ${line.totalCost.toFixed(2)}
                    </td>
                    <td className="border p-2 text-center">
                      ${Number(line.pricePerOz).toFixed(2)}
                    </td>
                    <td className="border p-2 text-center">
                      ${line.totalPrice.toFixed(2)}
                    </td>
                    <td className="border p-2"></td>
                  </tr>
                  );
                })}

                <tr>
                  <td colSpan={9} className="bg-green-200 p-2 font-semibold">
                    COST PER TANK: $
                    {mixTotals.totalCostPerTank.toFixed(2)}
                  </td>
                </tr>

                <tr className="">
                  <td colSpan={9} className="bg-blue-200 p-2 font-semibold ">
                    PRICE PER TANK: $
                    {mixTotals.totalPricePerTank.toFixed(2)}
                  </td>
                </tr>

                <tr>
                  <td colSpan={9} className="p-3">
                    <div className="flex items-start gap-3">
                      <span className="font-semibold whitespace-nowrap">
                        Notes:
                      </span>
                      <div className="min-w-0 w-full border rounded px-3 py-2 bg-white">
                        {mix.notes ? (
                          <span className="whitespace-pre-wrap">
                            {mix.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          );
        })}
      </div>

      {/* ===== EDIT MODAL ===== */}
      {showEditModal && (
        <EditChemicalMix
          mix={selectedMix}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchMixes}
        />
      )}
      {showDeleteModal && (
        <DeleteChemicalMix
          mixName={mixes[deleteIndex]?.mixName}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={confirmDeleteMix}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default ChemicalMixes;

// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { ToastContainer, toast } from "react-toastify";
// import { useTableContext } from "../../../context/TableContext";
// import "react-toastify/dist/ReactToastify.css";
// import EditChemicalMix from "./components/EditChemicalMix";

// const ChemicalMixes = () => {
//   const { tableSize } = useTableContext();
//   const navigate = useNavigate();

//   const [mixes, setMixes] = useState([
//     {
//       description: "DRENCH #1",
//       items: [
//         {
//           brand: "SAFARI",
//           epa: "86203-11-59639",
//           type: "INSECTICIDE",
//           oz: 32,
//           cost: 5.91,
//           price: 9.31,
//         },
//         {
//           brand: "ZYPRO",
//           epa: "EPA not required",
//           type: "SOIL AMENDMENT WITH ENZYMES",
//           oz: 20,
//           cost: 3.98,
//           price: 8.63,
//         },
//       ],
//       costPerTank: 82.0,
//       pricePerTank: 312.0,
//     },
//     {
//       description: "DRENCH #7 (DROUGHT / SOAKER MIX)",
//       items: [
//         {
//           brand: "RENOVA",
//           epa: "EPA not required",
//           type: "FERTILIZER",
//           oz: 48,
//           cost: 0.65,
//           price: 9.31,
//         },
//         {
//           brand: "SOAKER (ONLY WHEN DRY)",
//           epa: "EPA not required",
//           type: "SOAK",
//           oz: 6,
//           cost: 0.4,
//           price: 8.63,
//         },
//       ],
//       costPerTank: 33.6,
//       pricePerTank: 248.35,
//     },
//     {
//       description: "DRENCH #7 (DROUGHT / SOAKER MIX)",
//       items: [
//         {
//           brand: "RENOVA",
//           epa: "EPA not required",
//           type: "FERTILIZER",
//           oz: 48,
//           cost: 0.65,
//           price: 9.31,
//         },
//         {
//           brand: "SOAKER (ONLY WHEN DRY)",
//           epa: "EPA not required",
//           type: "SOAK",
//           oz: 6,
//           cost: 0.4,
//           price: 8.63,
//         },
//       ],
//       costPerTank: 33.6,
//       pricePerTank: 248.35,
//     },
//   ]);

//   /* ================= ACTION HANDLERS ================= */

//   const handleEditMix = (mix, index) => {
//     navigate(`/panel/office/chemical-maintenance/edit-mix/${index}`, {
//       state: mix,
//     });
//   };

//   const handleDeleteMix = (index) => {
//     if (!window.confirm("Are you sure you want to delete this mix?")) return;

//     const updatedMixes = mixes.filter((_, i) => i !== index);
//     setMixes(updatedMixes);
//     toast.success("Chemical mix deleted successfully");
//   };

//   /* ================= UI ================= */

//   return (
//     <div
//       className={`${
//         tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"
//       }`}
//     >
//       <ToastContainer />
//       <div className="p-6">
//         {/* Header */}
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-xl font-bold">CHEMICAL MIXES</h2>
//           <button
//             onClick={() =>
//               navigate("/panel/office/chemical-maintenance/add-New-mixs")
//             }
//             className="bg-green-800 text-white px-4 py-2 rounded"
//           >
//             + Add New Mix
//           </button>
//         </div>

//         {/* Mix Tables */}
//         {mixes.map((mix, idx) => (
//           <div key={idx} className="border mb-8">
//             <table className="w-full border-collapse text-sm">
//               <thead>
//                 <tr className="border bg-gray-100">
//                   <th className="border p-2">DESCRIPTION</th>
//                   <th className="border p-2">
//                     Product Brand Name and EPA Reg. #
//                   </th>
//                   <th className="border p-2">TYPE</th>
//                   <th className="border p-2">OZ / TANK 100 GAL</th>
//                   <th className="border p-2">COST / OZ</th>
//                   <th className="border p-2">PRICE / OZ</th>
//                   <th className="border p-2">ACTION</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {/* ===== DESCRIPTION ROW (ONLY ONE EDIT/DELETE) ===== */}
//                 <tr>
//                   <td className="border p-2 font-semibold">
//                     {mix.description}
//                   </td>
//                   <td colSpan={5} className="border"></td>
//                   <td className="border p-2 text-center">
//                     <div className="flex justify-center gap-4 text-lg">
//                       <button
//                         onClick={() => handleEditMix(mix, idx)}
//                         // className="text-blue-600 hover:text-blue-800"
//                       >
//                         <i className="fa fa-edit" />
//                       </button>
//                       <button
//                         onClick={() => handleDeleteMix(idx)}
//                         // className="text-red-600 hover:text-red-800"
//                       >
//                         <i className="fa fa-trash" />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>

//                 {/* ===== CHEMICAL ITEMS ===== */}
//                 {mix.items.map((item, i) => (
//                   <tr key={i}>
//                     <td className="border"></td>
//                     <td className="border p-2">
//                       <div className="font-semibold">{item.brand}</div>
//                       <div className="text-xs">{item.epa}</div>
//                     </td>
//                     <td className="border p-2">{item.type}</td>
//                     <td className="border p-2 text-center">{item.oz}</td>
//                     <td className="border p-2 text-center">
//                       ${item.cost.toFixed(2)}
//                     </td>
//                     <td className="border p-2 text-center">
//                       ${item.price.toFixed(2)}
//                     </td>
//                     <td className="border"></td>
//                   </tr>
//                 ))}

//                 {/* ===== COST PER TANK ===== */}
//                 <tr>
//                   <td
//                     colSpan={7}
//                     className="bg-green-200 p-2 font-semibold"
//                   >
//                     COST PER TANK (100 GAL): $
//                     {mix.costPerTank.toFixed(2)}
//                   </td>
//                 </tr>

//                 {/* ===== PRICE PER TANK ===== */}
//                 <tr>
//                   <td
//                     colSpan={7}
//                     className="bg-blue-200 p-2 font-semibold"
//                   >
//                     PRICE PER TANK (100 GAL): $
//                     {mix.pricePerTank.toFixed(2)}
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default ChemicalMixes;
