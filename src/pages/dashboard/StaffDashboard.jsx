import React, { useEffect, useState } from "react";
import Layout from "../../components/layout/Layout";
import axios from "axios";
import { Link } from "react-router-dom";

export default function StaffDashboard() {
  const [counts, setCounts] = useState();
  const [meetings, setMeetings] = useState([]);
  const [plans, setPlans] = useState([]);
  const [faqs, setFAQs] = useState([]);

  useEffect(() => {
    getAllCounts();
    getMeetings();
    getAllPlans();
    getFaqs();
  }, []);

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

  const getMeetings = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/admin/all-meetings`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setMeetings(response.data.result.meetings);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getAllPlans = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/plan/getallplan`,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        setPlans(response.data.result.plans);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  const getFaqs = async () => {
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };
      const response = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/FAQ/get-all`, {
        headers: headers,
      });
      if (response.data.statusCode === 200) {
        setFAQs(response.data.result.faqs);
      }
    } catch (error) {
      console.log("Error", error);
    }
  };

  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { month: "long", day: "numeric", year: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  function formatTime(dateTimeString) {
    const dateTime = new Date(dateTimeString);
    const options = {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false, // Use 24-hour format
    };
    return dateTime.toLocaleTimeString("en-US", options);
  }

  return (
    <div classname="md:ml-[250px]">
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
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-info">
                    <div className="inner">
                      <h3>{counts?.totalStaffs}</h3>
                      <p>Total Staffs</p>
                    </div>
                    <div className="icon">
                      <i className="ion ion-person-add" />
                    </div>
                    <Link to="/panel/admin/all-staffs" className="small-box-footer">
                      More info <i className="fa fa-arrow-circle-o-right" />
                    </Link>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-success">
                    <div className="inner">
                      <h3>{counts?.activeStaffs}</h3>
                      <p>Active Staffs</p>
                    </div>
                    <div className="icon">
                      <i className="ion ion-person-add" />
                    </div>
                    <Link
                      to="/panel/admin/all-staffs"
                      className="small-box-footer"
                    >
                      More info <i className="fa fa-arrow-circle-o-right" />
                    </Link>
                  </div>
                </div>
                <div className="col-lg-3 col-6" style={{color : "white"}}>
                  <div className="small-box bg-[#FFC107]">
                    <div className="inner">
                      <h3>{counts?.deleteStaffs}</h3>
                      <p>Blocked Staffs</p>
                    </div>
                    <div className="icon">
                      <i className="ion ion-person-add" />
                    </div>
                    <Link
                      to="/panel/admin/all-staffs"
                      className="small-box-footer"
                    >
                      More info <i className="fa fa-arrow-circle-o-right" />
                    </Link>
                  </div>
                </div>
                <div className="col-lg-3 col-6">
                  <div className="small-box bg-danger">
                    <div className="inner">
                      <h3>{counts?.blockStaffs}</h3>
                      <p>Blocked Staffs</p>
                    </div>
                    <div className="icon">
                      <i className="ion ion-person-add" />
                    </div>
                    <Link
                      to="/panel/admin/all-staffs"
                      className="small-box-footer"
                    >
                      More info <i className="fa fa-arrow-circle-o-right" />
                    </Link>
                      
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-row flex-col gap-4 mt-6">
                <div className="card lg:w-[70%] w-full">
                  <div className="card-header border-transparent">
                    <h3 className="card-title">Projects</h3>
                    <div className="card-tools">
                      {/* <button
                        type="button"
                        className="btn btn-tool"
                        data-card-widget="collapse"
                      >
                        <i className="fas fa-minus" />
                      </button> */}
                      {/* <button
                        type="button"
                        className="btn btn-tool"
                        data-card-widget="remove"
                      >
                        <i className="fas fa-times" />
                      </button> */}
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table m-0 text-sm">
                        <thead>
                          <tr>
                            <th>Project Name</th>
                            <th>CustomerName</th>
                            <th>Billing Type</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meetings.slice(0, 5).map((item) => {
                            return (
                              <tr>
                                <td>
                                  {item?.userId?.firstName} {item?.userId?.lastName}{" "}
                                  <br />({item?.userId?.email})
                                </td>
                                <td>
                                  {item?.personId?.firstName}{" "}
                                  {item?.personId?.lastName}
                                  <br />({item?.personId?.email})
                                </td>
                                <td>
                                  {item?.meetType == 0 ? "Online" : "Offline"}
                                </td>
                                <td
                                  className={`${
                                    item.status == "Accept"
                                      ? "text-[green]"
                                      : "text-[red]"
                                  }`}
                                >
                                  {item.status}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer clearfix">
                    <Link
                      to="/panel/admin/all-meetings"
                      className="btn btn-sm btn-secondary float-right"
                    >
                      View All
                    </Link>
                  </div>
                </div>
                <div className="lg:w-[30%] w-full">
                  <div className="info-box mb-3 bg-[#FFC107]" style={{color : "white"}}>
                    <span className="info-box-icon">
                      <i className="fa fa-check text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Total Projects</span>
                      <span className="info-box-number">
                        0
                      </span>
                    </div>
                  </div>
                  <div className="info-box mb-3 bg-success">
                    <span className="info-box-icon">
                      <i className="fa fa-hourglass-end text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Pending Projects</span>
                      <span className="info-box-number">
                        0
                      </span>
                    </div>
                  </div>
                  <div className="info-box mb-3 bg-danger">
                    <span className="info-box-icon">
                      <i className="fa fa-ban text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Completed Projects</span>
                      <span className="info-box-number">
                        0
                      </span>
                    </div>
                  </div>
                  {/* <div className="info-box mb-3 bg-info">
                    <span className="info-box-icon">
                      <i className="fa fa-times text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Ignored Meetings</span>
                      <span className="info-box-number">
                        {counts?.ignoreMeetings}
                      </span>
                    </div>
                  </div> */}
                </div>
              </div>

              {/* <div className="card-footer">
                <div className="row">
                  <div className="col-sm-3 col-6">
                    <div className="description-block border-right">
                      <span className="description-percentage text-success text-[18px] font-bold">
                        {counts?.activeFaqs}
                      </span>
                      <h5 className="description-header">Active</h5>
                      <span className="description-text">FAQs</span>
                    </div>
                  </div>
                  <div className="col-sm-3 col-6">
                    <div className="description-block border-right">
                      <span className="description-percentage text-warning text-[18px] font-bold">
                        {counts?.deactiveFaqs}
                      </span>
                      <h5 className="description-header">Inactive</h5>
                      <span className="description-text">FAQs</span>
                    </div>
                  </div>
                  <div className="col-sm-3 col-6">
                    <div className="description-block border-right">
                      <span className="description-percentage text-success text-warning text-[18px] font-bold">
                        {counts?.acceptStories}
                      </span>
                      <h5 className="description-header">Accepted</h5>
                      <span className="description-text">Stories</span>
                    </div>
                  </div>
                  <div className="col-sm-3 col-6">
                    <div className="description-block">
                      <span className="description-percentage text-danger text-warning text-[18px] font-bold">
                        {counts?.pendingStories}
                      </span>
                      <h5 className="description-header">Pending</h5>
                      <span className="description-text">Stories</span>
                    </div>
                  </div>
                </div>
              </div> */}

              {/* <div className="flex lg:flex-row flex-col gap-4 mt-6">
                <div className="card lg:w-[70%] w-full">
                  <div className="card-header border-transparent">
                    <h3 className="card-title">Latest Plans</h3>
                    <div className="card-tools"></div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table m-0 text-sm">
                        <thead>
                          <tr>
                            <th>Plan Name</th>
                            <th>Duration</th>
                            <th>Price</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {plans.slice(0, 5).map((item) => {
                            return (
                              <tr>
                                <td>{item.name}</td>
                                <td>{item.duration} Weeks</td>
                                <td>{item.price}</td>
                                <td
                                  className={`${
                                    item.status == "Activate"
                                      ? "text-[green]"
                                      : "text-[red]"
                                  }`}
                                >
                                  {item.status}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="card-footer clearfix">
                    <Link
                      to="/panel/admin/all-plans"
                      className="btn btn-sm btn-secondary float-right"
                    >
                      View All
                    </Link>
                  </div>
                </div>
                <div className="lg:w-[30%] w-full">
                  <div className="info-box mb-3 bg-success">
                    <span className="info-box-icon">
                      <i className="fa fa-check-square text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Active Plans</span>
                      <span className="info-box-number">
                        {counts?.activePlans}
                      </span>
                    </div>
                  </div>
                  <div className="info-box mb-3 bg-danger">
                    <span className="info-box-icon">
                      <i className="fa fa-times text-white" />
                    </span>
                    <div className="info-box-content">
                      <span className="info-box-text">Inactive Plans</span>
                      <span className="info-box-number">
                        {counts?.deactivePlans}
                      </span>
                    </div>
                  </div>
                
                </div>
              </div> */}

              {/* <div className="card w-full">
                <div className="card-header border-transparent">
                  <h3 className="card-title">Latest FAQs</h3>
                  <div className="card-tools"></div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table m-0 text-sm">
                      <thead>
                        <tr>
                          <th>Question</th>
                          <th>Answer</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {faqs.slice(0, 5).map((item) => {
                          return (
                            <tr>
                              <td>{item.FAQText}</td>
                              <td>{item.FAQAnswer}</td>
                              <td
                                className={`${
                                  item.status === "Activate"
                                    ? "text-[green]"
                                    : "text-[red]"
                                }`}
                              >
                                {item.status[0].toUpperCase() +
                                  item.status.slice(1)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="card-footer clearfix">
                  <Link
                    to="/panel/admin/all-faqs"
                    className="btn btn-sm btn-secondary float-right"
                  >
                    View All
                  </Link>
                </div>
              </div> */}

              {/* <div className="row mt-10">
                <section className="col-lg-7 connectedSortable">
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <i className="fas fa-chart-pie mr-1" />
                        Sales
                      </h3>
                      <div className="card-tools">
                        <ul className="nav nav-pills ml-auto">
                          <li className="nav-item">
                            <a
                              className="nav-link active"
                              href="#revenue-chart"
                              data-toggle="tab"
                            >
                              Area
                            </a>
                          </li>
                          <li className="nav-item">
                            <a
                              className="nav-link"
                              href="#sales-chart"
                              data-toggle="tab"
                            >
                              Donut
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="tab-content p-0">
                        <div
                          className="chart tab-pane active"
                          id="revenue-chart"
                          style={{ position: "relative", height: 300 }}
                        >
                          <canvas
                            id="revenue-chart-canvas"
                            height={300}
                            style={{ height: 300 }}
                          />
                        </div>
                        <div
                          className="chart tab-pane"
                          id="sales-chart"
                          style={{ position: "relative", height: 300 }}
                        >
                          <canvas
                            id="sales-chart-canvas"
                            height={300}
                            style={{ height: 300 }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card direct-chat direct-chat-primary">
                    <div className="card-header">
                      <h3 className="card-title">Direct Chat</h3>
                      <div className="card-tools">
                        <span
                          title="3 New Messages"
                          className="badge badge-primary"
                        >
                          3
                        </span>
                        <button
                          type="button"
                          className="btn btn-tool"
                          data-card-widget="collapse"
                        >
                          <i className="fas fa-minus" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-tool"
                          title="Contacts"
                          data-widget="chat-pane-toggle"
                        >
                          <i className="fas fa-comments" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-tool"
                          data-card-widget="remove"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="direct-chat-messages">
                        <div className="direct-chat-msg">
                          <div className="direct-chat-infos clearfix">
                            <span className="direct-chat-name float-left">
                              Alexander Pierce
                            </span>
                            <span className="direct-chat-timestamp float-right">
                              23 Jan 2:00 pm
                            </span>
                          </div>
                          <img
                            className="direct-chat-img"
                            src="dist/img/user1-128x128.jpg"
                            alt="message user image"
                          />
                          <div className="direct-chat-text">
                            Is this template really for free? That's
                            unbelievable!
                          </div>
                        </div>
                        <div className="direct-chat-msg right">
                          <div className="direct-chat-infos clearfix">
                            <span className="direct-chat-name float-right">
                              Sarah Bullock
                            </span>
                            <span className="direct-chat-timestamp float-left">
                              23 Jan 2:05 pm
                            </span>
                          </div>
                          <img
                            className="direct-chat-img"
                            src="dist/img/user3-128x128.jpg"
                            alt="message user image"
                          />
                          <div className="direct-chat-text">
                            You better believe it!
                          </div>
                        </div>
                        <div className="direct-chat-msg">
                          <div className="direct-chat-infos clearfix">
                            <span className="direct-chat-name float-left">
                              Alexander Pierce
                            </span>
                            <span className="direct-chat-timestamp float-right">
                              23 Jan 5:37 pm
                            </span>
                          </div>
                          <img
                            className="direct-chat-img"
                            src="dist/img/user1-128x128.jpg"
                            alt="message user image"
                          />
                          <div className="direct-chat-text">
                            Working with AdminLTE on a great new app! Wanna
                            join?
                          </div>
                        </div>
                        <div className="direct-chat-msg right">
                          <div className="direct-chat-infos clearfix">
                            <span className="direct-chat-name float-right">
                              Sarah Bullock
                            </span>
                            <span className="direct-chat-timestamp float-left">
                              23 Jan 6:10 pm
                            </span>
                          </div>
                          <img
                            className="direct-chat-img"
                            src="dist/img/user3-128x128.jpg"
                            alt="message user image"
                          />
                          <div className="direct-chat-text">
                            I would love to.
                          </div>
                        </div>
                      </div>
                      <div className="direct-chat-contacts">
                        <ul className="contacts-list">
                          <li>
                            <a href="#">
                              <img
                                className="contacts-list-img"
                                src="dist/img/user1-128x128.jpg"
                                alt="User Avatar"
                              />
                              <div className="contacts-list-info">
                                <span className="contacts-list-name">
                                  Count Dracula
                                  <small className="contacts-list-date float-right">
                                    2/28/2015
                                  </small>
                                </span>
                                <span className="contacts-list-msg">
                                  How have you been? I was...
                                </span>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#">
                              <img
                                className="contacts-list-img"
                                src="dist/img/user7-128x128.jpg"
                                alt="User Avatar"
                              />
                              <div className="contacts-list-info">
                                <span className="contacts-list-name">
                                  Sarah Doe
                                  <small className="contacts-list-date float-right">
                                    2/23/2015
                                  </small>
                                </span>
                                <span className="contacts-list-msg">
                                  I will be waiting for...
                                </span>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#">
                              <img
                                className="contacts-list-img"
                                src="dist/img/user3-128x128.jpg"
                                alt="User Avatar"
                              />
                              <div className="contacts-list-info">
                                <span className="contacts-list-name">
                                  Nadia Jolie
                                  <small className="contacts-list-date float-right">
                                    2/20/2015
                                  </small>
                                </span>
                                <span className="contacts-list-msg">
                                  I'll call you back at...
                                </span>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#">
                              <img
                                className="contacts-list-img"
                                src="dist/img/user5-128x128.jpg"
                                alt="User Avatar"
                              />
                              <div className="contacts-list-info">
                                <span className="contacts-list-name">
                                  Nora S. Vans
                                  <small className="contacts-list-date float-right">
                                    2/10/2015
                                  </small>
                                </span>
                                <span className="contacts-list-msg">
                                  Where is your new...
                                </span>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#">
                              <img
                                className="contacts-list-img"
                                src="dist/img/user6-128x128.jpg"
                                alt="User Avatar"
                              />
                              <div className="contacts-list-info">
                                <span className="contacts-list-name">
                                  John K.
                                  <small className="contacts-list-date float-right">
                                    1/27/2015
                                  </small>
                                </span>
                                <span className="contacts-list-msg">
                                  Can I take a look at...
                                </span>
                              </div>
                            </a>
                          </li>
                          <li>
                            <a href="#">
                              <img
                                className="contacts-list-img"
                                src="dist/img/user8-128x128.jpg"
                                alt="User Avatar"
                              />
                              <div className="contacts-list-info">
                                <span className="contacts-list-name">
                                  Kenneth M.
                                  <small className="contacts-list-date float-right">
                                    1/4/2015
                                  </small>
                                </span>
                                <span className="contacts-list-msg">
                                  Never mind I found...
                                </span>
                              </div>
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="card-footer">
                      <form action="#" method="post">
                        <div className="input-group">
                          <input
                            type="text"
                            name="message"
                            placeholder="Type Message ..."
                            className="form-control"
                          />
                          <span className="input-group-append">
                            <button type="button" className="btn btn-primary">
                              Send
                            </button>
                          </span>
                        </div>
                      </form>
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <i className="ion ion-clipboard mr-1" />
                        To Do List
                      </h3>
                      <div className="card-tools">
                        <ul className="pagination pagination-sm">
                          <li className="page-item">
                            <a href="#" className="page-link">
                              «
                            </a>
                          </li>
                          <li className="page-item">
                            <a href="#" className="page-link">
                              1
                            </a>
                          </li>
                          <li className="page-item">
                            <a href="#" className="page-link">
                              2
                            </a>
                          </li>
                          <li className="page-item">
                            <a href="#" className="page-link">
                              3
                            </a>
                          </li>
                          <li className="page-item">
                            <a href="#" className="page-link">
                              »
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="card-body">
                      <ul className="todo-list" data-widget="todo-list">
                        <li>
                          <span className="handle">
                            <i className="fas fa-ellipsis-v" />
                            <i className="fas fa-ellipsis-v" />
                          </span>
                          <div className="icheck-primary d-inline ml-2">
                            <input
                              type="checkbox"
                              defaultValue
                              name="todo1"
                              id="todoCheck1"
                            />
                            <label htmlFor="todoCheck1" />
                          </div>
                          <span className="text">Design a nice theme</span>
                          <small className="badge badge-danger">
                            <i className="far fa-clock" /> 2 mins
                          </small>
                          <div className="tools">
                            <i className="fas fa-edit" />
                            <i className="fas fa-trash-o" />
                          </div>
                        </li>
                        <li>
                          <span className="handle">
                            <i className="fas fa-ellipsis-v" />
                            <i className="fas fa-ellipsis-v" />
                          </span>
                          <div className="icheck-primary d-inline ml-2">
                            <input
                              type="checkbox"
                              defaultValue
                              name="todo2"
                              id="todoCheck2"
                              defaultChecked
                            />
                            <label htmlFor="todoCheck2" />
                          </div>
                          <span className="text">
                            Make the theme responsive
                          </span>
                          <small className="badge badge-info">
                            <i className="far fa-clock" /> 4 hours
                          </small>
                          <div className="tools">
                            <i className="fas fa-edit" />
                            <i className="fas fa-trash-o" />
                          </div>
                        </li>
                        <li>
                          <span className="handle">
                            <i className="fas fa-ellipsis-v" />
                            <i className="fas fa-ellipsis-v" />
                          </span>
                          <div className="icheck-primary d-inline ml-2">
                            <input
                              type="checkbox"
                              defaultValue
                              name="todo3"
                              id="todoCheck3"
                            />
                            <label htmlFor="todoCheck3" />
                          </div>
                          <span className="text">
                            Let theme shine like a star
                          </span>
                          <small className="badge badge-warning">
                            <i className="far fa-clock" /> 1 day
                          </small>
                          <div className="tools">
                            <i className="fas fa-edit" />
                            <i className="fas fa-trash-o" />
                          </div>
                        </li>
                        <li>
                          <span className="handle">
                            <i className="fas fa-ellipsis-v" />
                            <i className="fas fa-ellipsis-v" />
                          </span>
                          <div className="icheck-primary d-inline ml-2">
                            <input
                              type="checkbox"
                              defaultValue
                              name="todo4"
                              id="todoCheck4"
                            />
                            <label htmlFor="todoCheck4" />
                          </div>
                          <span className="text">
                            Let theme shine like a star
                          </span>
                          <small className="badge badge-success">
                            <i className="far fa-clock" /> 3 days
                          </small>
                          <div className="tools">
                            <i className="fas fa-edit" />
                            <i className="fas fa-trash-o" />
                          </div>
                        </li>
                        <li>
                          <span className="handle">
                            <i className="fas fa-ellipsis-v" />
                            <i className="fas fa-ellipsis-v" />
                          </span>
                          <div className="icheck-primary d-inline ml-2">
                            <input
                              type="checkbox"
                              defaultValue
                              name="todo5"
                              id="todoCheck5"
                            />
                            <label htmlFor="todoCheck5" />
                          </div>
                          <span className="text">
                            Check your messages and notifications
                          </span>
                          <small className="badge badge-primary">
                            <i className="far fa-clock" /> 1 week
                          </small>
                          <div className="tools">
                            <i className="fas fa-edit" />
                            <i className="fas fa-trash-o" />
                          </div>
                        </li>
                        <li>
                          <span className="handle">
                            <i className="fas fa-ellipsis-v" />
                            <i className="fas fa-ellipsis-v" />
                          </span>
                          <div className="icheck-primary d-inline ml-2">
                            <input
                              type="checkbox"
                              defaultValue
                              name="todo6"
                              id="todoCheck6"
                            />
                            <label htmlFor="todoCheck6" />
                          </div>
                          <span className="text">
                            Let theme shine like a star
                          </span>
                          <small className="badge badge-secondary">
                            <i className="far fa-clock" /> 1 month
                          </small>
                          <div className="tools">
                            <i className="fas fa-edit" />
                            <i className="fas fa-trash-o" />
                          </div>
                        </li>
                      </ul>
                    </div>
                    <div className="card-footer clearfix">
                      <button
                        type="button"
                        className="btn btn-primary float-right"
                      >
                        <i className="fas fa-plus" /> Add item
                      </button>
                    </div>
                  </div>
                </section>
                <section className="col-lg-5 connectedSortable">
                  <div className="card bg-gradient-primary">
                    <div className="card-header border-0">
                      <h3 className="card-title">
                        <i className="fas fa-map-marker-alt mr-1" />
                        Visitors
                      </h3>
                      <div className="card-tools">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm daterange"
                          title="Date range"
                        >
                          <i className="far fa-calendar-alt" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          data-card-widget="collapse"
                          title="Collapse"
                        >
                          <i className="fas fa-minus" />
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      <div
                        id="world-map"
                        style={{ height: 250, width: "100%" }}
                      />
                    </div>
                    <div className="card-footer bg-transparent">
                      <div className="row">
                        <div className="col-4 text-center">
                          <div id="sparkline-1" />
                          <div className="text-white">Visitors</div>
                        </div>
                        <div className="col-4 text-center">
                          <div id="sparkline-2" />
                          <div className="text-white">Online</div>
                        </div>
                        <div className="col-4 text-center">
                          <div id="sparkline-3" />
                          <div className="text-white">Sales</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card bg-gradient-info">
                    <div className="card-header border-0">
                      <h3 className="card-title">
                        <i className="fas fa-th mr-1" />
                        Sales Graph
                      </h3>
                      <div className="card-tools">
                        <button
                          type="button"
                          className="btn bg-info btn-sm"
                          data-card-widget="collapse"
                        >
                          <i className="fas fa-minus" />
                        </button>
                        <button
                          type="button"
                          className="btn bg-info btn-sm"
                          data-card-widget="remove"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      <canvas
                        className="chart"
                        id="line-chart"
                        style={{
                          minHeight: 250,
                          height: 250,
                          maxHeight: 250,
                          maxWidth: "100%",
                        }}
                      />
                    </div>
                    <div className="card-footer bg-transparent">
                      <div className="row">
                        <div className="col-4 text-center">
                          <input
                            type="text"
                            className="knob"
                            data-readonly="true"
                            defaultValue={20}
                            data-width={60}
                            data-height={60}
                            data-fgcolor="#39CCCC"
                          />
                          <div className="text-white">Mail-Orders</div>
                        </div>
                        <div className="col-4 text-center">
                          <input
                            type="text"
                            className="knob"
                            data-readonly="true"
                            defaultValue={50}
                            data-width={60}
                            data-height={60}
                            data-fgcolor="#39CCCC"
                          />
                          <div className="text-white">Online</div>
                        </div>
                        <div className="col-4 text-center">
                          <input
                            type="text"
                            className="knob"
                            data-readonly="true"
                            defaultValue={30}
                            data-width={60}
                            data-height={60}
                            data-fgcolor="#39CCCC"
                          />
                          <div className="text-white">In-Store</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="card bg-gradient-success">
                    <div className="card-header border-0">
                      <h3 className="card-title">
                        <i className="far fa-calendar-alt" />
                        Calendar
                      </h3>
                      <div className="card-tools">
                        <div className="btn-group">
                          <button
                            type="button"
                            className="btn btn-success btn-sm dropdown-toggle"
                            data-toggle="dropdown"
                            data-offset={-52}
                          >
                            <i className="fas fa-bars" />
                          </button>
                          <div className="dropdown-menu" role="menu">
                            <a href="#" className="dropdown-item">
                              Add new event
                            </a>
                            <a href="#" className="dropdown-item">
                              Clear events
                            </a>
                            <div className="dropdown-divider" />
                            <a href="#" className="dropdown-item">
                              View calendar
                            </a>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          data-card-widget="collapse"
                        >
                          <i className="fas fa-minus" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          data-card-widget="remove"
                        >
                          <i className="fas fa-times" />
                        </button>
                      </div>
                    </div>
                    <div className="card-body pt-0">
                      <div id="calendar" style={{ width: "100%" }} />
                    </div>
                  </div>
                </section>
              </div> */}
            </div>
          </section>
        </div>
      </Layout>
    </div>
  );
}
