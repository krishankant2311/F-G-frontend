import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LaborTable() {
  const  {pageNo} = useParams()
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(pageNo || 1);
  const [totalRecords, settotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");
  const [term, setTerm] = useState("");
  const navigate = useNavigate("");
  const [loading, setLoading] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [deletedId, setDeletedId] = useState("");

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
    getLabors();
  }, [currentPage, sortBy, sortOrder]);

  useEffect(() => {
    searchLabors();
  }, [term, currentPage]);

  const getLabors = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-labors?page=${currentPage}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setData(response.data.result.labors);
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
    navigate(`/panel/admin/labor/edit/${id}`,{state : {data : pageNo}});
  };

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
    navigate(`/panel/admin/all-labors/${currentPage - 1}`);
    // setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    navigate(`/panel/admin/all-labors/${currentPage + 1}`);
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
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-labor/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getLabors();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const searchLabors = async () => {
    try {
      if(term.length > 0){
        navigate('/panel/admin/all-labors/1');
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
        `${process.env.REACT_APP_API_BASE_URL}/admin/search-labor?page=${currentPage}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (response.data.result.labors.length === 0) {
          setData([]);
          setLoading(false);
          settotalRecords(0);
          return;
        }
        setData(response.data.result.labors);
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
          <h3 className="card-title">Labor Management</h3>
          {/* <div className="text-end">
            <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
          </div> */}
          <div className="text-end">
          <input
              type="text"
              placeholder="Search"
              className="border border-black px-2 outline-none py-1 relative top-1 mr-4"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <button
              className={`btn btn-primary text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/admin/labor/add");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add Labor Type
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
                <th onClick={() => handleSort("jobType")}>
                  Job Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "jobType"
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
              {sortedData().length > 0 ? (
                sortedData().map((item, index) => {
                  return (
                    <tr key={index}>
                      <td>{item.jobType}</td>
                      <td>{item.price}</td>
                      <td>{item.isTaxable ? "Yes" : "No"}</td>
                      <td>{item.status}</td>
                      <td className="flex justify-center gap-4">
                        <button
                          onClick={() => {
                            moveToEditForm(item._id);
                          }}
                          title="Edit Job Type"
                        >
                          <i className="fa fa-edit"></i>
                        </button>
                        {item.status === "Active" && (
                          <button
                            type="button"
                            className=""
                            data-toggle="modal"
                            disabled = {["Project Manager", "Foreman"].includes(item.jobType)}
                            title="disabled"
                            data-target="#exampleModalCenter"
                            onClick={() => {
                              setDeletedId(item._id);
                            }}
                          >
                            <i className="fa fa-trash"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="text-center" colSpan="5">
                    {loading ? "Loading ..." : "No Data Available"}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>Job Type</th>
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
                Showing {totalRecords === 0 ? 0 : 10 * currentPage - 9} to{" "}
                {currentPage * 10 > totalRecords
                  ? totalRecords
                  : currentPage * 10}{" "}
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
                    className={`border px-[10px] py-1 ${
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
