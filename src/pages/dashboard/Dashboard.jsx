import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import axios from "axios";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Dashboard() {
  const [counts, setCounts] = useState();
  const [projects, setProjects] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllCounts();
    getProjects();
  }, []);

  useEffect(() => {
    if (startDate === "" && endDate === "") getProjects();
  }, [startDate, endDate]);

  const getAllCounts = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-all-counts`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setCounts(response.data.result);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getProjects = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const formdata = new FormData();
      formdata.append("startDate", startDate);
      formdata.append("endDate", endDate);

      setLoading(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-recent-projects`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        setProjects(response.data.result.projects);
      }
    } catch (error) {
      console.log("Error", error);
    }
    setLoading(false);
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    if (endDate && newStartDate > endDate) {
      toast.error("Start date cannot be greater than end date.");
      return
    } else {
      setDateError("");
      setStartDate(newStartDate);
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    if (startDate && newEndDate < startDate) {
      toast.error("End date cannot be less than start date.");
      return
    } else {
      setDateError("");
      setEndDate(newEndDate);
    }
  };

  const filterProjectsByDate = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };

      if (!startDate && !endDate) {
        // toast.error("Enter both start and end date")
        return;
      }

      const formdata = new FormData();
      formdata.append("startDate", startDate);
      formdata.append("endDate", endDate);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/get-recent-projects`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 200) {
        setFilteredProjects(response.data.result.projects);
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const showFilteredProjects = async (e) => {
    e.preventDefault();
    // console.log("Dates", startDate, endDate)
    if (startDate === "" || endDate === "" || !startDate || !endDate) {
      toast.error("Please enter both start and end date");
      return;
    }
    // Check if startDate or endDate are in the future
  if (startDate > today || endDate > today) {
    toast.error("Start date and end date cannot be greater than today");
    return;
  }
    getProjects();
  };

  const resetFilteredProjects = async () => {
    setEndDate("");
    setStartDate("");
    await getProjects();
  };

  // Get the current date in yyyy-mm-dd format
  const today = new Date().toISOString().split("T")[0];

  return (
    <div classname="md:ml-[250px]">
      <ToastContainer />
      <Layout>
        <div className="content-wrapper">
          <div className="content-header">
            <div className="container-fluid">
              <div className="row mb-2">
                <div className="col-sm-6">
                  <h1 className="m-0">Dashboard</h1>
                </div>
                <div className="col-sm-6">
                  <ol className="breadcrumb float-sm-right">
                    <li className="breadcrumb-item">
                      <a href="#">Home</a>
                    </li>
                    <li className="breadcrumb-item active">Dashboard</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
          <section className="content">
            <div className="container-fluid">
              <div className="row">
                <div className="col-lg-4 col-12">
                  <div className="small-box bg-info">
                    <div className="inner">
                      <h3>{counts?.totalStaffs}</h3>
                      <p>Total Staffs</p>
                    </div>
                    <div className="icon">
                      <i className="ion ion-person-add" />
                    </div>
                    <Link
                      to="/panel/admin/all-staffs/1"
                      className="small-box-footer"
                    >
                      More info <i className="fa fa-arrow-circle-o-right" />
                    </Link>
                  </div>
                </div>
                <div className="col-lg-4 col-12">
                  <div className="small-box bg-success">
                    <div className="inner">
                      <h3>{counts?.activeStaffs}</h3>
                      <p>Active Staffs</p>
                    </div>
                    <div className="icon">
                      <i className="ion ion-person-add" />
                    </div>
                    <Link
                      to="/panel/admin/all-active-staffs/1"
                      className="small-box-footer"
                    >
                      More info <i className="fa fa-arrow-circle-o-right" />
                    </Link>
                  </div>
                </div>
                <div className="col-lg-4 col-12" style={{ color: "white" }}>
                  <div className="small-box bg-[#FFC107]">
                    <div className="inner">
                      <h3>{counts?.blockStaffs}</h3>
                      <p>Blocked Staffs</p>
                    </div>
                    <div className="icon">
                      <i className="ion ion-person-add" />
                    </div>
                    <Link
                      to="/panel/admin/all-blocked-staffs/1"
                      className="small-box-footer"
                    >
                      More info <i className="fa fa-arrow-circle-o-right" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-row flex-col gap-4 mt-6">
                <div className="card lg:w-[70%] w-full">
                  <div className="card-header mt-4 text-center">
                    <h3 className="font-bold text-[18px]">Recent Projects</h3>
                    <div className="card-tools"></div>
                  </div>
                  <div className="container-fluid">
                    {/* Date Filter Inputs */}
                    <div className="row my-3 flex justify-center items-end gap-2">
                      {/* <div className="">
                        <i className="fa fa-filter"></i>
                      </div> */}
                      <form action="" className="row my-3 flex justify-center items-end gap-2 w-full">

                      <div className="col-md-3">
                        <p htmlFor="startDate" className=" font-normal">
                          From
                        </p>
                        <input
                          type="date"
                          className="form-control"
                          value={startDate}
                          onChange={handleStartDateChange}
                          placeholder="Start Date"
                          // max={today} // Restrict to today or earlier
                          required
                        />
                      </div>
                      <div className="col-md-3">
                        <p htmlFor="endDate" className="font-normal">
                          To
                        </p>
                        <input
                          type="date"
                          className="form-control"
                          value={endDate}
                          onChange={handleEndDateChange}
                          placeholder="End Date"
                          // max={today} // Restrict to today or earlier
                          required
                        />
                      </div>
                      <div className="">
                        <button
                          className="bg-primary w-[100px] h-[34px] mx-2 rounded-sm"
                          onClick={showFilteredProjects}
                          type="submit"
                        >
                          Submit
                        </button>
                        <button
                          className="bg-[#ee5d29] w-[100px] h-[34px] mx-2 rounded-sm text-white"
                          onClick={resetFilteredProjects}
                          type="button"
                        >
                          Reset
                        </button>
                      </div>
                      {/* {dateError && (
                        <div className="col-12 mt-2">
                          <div className="alert alert-danger">{dateError}</div>
                        </div>
                      )} */}
                      </form>

                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table m-0 text-sm">
                        <thead>
                          <tr>
                            <th>Project Code</th>
                            <th>CustomerName</th>
                            <th>Billing Type</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!loading ? projects && projects.length > 0 ? (
                            projects.slice(0, 5).map((item) => {
                              return (
                                <tr key={item._id}>
                                  <td>{item?.projectCode}</td>
                                  <td>{item?.customerName}</td>
                                  <td>{item?.billingType}</td>
                                  <td>
                                    {item.status === "Active"
                                      ? "Not Started"
                                      : item.status}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td className="text-center" colSpan="5">
                                {"Project Not Found"}
                              </td>
                            </tr>
                          ) : <tr>
                          <td className="text-center" colSpan="5">
                            Loading ...
                          </td>
                        </tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer clearfix">
                    {/* <Link
                      to="/panel/admin/all-meetings"
                      className="btn btn-sm btn-secondary float-right"
                    >
                      View All
                    </Link> */}
                  </div>
                </div>
                <div className="lg:w-[30%] w-full">
                  <div
                    className="info-box mb-3 bg-[#FFC107]"
                    style={{ color: "white" }}
                  >
                    <span className="info-box-icon">
                      <i className="fa fa-hourglass-end text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Ongoing Projects</span>
                      <span className="info-box-number">
                        {counts?.ongoingProjects}
                      </span>
                    </div>
                  </div>
                  <div className="info-box mb-3 bg-success">
                    <span className="info-box-icon">
                      <i className="fa fa-check text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Completed Projects</span>
                      <span className="info-box-number">
                        {counts?.completedProjects}
                      </span>
                    </div>
                  </div>
                  <div className="info-box mb-3 bg-primary">
                    <span className="info-box-icon">
                      <i className="fa fa-hourglass-end text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Bid Projects</span>
                      <span className="info-box-number">
                        {counts?.bidProjects}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Layout>
    </div>
  );
}
