import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import parse from "html-react-parser";
import EditCustomerModal from "./components/ManageCustomer/EditCustomer";
import DeleteCustomer from "./components/ManageCustomer/DeleteCustomer";
import ManageCustomersPreviousPlansSection from "./ManageCustomersPreviousPlansSection";
import { saveHighlightedArchivedPlan } from "../../../utils/archivedPlanHighlight";

// components/Dashboard/dummyCustomers.js
export const DUMMY_CUSTOMERS = [
  {
    _id: "1",
    customerName: "Rahul Sharma",
    email: "rahul@gmail.com",
    phone: "9876543210",
    status: "Active",
    address: "5949 CRAB ORCHARD RD. HOUSTON, TX 77057",
    billingType: "Bid",
    treatments: [
      {
        treatment: "Pest Control",
        scheduledDate: "2025-01-10",
        price: 120,
        projectCode: "PC-101",
        quantity: 1,
        status: "Completed",
      },
      {
        treatment: "Termite Control",
        scheduledDate: "2025-02-15",
        price: 300,
        projectCode: "TC-102",
        quantity: 1,
        status: "Paused",
      },
      {
        treatment: "Termite Control",
        scheduledDate: "2025-02-15",
        price: 300,
        projectCode: "TC-102",
        quantity: 1,
        status: "Scheduled",
      },
    ],
  },
  {
    _id: "2",
    customerName: "Amit Verma",
    email: "amit@gmail.com",
    phone: "9123456789",
    status: "Completed",
    billingType: "Bid",
    address: "5949 CRAB ORCHARD RD. HOUSTON, TX 77057",
    treatments: [
      {
        treatment: "Sanitization",
        scheduledDate: "2025-01-20",
        price: 150,
        projectCode: "SN-201",
        quantity: 2,
        status: "Completed",
      },
      {
        treatment: "Sanitization ff",
        scheduledDate: "2025-01-20",
        price: 150,
        projectCode: "SN-201",
        quantity: 2,
        status: "Scheduled",
      },
    ],
  },
];

