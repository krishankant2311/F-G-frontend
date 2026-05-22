import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../../context/TableContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function AllCustomersOfficeTable() {
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
    getAllCustomers();
  }, [currentPage, sortBy, sortOrder]);

  // useEffect(() => {
  //   searchCustomers();
  // }, [term, currentPage]);

  const getAllCustomers = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/customer/get-all-customers-for-projects?page=${currentPage}&sortBy=${sortBy}&sortOrder=${sortOrder === "asc" ? 1 : -1}&search=${term}&limit=${perPageRecords}`,
        { headers: headers }
      );

      if (response.data.statusCode === 200) {
        setData(response.data.result.customers);
        setTotalPages(response.data.result.totalPages);
        settotalRecords(response.data.result.totalRecords);
        const lastCode = localStorage.getItem("lastViewedCode");
        if (lastCode) {
          const rowElement = document.getElementById(`project-${lastCode}`);
          console.log("row elemtn", rowElement);
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

  const moveToEditForm = (id) => {
    navigate(`/panel/admin/customer/edit/${id}`, { state: { data: pageNo } });
  };

  const moveToViewProjects = (id) => {
    localStorage.setItem("lastViewedCode", id);
    navigate(`/panel/office/all-customer-projects/${id}/1`);
  };

  useEffect(() => {
    navigate(`/panel/office/all-customers/1`);
    if(pageNo == 1){
      getAllCustomers();
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
    // setCurrentPage(currentPage - 1);
    navigate(`/panel/office/all-customers/${currentPage - 1}`);
  };

  const nextPage = () => {
    if (currentPage >= totalPages) {
      return;
    }
    // setCurrentPage(currentPage + 1);
    navigate(`/panel/office/all-customers/${currentPage + 1}`);
  };

  const handleStatus = async (e, id, status) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/customer/delete-customer/${id}`,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        toast.success("Customer deleted successfully");
        getAllCustomers();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    setDisableBtn(false);
  };

  const searchCustomers = async () => {
    try {
      if (term.length > 0) {
        navigate("/panel/office/all-customers/1");
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
        `${process.env.REACT_APP_API_BASE_URL}/customer/search-customer-for-projects?page=${currentPage}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        if (response.data.result.customers.length === 0) {
          setData([]);
          settotalRecords(0);
          setLoading(false);
          return;
        }
        setData(response.data.result.customers);
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
          {/* <h3 className="card-title">Customers</h3> */}
          <div className="flex justify-center flex-grow">
            <h3 className="text-lg font-bold">COMPILATION CUSTOMERS</h3>
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
            {/* <button
              className={`btn btn-primary text-sm relative top-1 ${
                disableBtn ? "disabled" : ""
              }`}
              onClick={() => {
                navigate("/panel/admin/customer/add");
              }}
            >
              <i className="fa fa-plus mr-2"></i>
              Add Customer
            </button> */}
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
                <th onClick={() => handleSort("customerName")}>
                  Name{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerName"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>

                <th onClick={() => handleSort("customerEmail")}>
                  Email{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerEmail"
                        ? "fa fa-sort-amount-asc"
                        : "fa fa-sort-amount-desc"
                    } ml-2`}
                  ></i>
                </th>
                <th onClick={() => handleSort("customerPhone")}>
                  Phone Number{" "}
                  <i
                    className={`${
                      sortOrder === "asc" && sortBy === "customerPhone"
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
                      <td id={`project-${item._id}`}>{item.customerName}</td>
                      <td>{item.customerEmail}</td>
                      <td>{item.customerPhone}</td>
                      <td className="flex justify-center gap-4">
                        <button
                          onClick={() => {
                            moveToViewProjects(item._id);
                          }}
                          title="View Projects"
                        >
                          <i className="fa fa-eye"></i>
                        </button>
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
                <th>Name</th>
                <th>Email</th>
                <th>Measure</th>
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
    </div>
  );
}
