import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ClosedProposalTable() {
  const { pageNo } = useParams();
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
  const [convertedId, setConvertedId] = useState("");
  const [perPageRecords, setPerPageRecords] = useState(50);

  const { tableSize } = useTableContext();

  useEffect(() => {
    if (pageNo) {
      setCurrentPage(Number(pageNo));
    }
    setTerm("");
  }, []);

  useEffect(() => {
    if (pageNo) {
      setCurrentPage(Number(pageNo));
    }
  }, [pageNo]);

  useEffect(() => {
    getAllProposals();
  }, [currentPage, sortBy, sortOrder]);

  useEffect(() => {
    getAllProposals();
  }, [term]);

  const getAllProposals = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/proposal/get-closed-proposals?page=${currentPage}&sortBy=${sortBy}&sortOrder=${
          sortOrder === "asc" ? 1 : -1
        }&search=${term}&limit=${perPageRecords}`,
        { headers: headers }
      );

      // console.log("Resposne", response);

      if (response.data.statusCode === 200) {
        const updatedData = response.data.result.proposals.map(
          (item, index) => {
            return {
              ...item,
              SNo: (currentPage - 1) * perPageRecords + index + 1,
            };
          }
        );
        setData(updatedData);
        setTotalPages(response.data.result.totalPages);
        settotalRecords(response.data.result.totalRecords);
        const lastCode = localStorage.getItem("lastViewedCode");
        if (lastCode) {
          const rowElement = document.getElementById(`project-${lastCode}`);
          // console.log("row elemtn", rowElement);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log("Error", error);
    }
    setLoading(false);
  };

  const moveToEditForm = (id, projectCode) => {
    localStorage.setItem("lastViewedCode", projectCode);
    navigate(`/panel/office/edit-proposal/${id}`, { state: { data: pageNo } });
  };

  const moveToViewProjects = (id, projectCode) => {
    localStorage.setItem("lastViewedCode", projectCode);
    navigate(`/panel/office/view-proposal/${id}`);
  };

  const moveToConvertProjects = (id, projectCode) => {
    localStorage.setItem("lastViewedCode", projectCode);
    navigate(`/panel/office/convert-proposal/${id}`);
  };

  useEffect(() => {
    navigate(`/panel/office/all-closed-proposals/1`);
    if (pageNo == 1) {
      //   getAllProposals();
    }
  }, [sortBy, sortOrder, term, perPageRecords]);

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
    // setCurrentPage(currentPage - 1);
    navigate(`/panel/office/all-closed-proposals/${currentPage - 1}`);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    // setCurrentPage(currentPage + 1);
    navigate(`/panel/office/all-closed-proposals/${currentPage + 1}`);
  };

  const handleStatus = async (e, id, status) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("status", status);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/proposal/delete-proposal/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        if (data.length === 1 && status == "Delete") {
          if (currentPage === 1) {
            getAllProposals();
          } else {
            const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
            navigate(`/panel/office/all-closed-proposals/${page}`);
          }
        } else {
          getAllProposals();
        }
        // getAllProjects();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const convertToProject = async (e, id) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/proposal/convert-to-proposal/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);

        getAllProposals();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const closeBid = async (e, id) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("propsalId", id);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/proposal/mark-closed`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getAllProposals();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          {/* <h3 className="card-title">Customers</h3> */}
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">Closed Bids</h3>
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
              className={`btn bg-[#00613e] text-white text-sm relative top-0.5 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/office/add-proposal");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add New Bid
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
                <th onClick={() => handleSort("SNo")}>
                  S. No.{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "SNo"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>

                {/* <th onClick={() => handleSort("proposalId")}>
                  Bid Id{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "proposalId"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}
                <th onClick={() => handleSort("bidProjectId")}>
                  Project Code{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "bidProjectId"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
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
                {/* <th onClick={() => handleSort("customerEmail")}>
                  Customer Email{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerEmail"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}
                <th onClick={() => handleSort("bidCompletedDate")}>
                  Completed Date{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "bidCompletedDate"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                {/* <th onClick={() => handleSort("jobTypes")}>
                  Total Job Type{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "jobTypes"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th> */}

                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length > 0 ? (
                data.map((item, index) => {
                  return (
                    <tr key={index}>
                      <td>{item.SNo}</td>
                      {/* <td id={`project-${item._id}`}>{item._id}</td> */}
                      <td>{item.bidProjectId ? item.bidProjectId : "-"}</td>
                      <td>{item.customerName}</td>
                      {/* <td>{item.customerEmail ? item.customerEmail : "-"}</td> */}
                      <td>
                        {item.bidCompletedDate ? item.bidCompletedDate : "-"}
                      </td>
                      {/* <td className="text-start">
                        <p className="">
                          {item.projects.map((project, idx) => {
                            return <p>{" " + project.jobType.jobName}</p>;
                          })}
                        </p>
                      </td> */}
                      <td className="">
                        <button
                          onClick={() => {
                            moveToViewProjects(item._id, item._id);
                          }}
                          title="View Bid"
                          className="mx-2"
                        >
                          <i className="fa fa-eye"></i>
                        </button>
                        {/* <button
                          onClick={() => {
                            moveToEditForm(item._id, item._id);
                          }}
                          title="Edit Project"
                          className="mx-2"
                        >
                          <i className="fa fa-edit"></i>
                        </button> */}
                        <button
                          type="button"
                          data-toggle="modal"
                          data-target="#exampleModalCenter"
                          onClick={() => {
                            setDeletedId(item._id);
                          }}
                          title="Delete project"
                          className="mx-2"
                        >
                          <i className="fa fa-trash"></i>
                        </button>
                        {/* {item.canConvertToProject ? (
                          <button
                            onClick={() => {
                              moveToConvertProjects(item._id, item._id);
                            }}
                            title="Convert To project"
                            className="mx-2"
                          >
                            <i className="fa fa-arrow-right"></i>
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-toggle="modal"
                            data-target="#exampleModalCenter_convert"
                            onClick={() => {
                              setConvertedId(item._id);
                            }}
                            title="Close Bid"
                            className="mx-2"
                          >
                            <i className="fa fa-times"></i>
                          </button>
                        )} */}
                      </td>
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
                {/* <th> Id</th> */}
                <th>S. No.</th>
                {/* <th>Bid ID</th> */}
                <th>Project Code</th>
                <th>Customer Name</th>
                {/* <th>Customer Email</th> */}
                <th>Completed Date</th>
                {/* <th>Total Job Type</th> */}
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
                      // setCurrentPage(i + 1)
                      navigate(`/panel/office/all-customers/${i + 1}`);
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
      {/* Delete Modal */}
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
                Delete Bid
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

      {/* Convert this to Project Modal */}
      <div
        className="modal fade"
        id="exampleModalCenter_convert"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exampleModalCenterTitle"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLongTitle">
                Convert Bid
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
                  closeBid(e, convertedId);
                }}
                disabled={disableBtn}
                title="Change Status to Delete"
                type="button"
                className="btn bg-[#00613e] text-white"
                data-dismiss="modal"
              >
                Convert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