export default function ManageCustomersTable() {
  const { pageNo } = useParams();
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(pageNo || 1);
  const [totalRecords, settotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [term, setTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const navigate = useNavigate("");
  const [loading, setLoading] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [deletedId, setDeletedId] = useState("");
  const [perPageRecords, setPerPageRecords] = useState(10);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [rolloverLoadingId, setRolloverLoadingId] = useState("");
  const [archivedPlansRefreshToken, setArchivedPlansRefreshToken] = useState(0);

  const { tableSize } = useTableContext();

  useEffect(() => {
    getAllChemicalCustomers();
  }, [currentPage, perPageRecords, sortBy, sortOrder, debouncedTerm]);

  // Debounce search term so we don't hit API on every keystroke
  useEffect(() => {
    const delay = setTimeout(() => {
      setDebouncedTerm(term);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(delay);
  }, [term]);

  const getAllChemicalCustomers = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return;
      }

      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers`,
        {
          headers: { token },
          params: {
            page: currentPage,
            limit: perPageRecords,
            search: debouncedTerm || "",
            sortby: sortBy || "updatedAt",
            sortorder: sortBy ? (sortOrder === "asc" ? 1 : -1) : -1,
          },
        },
      );

      if (response.data.success && response.data.data) {
        // Support both shapes:
        // 1) data is already paginated from backend: { customers, totalPages, totalRecords }
        // 2) data is a simple array (old behavior)
        const apiData = response.data.data;

        let customers = [];
        let totalPagesFromServer = 0;
        let totalRecordsFromServer = 0;
        let listForPage = [];

        if (Array.isArray(apiData)) {
          // Old API: array of all customers, paginate + sort + search on frontend
          customers = [...apiData];

          // Apply frontend search (by name, email, phone)
          if (debouncedTerm) {
            const t = debouncedTerm.toLowerCase();
            customers = customers.filter((c) => {
              const name = (c.customerName || "").toLowerCase();
              const email = (c.customerEmail || c.email || "").toLowerCase();
              const phone = String(c.customerPhone || c.phone || "");
              return (
                name.includes(t) ||
                email.includes(t) ||
                phone.includes(debouncedTerm)
              );
            });
          }

          // Apply frontend sort if backend doesn't handle it
          if (sortBy) {
            customers.sort((a, b) => {
              const aValue = a[sortBy];
              const bValue = b[sortBy];
              if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
              if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
              return 0;
            });
          } else {
            customers.sort((a, b) => {
              const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
              const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
              return bTime - aTime;
            });
          }

          totalRecordsFromServer = customers.length;
          totalPagesFromServer = Math.ceil(
            totalRecordsFromServer / perPageRecords,
          );

          const startIndex = (currentPage - 1) * perPageRecords;
          listForPage = customers.slice(startIndex, startIndex + perPageRecords);
        } else if (Array.isArray(apiData.customers)) {
          // New API: server-side pagination + sorting
          customers = apiData.customers;

          // Apply client-side search as safety if backend doesn't filter
          if (debouncedTerm) {
            const t = debouncedTerm.toLowerCase();
            customers = customers.filter((c) => {
              const name = (c.customerName || "").toLowerCase();
              const email = (c.customerEmail || c.email || "").toLowerCase();
              const phone = String(c.customerPhone || c.phone || "");
              return (
                name.includes(t) ||
                email.includes(t) ||
                phone.includes(debouncedTerm)
              );
            });
          }

          listForPage = customers;
          totalPagesFromServer =
            apiData.totalPages || Math.ceil(customers.length / perPageRecords);
          totalRecordsFromServer = apiData.totalRecords || customers.length;
        }

        const mapped = listForPage.map((item, index) => ({
          ...item,
          serialNo: (currentPage - 1) * perPageRecords + index + 1,
          email: item.customerEmail || item.email || "-",
          phone: item.customerPhone || item.phone || "-",
          status: item.status || "Active",
        }));

        setData(mapped);
        setTotalPages(totalPagesFromServer);
        settotalRecords(totalRecordsFromServer);
      } else {
        setData([]);
        setTotalPages(0);
        settotalRecords(0);
      }
    } catch (error) {
      console.error("Error fetching chemical customers:", error);
      toast.error("Failed to load customers");
      setData([]);
      setTotalPages(0);
      settotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pageNo) {
      setCurrentPage(Number(pageNo));
    }
  }, []);

  useEffect(() => {
    if (pageNo) {
      setCurrentPage(Number(pageNo));
    }
  }, [pageNo]);

  const handleDeleteCustomer = async (id) => {
    if (deleteLoading) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return;
      }

      setDisableBtn(true);
      const response = await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${id}`,
        {
          headers: { token },
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Customer deleted successfully");
        setShowDeleteModal(false);
        setSelectedCustomer(null);
        getAllChemicalCustomers();
      } else {
        toast.error(response.data.message || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast.error(
        error.response?.data?.message || error.message || "Failed to delete customer"
      );
    } finally {
      setDisableBtn(false);
      setDeleteLoading(false);
    }
  };

  const handleRollover = async (customer) => {
    if (!customer?._id || rolloverLoadingId) return;
    const currentYear = customer.planYear || new Date().getFullYear();
    const nextYear = Number(currentYear) + 1;
    const contractLabel =
      customer.contractTotal != null && customer.contractTotal !== ""
        ? `$${Number(customer.contractTotal).toFixed(2)}`
        : "$0.00";
    const confirmed = window.confirm(
      `Archive ${currentYear} plan for "${customer.customerName}" and start ${nextYear} plan?\n\n` +
        `• ${currentYear} snapshot → Archived Plans\n` +
        `• Contract total carries forward: ${contractLabel}\n` +
        `• Materials used to date resets to $0.00 for ${nextYear}\n` +
        `• Same annual program rows, fresh schedule (qty/dates cleared)\n` +
        `• Other chemical treatments carry into the new year program (qty/dates cleared)`
    );
    if (!confirmed) return;

    try {
      setRolloverLoadingId(customer._id);
      const token = localStorage.getItem("f&gstafftoken");
      if (!token) {
        toast.error("Token missing. Please login again.");
        return;
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/chemical-maintenance/customers/${customer._id}/rollover`,
        {},
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(response.data.message || "Plan archived and new year started");
        const archivedPlan = response.data.data?.archivedPlan;
        if (archivedPlan) {
          saveHighlightedArchivedPlan(archivedPlan);
        }
        setArchivedPlansRefreshToken((n) => n + 1);
        getAllChemicalCustomers();
      } else {
        toast.error(response.data.message || "Rollover failed");
      }
    } catch (error) {
      console.error("Rollover error:", error);
      toast.error(error.response?.data?.message || "Rollover failed");
    } finally {
      setRolloverLoadingId("");
    }
  };

  // useEffect(() => {
  //   getAllProjects();
  // }, [currentPage, sortBy, sortOrder]);

  // useEffect(() => {
  //   searchProjects();
  // }, [term, currentPage]);

  // const getAllProjects = async () => {
  //   try {
  //     const token = localStorage.getItem("f&gstafftoken");
  //     const headers = {
  //       token: token,
  //       "Content-Type": "application/json",
  //     };
  //     setLoading(true);
  //     const response = await axios
  //       .get
  //       // `${
  //       //   process.env.REACT_APP_API_BASE_URL
  //       // }/project/get-bid-projects?page=${currentPage}&sortBy=${sortBy}&sortOrder=${
  //       //   sortOrder === "asc" ? 1 : -1
  //       // }&search=${term}&limit=${perPageRecords}`,
  //       // { headers: headers }
  //       ();

  //     if (response.data.statusCode === 200) {
  //       const updatedData = response.data.result.projects.map((item, index) => {
  //         return {
  //           ...item,
  //           serialNo: (currentPage - 1) * perPageRecords + index + 1,
  //         };
  //       });
  //       setData(updatedData);
  //       setTotalPages(response.data.result.totalPages);
  //       settotalRecords(response.data.result.totalRecords);
  //     } else {
  //       toast.error(response.data.message);
  //     }
  //   } catch (error) {
  //     console.log("Error", error);
  //   }
  //   setLoading(false);
  // };

  // const searchProjects = async () => {
  //   try {
  //     // if (term.length > 0) {
  //     //   navigate("/panel/office/bid-projects/1");
  //     // }
  //     const token = localStorage.getItem("f&gstafftoken");
  //     const headers = {
  //       token: token,
  //       "Content-Type": "application/json",
  //     };
  //     setLoading(true);
  //     const formdata = new FormData();
  //     formdata.append("term", term);
  //     const response = await axios.post(
  //       `${process.env.REACT_APP_API_BASE_URL}/project/search-bid-project?page=${currentPage}`,
  //       formdata,
  //       { headers: headers },
  //     );
  //     if (response.data.statusCode === 200) {
  //       if (response.data.result.projects.length === 0) {
  //         setData([]);
  //         setLoading(false);
  //         settotalRecords(0);
  //         return;
  //       }
  //       const updatedData = response.data.result.projects.map((item, index) => {
  //         return {
  //           ...item,
  //           serialNo: (currentPage - 1) * 10 + index + 1,
  //         };
  //       });
  //       setData(updatedData);
  //       setTotalPages(response.data.result.totalPages);
  //       settotalRecords(response.data.result.totalRecords);
  //     } else {
  //       toast.error(response.data.message);
  //     }
  //   } catch (error) {
  //     console.log("Error", error);
  //   }
  //   setLoading(false);
  // };

  const moveToEditForm = (id) => {
    navigate(`/panel/office/project/edit-bid/${id}/1`, {
      state: { data: pageNo },
    });
  };

  const viewProject = (id) => {
    navigate(`/panel/office/project/view-bid/${id}/1`, {
      state: { data: pageNo },
    });
  };

  // useEffect(() => {
  //   navigate(`/panel/office/bid-projects/1`);
  //   if (pageNo == 1) {
  //     getAllProjects();
  //   }
  // }, [sortBy, sortOrder, term, perPageRecords]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const sortedData = () => {
    let sorted = [...data];
    if (sortBy) {
      sorted.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  };

  const previousPage = () => {
    if (currentPage <= 1) {
      return;
    }
    setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    setCurrentPage(currentPage + 1);
  };

  // const handleStatus = async (e, id, status) => {
  //   e.preventDefault();
  //   try {
  //     const token = localStorage.getItem("f&gstafftoken");
  //     const headers = {
  //       token: token,
  //     };
  //     const formdata = new FormData();
  //     formdata.append("status", status);
  //     setDisableBtn(true);
  //     const response = await axios.post(
  //       `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
  //       formdata,
  //       {
  //         headers: headers,
  //       },
  //     );

  //     if (response.data.statusCode === 200) {
  //       toast.success(response.data.message);
  //       if (data.length === 1 && status == "Delete") {
  //         if (currentPage === 1) {
  //           getAllProjects();
  //         } else {
  //           const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
  //           navigate(`/panel/office/bid-projects/${page}`);
  //         }
  //       } else {
  //         getAllProjects();
  //       }
  //       // getAllProjects();
  //     } else {
  //       toast.error(response.data.message);
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     toast.error(error.response.message);
  //   }
  //   setDisableBtn(false);
  // };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          {/* <h3 className="card-title">Bid Projects</h3> */}
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">MANAGE CUSTOMERS</h3>
          </div>
          {/* <div className="text-end">
            <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div> */}
          <div className="flex justify-end flex-wrap gap-2 w-auto">
            <select
              name="perPage"
              id=""
              value={perPageRecords}
              onChange={(e) => {
                setPerPageRecords(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-[60px] border p-1 relative top-1 mr-2 outline-none cursor-pointer h-[34px]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>
            <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1 relative top-1 mr-4 lg:mb-1 mb-0"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            {/* <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/office/project/add/1");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Create New Bid
            </button> */}
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/office/chemical-maintenance/add-new-customer");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add New Customer
            </button>
          </div>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th onClick={() => handleSort("serialNo")}>
                  S. No.{" "}
                  {/* <i
                    className={`${
                      sortOrder === "asc" && sortBy === "serialNo"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i> */}
                </th>

                {/* <th onClick={() => handleSort("projectCode")}>
                  Project Code{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "projectCode"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}

                <th onClick={() => handleSort("customerName")}>
                  Customer Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("customerName")}>
                  Email{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("customerName")}>
                  Phone Number{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th>Plan Year</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading ? (
                data.length > 0 ? (
                  data.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{item.serialNo}</td>
                        {/* <td>{item.projectCode ? item.projectCode : "-"}</td> */}
                        <td>{item.customerName}</td>
                        <td>{item.email}</td>
                        <td>{item.phone}</td>
                        <td>{item.planYear || new Date().getFullYear()}</td>
                        {/* <td>{item.status}</td> */}
                        {/* <td className="flex justify-center text-center">
                          <div
                            className="text-center"
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              // textOverflow: "ellipsis",
                              maxWidth: "140px",
                            }}
                          >
                            <span>{parse(item.description)}</span>
                          </div>
                          <span>...</span>
                        </td> */}
                        {/* <td className="">{item.jobName ? item.jobName : "-"}</td> */}
                        {/* <td>{item.billingType}</td>
                        <td>{item.quantity ?? "-"}</td> */}
                        {/* <td>
                          {item.status === "Active"
                            ? "Not Started"
                            : item.status}
                        </td> */}
                        <td className="flex justify-center gap-4">
                          <button
                            onClick={() => {
                              setSelectedCustomer(item);
                              setShowEditModal(true);
                            }}
                            title="Edit Customer"
                          >
                            <i className="fa fa-edit"></i>
                          </button>

                          <button
                            onClick={() => handleRollover(item)}
                            disabled={rolloverLoadingId === item._id}
                            title="Archive current year and start new plan year"
                          >
                            <i className="fa fa-calendar"></i>
                          </button>

                          {item.status === "Active" ||
                          item.status === "Ongoing" ||
                          item.status === "Completed" ? (
                            <button
                              onClick={() => {
                                setSelectedCustomer(item);
                                setShowDeleteModal(true);
                              }}
                              title="Delete Customer"
                            >
                              <i className="fa fa-trash "></i>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                // handleStatus(e, item._id, "Active");
                              }}
                              disabled={disableBtn}
                              title="Change Status to Active"
                            >
                              <i className="fa fa-refresh"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="text-center" colSpan="7">
                      No Data Available
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="text-center" colSpan="7">
                    Loading ...
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>S. No.</th>
                {/* <th>Project Code</th> */}
                <th>Customer Name</th>
                <th>Email </th>
                <th> Phone Number</th>
                {/* <th>Status</th> */}
                <th>Actions</th>
              </tr>
            </tfoot>
          </table>
          <div className="flex lg:flex-row flex-col lg:items-end items-center justify-between px-1 mt-6">
            <div>
              <p>
                Showing{" "}
                {totalRecords === 0
                  ? 0
                  : perPageRecords * currentPage - (perPageRecords - 1)}{" "}
                to{" "}
                {currentPage * perPageRecords > totalRecords
                  ? totalRecords
                  : currentPage * perPageRecords}{" "}
                of {totalRecords} entries
              </p>
            </div>
            <div className="flex justify-end mt-2">
              <button
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={previousPage}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => {
                return (
                  <button
                    className={`border-x px-[10px] py-1 ${
                      currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                    }`}
                    key={i}
                    onClick={() => {
                      setCurrentPage(i + 1);
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
              <button
                className="bg-[#00613e] text-white px-2 py-1"
                onClick={nextPage}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <ManageCustomersPreviousPlansSection refreshToken={archivedPlansRefreshToken} />

      <div
        className="modal fade"
        id="exampleModalCenter"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exampleModalCenterTitle"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLongTitle">
                Delete Project
              </h5>
              <button
                type="button"
                className="close"
                data-dismiss="modal"
                aria-label="Close"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="modal-body">Are you sure ?</div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Close
              </button>
              <button
                onClick={(e) => {
                  // handleStatus(e, deletedId, "Delete");
                }}
                disabled={disableBtn}
                title="Change Status to Delete"
                type="button"
                className="btn btn-danger"
                data-dismiss="modal"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      {showEditModal && (
        <EditCustomerModal
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          customer={selectedCustomer}
          onSuccess={() => {
            getAllChemicalCustomers();
          }}
        />
      )}
      {showDeleteModal && (
        <DeleteCustomer
          show={showDeleteModal}
          customer={selectedCustomer}
          isLoading={deleteLoading}
          onClose={() => {
            if (!deleteLoading) {
              setShowDeleteModal(false);
              setSelectedCustomer(null);
            }
          }}
          onConfirm={(id) => handleDeleteCustomer(id)}
        />
      )}
    </div>
  );
}
