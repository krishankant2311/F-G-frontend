import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/sidebar.css";
import fng_logo from "../../assets/images/fng_logo.png";

export default function Sidebar() {
  const navigate = useNavigate();
  const adminMenu = sessionStorage.getItem("adminMenu");
  const [activeMenu, setActiveMenu] = useState(adminMenu);

  useEffect(()=>{
    const adminMenu = sessionStorage.getItem("adminMenu");
    setActiveMenu(adminMenu);
  },[])

  const toggleMenu = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
    sessionStorage.setItem("adminMenu", menuName);
  };

  const logoutAdmin = () => {
    localStorage.removeItem("f&gadmintoken");
    navigate("/panel/admin/login");
  };

  return (
    <div className="">
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a className="brand-link flex justify-center items-end bg-white">
          {/* <img src="dist/img/AdminLTELogo.png" alt="AdminLTE Logo" className="brand-image img-circle elevation-3" style={{opacity: '.8'}} /> */}
          {/* <img src={logo} alt="Logo" className="h-[30px] w-[30px] mr-2" /> */}
          <img src={fng_logo} alt="" className="h-[60px] w-[100px]" />
          {/* <span className="brand-text font-bold text-3xl ml-3 text-green">F&G</span> */}
        </a>
        <div className="sidebar">
          <nav className="mt-4">
            <ul
              className="nav nav-pills nav-sidebar flex-column"
              data-widget="treeview"
              role="menu"
              data-accordion="false"
            >
              <Link to="/panel/admin/dashboard">
                <li class="nav-header cursor-pointer block w-full text-[#bdbdbd] rounded ml-2">
                  <span className="text-base">
                    <i class="nav-icon fa fa-tachometer mr-2"></i>
                    Dashboard
                  </span>
                </li>
              </Link>

              <li
                className={`nav-item ${
                  activeMenu === "staffs" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("staffs")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-user  text-sm"></i>Staff Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "staffs" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/all-staffs/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Staffs</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/all-active-staffs/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Active Staffs</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/all-blocked-staffs/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Blocked Staffs</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/panel/admin/staff/add" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add New Staff</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "customers" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("customers")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-address-book  text-sm"></i>Customer
                    Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "customers" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/all-customers/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Customers</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/customer/add"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Customer</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "materials" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("materials")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-gg-circle  text-sm"></i>Material
                    Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "materials" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/all-materials/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Materials</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/material/add"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add New Material</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "jobTypes" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("jobTypes")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-address-book  text-sm"></i>Job Type
                    Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "jobTypes" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/all-job-types/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Job Types</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/job-type/add"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Job Type</p>
                    </Link>
                  </li>
                </ul>
              </li>

              {/* <li className={`nav-item ${activeMenu === 'crewCategories' ? 'menu-open' : ''}`}>
                <li className="nav-header cursor-pointer" onClick={() => toggleMenu('crewCategories')}>
                  <span className="text-base"><i class="nav-icon fa fa-asterisk  text-sm"></i>Labor Management</span>
                </li>
                <ul className={`nav nav-treeview ${activeMenu === 'crewCategories' ? 'slide-in' : 'slide-out'}`}>
                  <li className="nav-item">
                    <Link to="/panel/admin/all-labors/1" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Labor Types</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/panel/admin/labor/add" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Labor Type</p>
                    </Link>
                  </li>
                </ul>
              </li> */}

              {/* <li className={`nav-item ${activeMenu === 'crewCategories' ? 'menu-open' : ''}`}>
                <li className="nav-header cursor-pointer" onClick={() => toggleMenu('crewCategories')}>
                  <span className="text-base"><i class="nav-icon fa fa-asterisk  text-sm"></i>Crew Category Management</span>
                </li>
                <ul className={`nav nav-treeview ${activeMenu === 'crewCategories' ? 'slide-in' : 'slide-out'}`}>
                  <li className="nav-item">
                    <Link to="/panel/admin/all-crew-categories/1" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Crew Categories</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/panel/admin/crew-category/add" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Crew Category</p>
                    </Link>
                  </li>
                </ul>
              </li> */}

              <li
                className={`nav-item ${
                  activeMenu === "crews" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("crews")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-users  text-sm"></i>Crew Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "crews" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/all-crews/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Crews</p>
                    </Link>
                  </li>
                  {/* <li className="nav-item">
                    <Link to="/panel/admin/crews-without-category/1" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Crews Without Category</p>
                    </Link>
                  </li> */}
                  <li className="nav-item">
                    <Link to="/panel/admin/crew/add" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Crew</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "tax" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("tax")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-money  text-sm"></i>Tax Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "tax" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link to="/panel/admin/tax/edit" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Edit Tax</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "address" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("address")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-map-marker text-sm"></i>Address
                    Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "address" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/address/edit"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Edit Address</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "setting" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("setting")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-cog  text-sm"></i>Settings
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "setting" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/admin/change-password"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Change Password</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <div
                      className="nav-link cursor-pointer ml-2"
                      data-toggle="modal"
                      data-target="#exampleModalCenter_lsa"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Logout</p>
                    </div>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
      <div
        className="modal fade"
        id="exampleModalCenter_lsa"
        tabIndex={-1}
        role="dialog"
        aria-labelledby="exampleModalCenterTitle"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLongTitle">
                Logout
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
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={logoutAdmin}
                data-dismiss="modal"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
