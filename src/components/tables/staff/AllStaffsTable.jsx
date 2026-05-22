import axios from "axios";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AllStaffsTable() {
  const { pageNo } = useParams();

  const [staffs, setStaffs] = useState([]);
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
  const [editedId, setEditedId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [perPageRecords, setPerPageRecords] = useState(10);

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

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const { tableSize } = useTableContext();

  useEffect(() => {
    getStaffs();
  }, [currentPage, sortBy, sortOrder]);

  // useEffect(() => {
  //   searchUsers();
  // }, [term, currentPage]);

  const getStaffs = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await axios.get(
        `${
          process.env.REACT_APP_API_BASE_URL
        }/admin/get-staffs?page=${currentPage}&sortBy=${sortBy}&sortOrder=${
          sortOrder === "asc" ? 1 : -1
        }&search=${term}&limit=${perPageRecords}`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setStaffs(response.data.result.staffMembers);
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

  const moveToEditStaff = (staffId) => {
    navigate(`/panel/admin/staff/edit/${staffId}`, { state: { data: pageNo } });
  };

  useEffect(() => {
    navigate("/panel/admin/all-staffs/1");
    if (pageNo == 1) {
      getStaffs();
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

  // const sortedData = () => {
  //   let sorted = [...staffs];
  //   if (sortBy) {
  //     sorted.sort((a, b) => {
  //       const aValue = a[sortBy];
  //       const bValue = b[sortBy];
  //       if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
  //       if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
  //       return 0;
  //     });
  //   }
  //   return sorted;
  // };

  const sortedData = () => {
    let sorted = [...staffs];
    if (sortBy) {
      sorted.sort((a, b) => {
        const aValue = a[sortBy];
        const bValue = b[sortBy];

        // Check if the values are numeric
        const isNumeric = !isNaN(aValue) && !isNaN(bValue);

        if (isNumeric) {
          // Convert values to numbers for comparison
          return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
        } else {
          // Handle non-numeric values as strings
          if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
          if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
          return 0;
        }
      });
    }
    return sorted;
  };

  const previousPage = () => {
    if (currentPage <= 1) {
      return;
    }
    navigate(`/panel/admin/all-staffs/${currentPage - 1}`);
    // setCurrentPage(currentPage - 1);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    navigate(`/panel/admin/all-staffs/${currentPage + 1}`);
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
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-staff/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        if (staffs.length === 1 && status == "Delete") {
          if (currentPage === 1) {
            getStaffs();
          } else {
            const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
            navigate(`/panel/admin/all-staffs/${page}`);
          }
        } else {
          getStaffs();
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const saveNewPassword = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      const formdata = new FormData();
      formdata.append("password", password);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-staff/${editedId}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success("Password updated successfully");
        // navigate("/panel/admin/all-staffs");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const searchUsers = async () => {
    try {
      return;
      if (term.length > 0) {
        navigate("/panel/admin/all-staffs/1");
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
        `${process.env.REACT_APP_API_BASE_URL}/admin/search-all-staff?page=${currentPage}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (response.data.result.staffMembers.length === 0) {
          setStaffs([]);
          setLoading(false);
          settotalRecords(0);
          return;
        }
        setStaffs(response.data.result.staffMembers);
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
          <h3 className="card-title">All Staffs</h3>
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
              name="search-all-staffs"
              autoComplete="off"
              onChange={(e) => setTerm(e.target.value)}
            />
            <button
              className={`btn bg-[#00613e] text-white text-sm relative top-0.5 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/admin/staff/add");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add Staff
            </button>
          </div>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="table table-bordered table-striped text-center">
            <thead>
              <tr>
                <th>
                  Id{" "}
                  {/* <i
                    className={`${
                      sortOrder === "asc" && sortBy === "staffId"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i> */}
                </th>
                <th onClick={() => handleSort("staffName")}>
                  Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "staffName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("email")}>
                  Email{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "email"
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
              {staffs.length > 0 ? (
                staffs.map((item, index) => {
                  return (
                    <tr key={index}>
                      <td>{item.staffId}</td>
                      <td>{item.staffName}</td>
                      <td>{item.email}</td>
                      <td>{item.status}</td>
                      <td className="flex justify-center gap-3">
                        <button
                          onClick={() => {
                            moveToEditStaff(item._id);
                          }}
                          title="Edit Staff"
                        >
                          <i className="fa fa-edit"></i>
                        </button>
                        <button
                          type="button"
                          className=""
                          data-toggle="modal"
                          data-target="#exampleModal1"
                          onClick={() => {
                            setEditedId(item._id);
                          }}
                          title="Change Password"
                        >
                          <i className="fa fa-lock"></i>
                        </button>
                        {
                          <button
                            type="button"
                            className=""
                            data-toggle="modal"
                            data-target="#exampleModalCenter_all_staff"
                            onClick={() => {
                              setDeletedId(item._id);
                            }}
                            title="Delete Staff"
                          >
                            <i className="fa fa-trash"></i>
                          </button>
                        }
                        {item.status === "Active" ? (
                          <button
                            onClick={(e) => {
                              handleStatus(e, item._id, "Block");
                            }}
                            disabled={disableBtn}
                            title="Change Status to Block"
                          >
                            <i className="fa fa-ban"></i>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              handleStatus(e, item._id, "Active");
                            }}
                            disabled={disableBtn}
                            title="Change Status to Active"
                          >
                            <i className="fa fa-user"></i>
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
                <th> Id</th>
                <th> Name</th>
                <th>Email</th>
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
                      navigate(`/panel/admin/all-staffs/${i + 1}`);
                      // setCurrentPage(i + 1);
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
        id="exampleModal1"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exampleModalLabel"
        aria-hidden="true"
      >
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">
                Staff
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
            <div className="modal-body">
              <div className="form-group">
                <div class="input-group">
                  <input
                    type={passwordVisible ? "text" : "password"}
                    className="form-control"
                    id="customerEmail"
                    placeholder="Enter New Password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                    }}
                    name="password"
                    required
                  />
                  <div class="input-group-append">
                    <div
                      className="input-group-text"
                      style={{ cursor: "pointer" }}
                      onClick={togglePasswordVisibility}
                    >
                      <span
                        className={`fa ${
                          passwordVisible ? "fa-eye-slash" : "fa-eye"
                        } text-[18px]`}
                      ></span>
                    </div>
                    {/* <div class="input-group-text w-[38px]">
                    <span class="fa fa-lock text-[18px]"></span>
                  </div> */}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-dismiss="modal"
              >
                Close
              </button>
              <button
                type="button"
                onClick={saveNewPassword}
                className="btn bg-[#00613e] text-white"
                data-dismiss="modal"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
      <div
        className="modal fade"
        id="exampleModalCenter_all_staff"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exampleModalCenterTitle"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLongTitle">
                Delete Staff
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
