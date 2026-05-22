import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  formatMarkupDisplay,
  materialHasCustomCostMarkup,
} from "../../../utils/materialPricingDisplay";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import parse from "html-react-parser";
const { convert } = require("html-to-text");

export default function MaterialTable() {
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
    getAllMaterials();
  }, [currentPage, sortBy, sortOrder]);

  // useEffect(() => {
  //   searchMaterials();
  // }, [term, currentPage]);

  const stripHtml = (html) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  const getAllMaterials = async () => {
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
        }/admin/get-materials?page=${currentPage}&sortBy=${sortBy}&sortOrder=${
          sortOrder === "asc" ? 1 : -1
        }&search=${term}&limit=${perPageRecords}`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setData(response.data.result.materials);
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
    navigate(`/panel/admin/material/edit/${id}`, { state: { data: pageNo } });
  };

  useEffect(() => {
    navigate(`/panel/admin/all-materials/1`);
    if (pageNo == 1) {
      getAllMaterials();
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
    navigate(`/panel/admin/all-materials/${currentPage - 1}`);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    // setCurrentPage(currentPage + 1);
    navigate(`/panel/admin/all-materials/${currentPage + 1}`);
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
        `${process.env.REACT_APP_API_BASE_URL}/admin/edit-material/${id}`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success("Material deleted successfully");
        if (data.length === 1 && status == "Delete") {
          if (currentPage === 1) {
            getAllMaterials();
          } else {
            const page = currentPage - 1 > 0 ? currentPage - 1 : 1;
            navigate(`/panel/admin/all-materials/${page}`);
          }
        } else {
          getAllMaterials();
        }
        // getAllMaterials();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const searchMaterials = async () => {
    try {
      if (term.length > 0) {
        navigate("/panel/admin/all-materials/1");
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
        `${process.env.REACT_APP_API_BASE_URL}/admin/search-material?page=${currentPage}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (response.data.result.materials.length === 0) {
          setData([]);
          settotalRecords(0);
          setLoading(false);
          return;
        }
        setData(response.data.result.materials);
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
          <h3 className="card-title">Materials</h3>
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
              className={`btn bg-[#00613e] text-white text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/admin/material/add");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add Material
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
                <th onClick={() => handleSort("name")}>
                  Material Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "name"
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
                <th onClick={() => handleSort("measure")}>
                  Measure{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "measure"
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
                <th onClick={() => handleSort("markUp")}>
                  Markup{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "markUp"
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
                  Is Taxable{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "isTaxable"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("description")}>
                  Notes{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "description"
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
                      <td>{item.name}</td>
                      {/* <td>{item.description}</td> */}
                      <td>{item.measure}</td>
                      <td>
                        {(() => {
                          const custom = materialHasCustomCostMarkup(item);
                          const p = Number(item.price);
                          if (custom) return item.cost;
                          if (Number.isFinite(p)) return (p / 2).toFixed(2);
                          return "N/A";
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const custom = materialHasCustomCostMarkup(item);
                          const p = Number(item.price);
                          if (custom) {
                            return formatMarkupDisplay(
                              item.markUp ?? item.markup
                            );
                          }
                          if (Number.isFinite(p)) return "100%";
                          return "N/A";
                        })()}
                      </td>
                      <td>{item.price}</td>
                      <td>{item.isTaxable ? "Yes" : "No"}</td>
                      <td>
                        {item.description
                          ? stripHtml(item.description).length > 40
                            ? stripHtml(item.description).slice(0, 40) + "..."
                            : stripHtml(item.description)
                          : "-"}
                      </td>
                      <td className="flex justify-center gap-4">
                        <button
                          onClick={() => {
                            moveToEditForm(item._id);
                          }}
                          title="Edit Material"
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="text-center" colSpan="8">
                    {loading ? "Loading ..." : "No Data Available"}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                {/* <th> Id</th> */}
                <th>Material Name</th>
                <th>Measure</th>
                <th>Cost</th>
                <th>Markup</th>
                <th>Price</th>
                <th>Is Taxable</th>
                <th>Notes</th>
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
                    className={`border px-[10px] py-1 ${
                      currentPage === i + 1 ? "bg-[#00613e] text-white" : ""
                    }`}
                    key={i}
                    onClick={() => {
                      navigate(`/panel/admin/all-materials/${i + 1}`);
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
                Delete Material
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
