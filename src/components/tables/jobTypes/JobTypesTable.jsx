import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { resolveJobTypeDisplayCost } from "../../../utils/materialPricingDisplay";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function JobTypesTable() {
  const { pageNo } = useParams();
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(pageNo || 1);
  const [totalRecords, settotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [term, setTerm] = useState("");
  const navigate = useNavigate("");
  const [loading, setLoading] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [deletedId, setDeletedId] = useState("");
  const [perPageRecords, setPerPageRecords] = useState(10);

  const { tableSize } = useTableContext();

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

  useEffect(() => {
    getJobTypes();
  }, [currentPage, sortBy, sortOrder]);

  // useEffect(() => {
  //   searchJobTypes();
  // }, [term, currentPage]);

  const getJobTypes = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-job-types?page=${currentPage}&sortBy=${sortBy}&sortOrder=${sortOrder === "asc" ? 1 : -1}&search=${term}&limit=${perPageRecords}`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setData(response.data.result.jobTypes);
        setTotalPages(response.data.result.totalPages);
        settotalRecords(response.data.result.totalRecords);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
    setLoading(false);
  };

  //   const searchUsers = async () => {
  //     try {
  //       const token = localStorage.getItem("f&gadmintoken");
  //       const headers = {
  //         token: token,
  //         "Content-Type": "application/json",
  //       };
  //       setLoading(true);
  //       const formdata = new FormData();
  //       formdata.append("term", term);
  //       const response = await axios.post(
  //         `${process.env.REACT_APP_API_BASE_URL}/admin/search-active-users?page=${currentPage}`,
  //         formdata,
  //         { headers: headers }
  //       );
  //       if (response.data.statusCode === 200) {
  //         if(response.data.result.users.length === 0){
  //           setActiveUsers([]);
  //           setLoading(false);
  //           return;
  //         }
  //         setActiveUsers(response.data.result.users);
  //         setTotalPages(response.data.result.totalPages);
  //         settotalRecords(response.data.result.totalRecords);
  //       } else {
  //         toast.error(response.data.message);
  //       }
  //     } catch (error) {
  //       console.log("Error", error);
  //     }
  //     setLoading(false);
  //   }

  const moveToEditForm = (id) => {
    navigate(`/panel/admin/job-type/edit/${id}`, { state: { data: pageNo } });
  };

  useEffect(() => {
    navigate(`/panel/admin/all-job-types/1`);
    if(pageNo == 1){
      getJobTypes();

    }
  }, [sortBy, sortOrder, term,perPageRecords]);

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
    navigate(`/panel/admin/all-job-types/${currentPage - 1}`);
    // setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    navigate(`/panel/admin/all-job-types/${currentPage + 1}`);
    // setCurrentPage(currentPage + 1);
  };

  const handleStatus = async (e, id, status) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("status", status);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-job-type/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        if (data.length === 1 && status=="Delete") {
          if (currentPage === 1) {
            getJobTypes();
          } else {
            const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
            navigate(`/panel/admin/all-job-types/${page}`);
          }
        } else {
          getJobTypes();
        }
        // getJobTypes();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const searchJobTypes = async () => {
    try {
      if(term.length > 0){
        navigate('/panel/admin/all-job-types/1');
      }
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const formdata = new FormData();
      formdata.append("term", term);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/search-job-type?page=${currentPage}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (response.data.result.jobTypes.length === 0) {
          setData([]);
          setLoading(false);
          settotalRecords(0);
          return;
        }
        setData(response.data.result.jobTypes);
        setTotalPages(response.data.result.totalPages);
        settotalRecords(response.data.result.totalRecords);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
    setLoading(false);
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          <h3 className="card-title">Job Types</h3>
          {/* <div className="text-end">
            
          </div> */}
          <div className="text-end">
          <select
            name="perPage"
            id=""
            value={perPageRecords}
            onChange={(e) => {
              setPerPageRecords(e.target.value);
            }}
            className="w-[60px] border p-1 relative top-1 mr-2 outline-none cursor-pointer"
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
              className="border border-black px-2 outline-none py-1 relative top-1 mr-4"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/admin/job-type/add");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add Job Type
            </button>
          </div>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                {/* <th onClick={() => handleSort("_id")}>
                   Id{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "_id"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}
                <th onClick={() => handleSort("jobName")}>
                  Job Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "jobName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("cost")}>
                  Cost{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "cost"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("price")}>
                  Price{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "price"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("isTaxable")}>
                 Taxable{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "isTaxable"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("status")}>
                  Status{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "status"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, index) => {
                  return (
                    <tr key={index}>
                      {/* <td>{item._id}</td> */}
                      <td>{item.jobName}</td>
                      <td>{resolveJobTypeDisplayCost(item)}</td>
                      <td>{item.price}</td>
                      <td>{item.isTaxable ? "Yes" : "No"}</td>
                      <td>{item.status}</td>
                      {(
                        <td className="flex justify-center gap-4">
                          <button
                            onClick={() => {
                              moveToEditForm(item._id);
                            }}
                            title="Edit Job Type"
                          >
                            <i className="fa fa-edit"></i>
                          </button>
                          {item.status === "Active" ? (
                            <button
                              type="button"
                              className=""
                              data-toggle="modal"
                              data-target="#exampleModalCenter"
                              onClick={() => {
                                setDeletedId(item._id);
                              }}
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                handleStatus(e, item._id, "Active");
                              }}
                              disabled={disableBtn}
                              title="Change Status to Active"
                            >
                              <i className="fa fa-refresh"></i>
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="text-center" colSpan="6">
                    {loading ? "Loading ..." : "No Data Available"}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>Job Name</th>
                <th>Cost</th>
                <th>Price</th>
                <th>Taxable</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </tfoot>
          </table>
          <div className="flex lg:flex-row flex-col lg:items-end items-center justify-between px-1 mt-6">
            <div>
              <p>
              Showing {totalRecords === 0 ? 0 : perPageRecords * currentPage - (perPageRecords-1)} to{" "}
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
                      navigate(`/panel/admin/all-job-types/${i + 1}`);
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
                Delete Job Type
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
                  handleStatus(e, deletedId, "Delete");
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
    </div>
  );
}
