import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function CustomerProjectsTable() {
  const { pageNo, customerId } = useParams();
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
  const [selectedProjects, setSelectedProjects] = useState([]);
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
        }/customer/customer-projects/${customerId}?page=${currentPage}&sortBy=${sortBy}&sortOrder=${
          sortOrder === "asc" ? 1 : -1
        }&search=${term}&limit=${perPageRecords}`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
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

  const moveToViewCompiledProjects = () => {
    if (selectedProjects.length === 0) {
      toast.error(
        "Please select at least one project to view compiled projects."
      );
      return;
    }
    // Find selected project and check their jobAddress is same or not, if not then throw error.
    const projectData = selectedProjects.map((projectId) => {
      const project = data.find((project) => project._id === projectId);
      return {
        jobAddress: project.jobAddress,
        _id: project._id,
        
      };
    });
    const allJobAddressesEqual = projectData.every(
      (item) => item.jobAddress === projectData[0].jobAddress
    );
    if (allJobAddressesEqual) {
      navigate(`/panel/office/customer/compiled-projects`, {
        state: { data: selectedProjects },
      });
    } else {
      toast.error(
        "All selected projects must have same job address to view compiled projects."
      );
    }
  };

  useEffect(() => {
    navigate(`/panel/office/all-customer-projects/${customerId}/1`);
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
    navigate(
      `/panel/office/all-customer-projects/${customerId}/${currentPage - 1}`
    );
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    // setCurrentPage(currentPage + 1);
    navigate(
      `/panel/office/all-customer-projects/${customerId}/${currentPage + 1}`
    );
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
        getAllProjects();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const handleSelectedProject = (isChecked, id) => {
    if (isChecked) {
      setSelectedProjects((prevData) => prevData.filter((item) => item !== id));
    } else {
      setSelectedProjects((prevData) => [...prevData, id]);
    }
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
        <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">PROJECTS</h3>
          </div>

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
                disableBtn || selectedProjects.length == 0 ? "disabled" : ""
              }`}
              onClick={moveToViewCompiledProjects}
            >
              See Compiled Data
              <i className="fa fa-angle-double-right ml-2"></i>
            </button>
          </div>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th onClick={() => handleSort("serialNo")}>
                  S. No.{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "serialNo"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
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
                {/* <th onClick={() => handleSort("projectStartDate")}>
                  Start Date{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "projectStartDate"
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
              {data.length > 0 ? (
                data.map((item, index) => {
                  return (
                    <tr key={index}>
                      <td>{item.serialNo}</td>
                      <td>{item.projectCode}</td>
                      {/* <td>
                        {item.projectStartDate
                          ? formatDate(item?.projectStartDate)
                          : ""}
                      </td> */}
                      <td>{item.customerName}</td>
                      <td>{item.billingType}</td>
                      <td>
                        {item.status === "Active" ? "Not Started" : item.status}
                      </td>
                      <td className="text-center">
                        <input
                          type="checkbox"
                          id={item._id}
                          checked={selectedProjects.some(
                            (field) => field === item._id
                          )}
                          onChange={(e) => {
                            const isChecked = selectedProjects.some(
                              (field) => field === item._id
                            );
                            handleSelectedProject(isChecked, item._id);
                          }}
                          className="h-[18px] w-[18px] cursor-pointer"
                          disabled={item.status !== "Completed"}
                        />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="text-center" colSpan="7">
                    {loading ? "Loading ..." : "No Data Available"}
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
              {Array.from({ length: totalPages }, (_, i) => {
                return (
                  <button
                    className={`border-x px-[10px] py-1 ${
                      currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                    }`}
                    key={i}
                    onClick={() => {
                      // setCurrentPage(i + 1)
                      navigate(
                        `/panel/office/all-customer-projects/${customerId}/${
                          i + 1
                        }`
                      );
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
    </div>
  );
}
