import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import parse from "html-react-parser";

export default function StaffBilledProjectTable() {
  const { pageNo } = useParams();
  const [data, setData] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(pageNo || 1);
  const [totalRecords, settotalRecords] = useState(0);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [disableBtn, setDisableBtn] = useState(false);
  const [deletedId, setDeletedId] = useState("");
  const [perPageRecords, setPerPageRecords] = useState(50);

  const navigate = useNavigate("");

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
    getAllProjects();
  }, []);

  useEffect(() => {
    getAllProjects();
  }, [currentPage, sortBy, sortOrder]);

  // useEffect(() => {
  //   searchProjects();
  // }, [term, currentPage]);

  function formatDate(dateInput) {
    try {
      if (!dateInput) {
        return;
      }
      dateInput = Number.parseInt(dateInput, 10);
      const date = new Date(dateInput);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        throw new Error("Invalid date input");
      }

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();

      return `${day}, ${month} ${year}`;
    } catch (error) {
      console.log("Error", error);
    }
  }

  const getAllProjects = async () => {
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
        }/project/get-billed-projects?page=${currentPage}&sortBy=${sortBy}&sortOrder=${
          sortOrder === "asc" ? 1 : -1
        }&search=${term}&limit=${perPageRecords}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        const updatedData = response.data.result.projects.map((item, index) => {
          return {
            ...item,
            serialNo: (currentPage - 1) * perPageRecords + index + 1,
          };
        });
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

  const searchProjects = async () => {
    try {
      if (term.length > 0) {
        navigate("/panel/office/billed-projects/1");
      }
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const formdata = new FormData();
      formdata.append("term", term);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/search-billed-project?page=${currentPage}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (response.data.result.projects.length === 0) {
          setData([]);
          setLoading(false);
          settotalRecords(0);
          return;
        }
        const updatedData = response.data.result.projects.map((item, index) => {
          return {
            ...item,
            serialNo: (currentPage - 1) * 10 + index + 1,
          };
        });
        setData(updatedData);
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

  const moveToEditForm = (id, billingType) => {
    if (billingType === "No Bid") {
      navigate(`/panel/office/project/edit/${id}/0`, {
        state: { data: pageNo },
      });
    }
    if (billingType === "Bid") {
      navigate(`/panel/office/project/edit/${id}/1`, {
        state: { data: pageNo },
      });
    }
  };

  const viewProject = (id, billingType, projectCode) => {
    localStorage.setItem("lastViewedCode", projectCode);
    if (billingType === "No Bid") {
      navigate(`/panel/office/project/view/${id}/0`, {
        state: { data: pageNo },
      });
    }
    if (billingType === "Bid") {
      navigate(`/panel/office/project/view/${id}/1`, {
        state: { data: pageNo },
      });
    }
  };

  useEffect(() => {
    navigate(`/panel/office/billed-projects/1`);
    if (pageNo == 1) {
      getAllProjects();
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
    navigate(`/panel/office/billed-projects/${currentPage - 1}`);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    // setCurrentPage(currentPage + 1);
    navigate(`/panel/office/billed-projects/${currentPage + 1}`);
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
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-project/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        if (data.length === 1 && status == "Delete") {
          if (currentPage === 1) {
            getAllProjects();
          } else {
            const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
            navigate(`/panel/office/billed-projects/${page}`);
          }
        } else {
          getAllProjects();
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

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          {/* <h3 className="card-title">Billed Projects</h3> */}
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">BILLED PROJECTS</h3>
          </div>

          {/* <div className="text-end">
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
                navigate("/panel/office/project/add/0");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Create New Project – No Bid
            </button>
          </div> */}

          <div className="flex justify-end flex-wrap gap-2 w-auto">
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
              className="border border-black px-2 outline-none py-1 relative top-1"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
            />
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/office/all-proposals/1");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Start Project – Bid
            </button>
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/office/project/add/0");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Create New Project – No Bid
            </button>
          </div>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th onClick={() => handleSort("serialNo")}>S. No. </th>
                <th onClick={() => handleSort("projectCode")}>
                  Project Code{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "projectCode"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                {/*<th onClick={() => handleSort("projectStartDate")}>
                  Start Date{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "projectStartDate"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>*/}
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

                {/* <th onClick={() => handleSort("description")}>
                  Description{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "description"
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

                <th onClick={() => handleSort("billingType")}>
                  Billing Type{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "billingType"
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
              {!loading ? (
                data.length > 0 ? (
                  data.map((item, index) => {
                    return (
                      <tr key={index}>
                        <td>{item.serialNo}</td>
                        <td id={`project-${item.projectCode}`}>{item.projectCode}</td>
                        {/* <td>
                          {item.projectStartDate
                            ? formatDate(item?.projectStartDate)
                            : ""}
                        </td> */}
                        <td>{item.customerName}</td>
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
                        <td className="">
                          {item.jobName ? item.jobName : "-"}
                        </td>
                        <td>{item.billingType}</td>
                        <td>
                          {item.status === "Active"
                            ? "Not Started"
                            : item.status}
                        </td>
                        <td className="flex justify-center gap-4">
                          {/* <button
                          onClick={() => {
                            moveToEditForm(item._id, item.billingType);
                          }}
                          title="Edit Project"
                        >
                          <i className="fa fa-edit"></i>
                        </button> */}
                          {item.status === "Active" ||
                          item.status === "Ongoing" ||
                          item.status === "Billed" ? (
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
                          <button
                            onClick={() => {
                              viewProject(item._id, item.billingType, item?.projectCode);
                            }}
                            title="View Project"
                          >
                            <i className="fa fa-eye text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="text-center" colSpan="8">
                      No Data Available
                    </td>
                  </tr>
                )
              ) : (
                <tr>
                  <td className="text-center" colSpan="8">
                    Loading ...
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th>S. No.</th>
                <th>Project Id</th>
                {/* <th>Start Date</th> */}
                <th>Customer Name</th>
                <th>Job Name</th>
                <th>Billing Type</th>
                <th>Status</th>
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
              {/* {Array.from({ length: totalPages }, (_, i) => {
                return (
                  <button
                    className={`border-x px-[10px] py-1 ${
                      currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                    }`}
                    key={i}
                    onClick={() => {
                      navigate(`/panel/office/billed-projects/${i + 1}`);
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })} */}
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
