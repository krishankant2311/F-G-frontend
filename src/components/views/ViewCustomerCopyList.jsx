import React, { useEffect, useState } from "react";
import Layout from "../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTableContext } from "../../context/TableContext";
import html2pdf from "html2pdf.js";
import fng_logo from "../../assets/images/fng_logo.png";

export default function ViewCustomerCopyList() {
  const [customerCopy, setCustomerCopy] = useState([]);
  const [loading, setLoading] = useState(false);
  const { tableSize } = useTableContext();
  const { id } = useParams();
  const navigate = useNavigate(null);
  const location = useLocation();
  const [status, setStatus] = useState(location.state?.data ?? "");

  const [copyName, setCopyName] = useState("");
  const [copyDate, setCopyDate] = useState("");
  const [copyIndex, setCopyIndex] = useState("");

  useEffect(() => {
    getProjectCustomerListById();
    if (!location.state?.data) {
      loadProjectStatus();
    }
    window.scrollTo(0, 0);
  }, [id]);

  const loadProjectStatus = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      if (!token || !id) return;
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-project/${id}`,
        {
          headers: {
            token,
            "Content-Type": "application/json",
          },
        }
      );
      if (response.data.statusCode === 200) {
        setStatus(response.data.result?.status || "");
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (val.length > 50) {
      toast.error("Copy Name should not exceed 50 characters.");
      return;
    }
    setCopyName(val);
  };

  const getProjectCustomerListById = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/project/get-customer-list/${id}`,
        { headers: headers }
      );
      // console.log("Server Response", response);
      if (response.data.statusCode === 200) {
        setCustomerCopy(response.data.result);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
    setLoading(false);
  };

  const updateCustomerCopyName = async () => {
    try {
      const token = localStorage.getItem("f&gstafftoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const formdata = new FormData();
      formdata.append("newName", copyName);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/project/edit-customer-copy-name/${id}/${copyDate}/${copyIndex}`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        toast.success(response.data.message);
        getProjectCustomerListById();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.response.message);
    }
  };

  function formatDate(dateStr) {
    // Split the date string into day, month, and year
    const [day, month, year] = dateStr.split("-");

    // Create an array of month abbreviations
    const monthNames = [
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

    // Get the month abbreviation
    const monthAbbreviation = monthNames[parseInt(month, 10) - 1];

    // Return the formatted date
    return `${day}-${monthAbbreviation}-${year}`;
  }

  return (
    <Layout>
      <ToastContainer />
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <div className="lg:p-8 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title text-base relative top-0.5">
              <button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}View Customer Copy Sales Order
              </h3>
              <div className="text-end">
                {status === "Ongoing" && (
                  <button
                    className="bg-white text-white py-1 text-sm px-4"
                    onClick={() => {
                      navigate(
                        `/panel/office/project/field-copy/customer/edit/${id}`
                      );
                    }}
                  >
                    Generate Customer Copy
                  </button>
                )}
              </div>
            </div>
            <div className="px-10 pt-2 pb-10">
              {/* show datewise copy */}
              <div className="">
                {!loading ? (
                  customerCopy.length > 0 ? (
                    customerCopy.map((item, ind) => {
                      return (
                        <div>
                          <div className="mt-6">
                            <span className="block font-bold">
                              {formatDate(item.entryDate)}
                            </span>
                          </div>
                          {item.copyNames.map((name, index) => {
                            const isLatest =
                              item.customerCopies.length === index + 1 &&
                              customerCopy.length === ind + 1;
                            return (
                              <div className="flex items-center ml-4" key={`${item.entryDate}-${index}`}>
                                <div className="top-1.5 relative font-bold">
                                  {index + 1}.{" "}
                                </div>
                                <div
                                  key={index}
                                  className="field-copy-group mt-3 flex gap-10 ml-3"
                                >
                                  <h4 className=" font-medium w-[250px]">
                                    {name.name}
                                  </h4>
                                  <div className="flex gap-4 items-center">
                                    {status === "Ongoing" && (
                                      <button
                                        type="button"
                                        title={
                                          isLatest ? "Edit latest copy" : "Edit Copy Name"
                                        }
                                        onClick={() => {
                                          if (isLatest) {
                                            navigate(
                                              `/panel/office/project/field-copy/customer/edit/${id}/${item.entryDate}/${index}`
                                            );
                                            return;
                                          }
                                          setCopyIndex(index);
                                          setCopyName(name.name);
                                          setCopyDate(item.entryDate);
                                        }}
                                        {...(!isLatest
                                          ? {
                                              "data-dismiss": "modal",
                                              "data-toggle": "modal",
                                              "data-target": "#exampleModalCenter",
                                            }
                                          : {})}
                                      >
                                        <i className="fa fa-edit"></i>
                                      </button>
                                    )}
                                    <button
                                      title="Click to view"
                                      onClick={() => {
                                        navigate(
                                          `/panel/office/project/field-copy/customer/${id}/${item.entryDate}/${index}`,{state : {data : name}}
                                        );
                                      }}
                                    >
                                      <i className="fa fa-eye"></i>
                                    </button>
                                    {isLatest && (
                                      <span className="ml-2 text-sm relative -top-0.5 tracking-wide">
                                        (Latest)
                                      </span>
                                    )}
                                  </div>
                                  <hr />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center mt-10">
                      No Customer Copy Generated Yet !
                    </p>
                  )
                ) : (
                  <p className="text-center mt-10">Loading ...</p>
                )}
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
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="exampleModalLongTitle">
                  Edit Name
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
                  <label htmlFor="copyName">Copy Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="copyName"
                    placeholder="Enter Copy Name"
                    value={copyName}
                    onChange={handleNameChange}
                    name="copyName"
                    required
                  />
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
                  className="btn bg-[#00613e] text-white"
                  data-dismiss="modal"
                  onClick={updateCustomerCopyName}
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
