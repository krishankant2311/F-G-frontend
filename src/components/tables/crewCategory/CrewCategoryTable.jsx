import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function CrewCategoryTable() {
  const {pageNo} = useParams();
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
    getCrewCategoies();
  }, [currentPage, sortBy, sortOrder]);

  useEffect(() => {
    // searchUsers();
  }, [term, currentPage]);

  const getCrewCategoies = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-crew-categories?page=${currentPage}`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setData(response.data.result.crewCategories);
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
    navigate(`/panel/admin/crew-category/edit/${id}`, {state : {data : pageNo}});
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
    // setCurrentPage(currentPage - 1);
    navigate(`/panel/admin/all-crew-categories/${currentPage - 1}`);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    // setCurrentPage(currentPage + 1);
    navigate(`/panel/admin/all-crew-categories/${currentPage + 1}`);
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
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-crew-category/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getCrewCategoies();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     crewName: "",
    //     crewCategory: "",
    //     rating : "",
    //     status : ""
    //   });
    setDisableBtn(false);
  };

  return (
    <div className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}>
      <ToastContainer />
      <div className="card">
        <div className="px-4 py-3 flex justify-between items-end border-b">
          <h3 className="card-title">Crew Categories</h3>
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
            <button
              className={`btn btn-primary text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/admin/crew-category/add");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add category
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
                <th onClick={() => handleSort("crewCategoryName")}>
                  Category Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "crewCategoryName"
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
                      {/* <td>{item._id}</td> */}
                      <td>{item.crewCategoryName}</td>
                      <td>{item.status}</td>
                      <td className="">
                        {!["Foreman", "Project Manager"].includes(
                          item.crewCategoryName
                        ) ? (
                          <div className="flex justify-center item-end gap-4">
                            <button
                              onClick={() => {
                                moveToEditForm(item._id);
                              }}
                              title="Edit Category"
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
                          </div>
                        ) : (
                          <div className="flex justify-center item-end gap-4">
                            <button title="Disabled">
                              <i className="fa fa-edit"></i>
                            </button>
                            {item.status === "Active" ? (
                              <button
                                type="button"
                                className=""
                                data-toggle="modal"
                                title="Disabled"
                              >
                                <i className="fa fa-trash"></i>
                              </button>
                            ) : (
                              <button title="Change Status to Active">
                                <i className="fa fa-refresh "></i>
                              </button>
                            )}
                          </div>
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
                {/* <th> Id</th> */}
                <th>Category Name</th>
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
                      navigate(`/panel/admin/all-crew-categories/${i + 1}`);
                      // setCurrentPage(i + 1)
                      }
                    }
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
                Delete Crew Category
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
