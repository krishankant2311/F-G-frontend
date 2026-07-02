// import React, { useEffect, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import "../../styles/sidebar.css";
// import fng_logo from "../../assets/images/fng_logo.png";

// export default function StaffSidebar() {
//   const navigate = useNavigate();
//   const staffMenu = sessionStorage.getItem("staffMenu");
//   const [activeMenu, setActiveMenu] = useState(staffMenu);

//   useEffect(()=>{
//     // localStorage.removeItem("lastViewedCode");
//     const staffMenu = sessionStorage.getItem("staffMenu");
//     setActiveMenu(staffMenu);
//   },[])

//   const toggleMenu = (menuName) => {
//     console.log(localStorage.removeItem("lastViewedCode"));
//     setActiveMenu(activeMenu === menuName ? null : menuName);
//     sessionStorage.setItem("staffMenu", menuName);
//   };

//   const logoutStaff = () => {
//     localStorage.removeItem("lastViewedCode");
//     localStorage.removeItem("f&gstafftoken");
//     navigate("/panel/office/login");
//   };

//   const clearLastViewedCode = () => {
//     try {
//       localStorage.removeItem("lastViewedCode");
//     } catch (error) {
//       console.error("Error : ", error);
//     }
//   }

//   return (
//     <div className="">
//       <aside className="main-sidebar sidebar-dark-primary elevation-4">
//         <a className="brand-link flex justify-center items-end bg-white">
//           {/* <img src="dist/img/AdminLTELogo.png" alt="AdminLTE Logo" className="brand-image img-circle elevation-3" style={{opacity: '.8'}} /> */}
//           {/* <img src={logo} alt="Logo" className="h-[30px] w-[30px] mr-2" /> */}
//           <img src={fng_logo} alt="" className="h-[60px] w-[100px]" />
//           {/* <span className="brand-text font-bold text-3xl ml-3 text-green">F&G</span> */}
//         </a>
//         <div className="sidebar">
//           <nav className="mt-4">
//             <ul
//               className="nav nav-pills nav-sidebar flex-column"
//               data-widget="treeview"
//               role="menu"
//               data-accordion="false"
//             >
//               {/* <Link to="/panel/admin/dashboard">
//                 <li class="nav-header cursor-pointer block w-full hover:bg-[#444b52] text-white rounded">
//                   <span className="text-base">
//                     <i class="nav-icon fa fa-tachometer mr-2"></i>
//                     Dashboard
//                   </span>
//                 </li>
//               </Link> */}

//               <li
//                 className={`nav-item ${
//                   activeMenu === "projects" ? "menu-open" : ""
//                 }`}
//               >
//                 <li
//                   className="nav-header cursor-pointer"
//                   onClick={() => toggleMenu("projects")}
//                 >
//                   <span className="text-base">
//                     <i class="nav-icon fa fa-id-card  text-sm"></i>Project
//                     Management
//                   </span>
//                 </li>
//                 <ul
//                   className={`nav nav-treeview ${
//                     activeMenu === "projects" ? "slide-in" : "slide-out"
//                   }`}
//                 >
//                   <li className="nav-item"  onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/all-projects/1"
//                       className="nav-link ml-2"
                     
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Ongoing Projects</p>
//                     </Link>
//                   </li>
//                   {/* <li className="nav-item">
//                     <Link to="/panel/office/completed-projects/1" className="nav-link ml-2">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Completed Projects</p>
//                     </Link>
//                   </li> */}
//                   <li className="nav-item"  onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/billed-projects/1"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Billed Projects</p>
//                     </Link>
//                   </li>
//                   <li className="nav-item"  onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/project/add/0"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Add Project</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li>

//               {/* <li
//                 className={`nav-item ${
//                   activeMenu === "bids" ? "menu-open" : ""
//                 }`}
//               >
//                 <li
//                   className="nav-header cursor-pointer"
//                   onClick={() => toggleMenu("bids")}
//                 >
//                   <span className="text-base">
//                     <i class="nav-icon fa fa-id-card text-sm"></i>Bids
//                     Management
//                   </span>
//                 </li>
//                 <ul
//                   className={`nav nav-treeview ${
//                     activeMenu === "bids" ? "slide-in" : "slide-out"
//                   }`}
//                 >
//                   <li className="nav-item">
//                     <Link
//                       to="/panel/office/bid-projects/1"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Bid Projects</p>
//                     </Link>
//                   </li>
//                   <li className="nav-item">
//                     <Link
//                       to="/panel/office/project/add/1"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Create Bid</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li> */}

         

//               <li
//                 className={`nav-item ${
//                   activeMenu === "bid" ? "menu-open" : ""
//                 }`}
//               >
//                 <li
//                   className="nav-header cursor-pointer"
//                   onClick={() => toggleMenu("bid")}
//                 >
//                   <span className="text-base">
//                     <i class="nav-icon fa fa-id-card text-sm"></i>Bids Management
//                   </span>
//                 </li>
//                 <ul
//                   className={`nav nav-treeview ${
//                     activeMenu === "bid" ? "slide-in" : "slide-out"
//                   }`}
//                 >
//                   <li className="nav-item" onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/all-proposals/1"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Bid Projects</p>
//                     </Link>
//                   </li>
                  
//                   <li className="nav-item" onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/add-proposal"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Create Proposal</p>
//                     </Link>
//                   </li>

//                   <li className="nav-item" onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/all-closed-proposals/1"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Closed Bids</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li>

//               <li
//                 className={`nav-item ${
//                   activeMenu === "compiled" ? "menu-open" : ""
//                 }`}
//               >
//                 <li
//                   className="nav-header cursor-pointer"
//                   onClick={() => toggleMenu("compiled")}
//                 >
//                   <span className="text-base">
//                     <i class="nav-icon fa fa-id-card text-sm"></i>Compilation
//                   </span>
//                 </li>
//                 <ul
//                   className={`nav nav-treeview ${
//                     activeMenu === "compiled" ? "slide-in" : "slide-out"
//                   }`}
//                 >
//                   <li className="nav-item" onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/all-customers/1"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Compilation</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li>

//               <li
//                 className={`nav-item ${
//                   activeMenu === "trash" ? "menu-open" : ""
//                 }`}
                
//               >
//                 <li
//                   className="nav-header cursor-pointer"
//                   onClick={() => toggleMenu("trash")}
//                 >
//                   <span className="text-base">
//                     <i class="nav-icon fa fa-trash text-sm"></i>Trash Management
//                   </span>
//                 </li>
//                 <ul
//                   className={`nav nav-treeview ${
//                     activeMenu === "trash" ? "slide-in" : "slide-out"
//                   }`}
//                 >
//                   <li className="nav-item" onClick={clearLastViewedCode}>
//                     <Link
//                       to="/panel/office/deleted-projects/1"
//                       className="nav-link ml-2"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Trash Projects</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li>

//               {/* <li className={`nav-item ${activeMenu === 'jobTypes' ? 'menu-open' : ''}`}>
//                 <li className="nav-header cursor-pointer" onClick={() => toggleMenu('jobTypes')}>
//                   <span className="text-base"><i class="nav-icon fa fa-address-book  text-sm"></i>Job Type Management</span>
//                 </li>
//                 <ul className={`nav nav-treeview ${activeMenu === 'jobTypes' ? 'slide-in' : 'slide-out'}`}>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/all-job-types" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>All Job Types</p>
//                     </Link>
//                   </li>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/job-type/add" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Add Staff</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li>

//               <li className={`nav-item ${activeMenu === 'materials' ? 'menu-open' : ''}`}>
//                 <li className="nav-header cursor-pointer" onClick={() => toggleMenu('materials')}>
//                   <span className="text-base"><i class="nav-icon fa fa-gg-circle  text-sm"></i>Material Management</span>
//                 </li>
//                 <ul className={`nav nav-treeview ${activeMenu === 'materials' ? 'slide-in' : 'slide-out'}`}>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/all-materials" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>All Materials</p>
//                     </Link>
//                   </li>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/material/add" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Add Material</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li>

//               <li className={`nav-item ${activeMenu === 'crewCategories' ? 'menu-open' : ''}`}>
//                 <li className="nav-header cursor-pointer" onClick={() => toggleMenu('crewCategories')}>
//                   <span className="text-base"><i class="nav-icon fa fa-asterisk  text-sm"></i>Crew Category Management</span>
//                 </li>
//                 <ul className={`nav nav-treeview ${activeMenu === 'crewCategories' ? 'slide-in' : 'slide-out'}`}>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/all-crew-categories" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>All Crew Categories</p>
//                     </Link>
//                   </li>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/crew-category/add" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Add Crew Category</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li>

//               <li className={`nav-item ${activeMenu === 'crews' ? 'menu-open' : ''}`}>
//                 <li className="nav-header cursor-pointer" onClick={() => toggleMenu('crews')}>
//                   <span className="text-base"><i class="nav-icon fa fa-users  text-sm"></i>Crew Management</span>
//                 </li>
//                 <ul className={`nav nav-treeview ${activeMenu === 'crews' ? 'slide-in' : 'slide-out'}`}>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/all-crews" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>All Crews</p>
//                     </Link>
//                   </li>
//                   <li className="nav-item">
//                     <Link to="/panel/admin/crew/add" className="nav-link">
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Add Crew</p>
//                     </Link>
//                   </li>
//                 </ul>
//               </li> */}

//               <li
//                 className={`nav-item ${
//                   activeMenu === "setting" ? "menu-open" : ""
//                 }`}
//               >
//                 <li
//                   className="nav-header cursor-pointer"
//                   onClick={() => toggleMenu("setting")}
//                 >
//                   <span className="text-base">
//                     <i class="nav-icon fa fa-cog  text-sm"></i>Settings
//                   </span>
//                 </li>
//                 <ul
//                   className={`nav nav-treeview ${
//                     activeMenu === "setting" ? "slide-in" : "slide-out"
//                   }`}
//                 >
//                   {/* <li className="nav-item">
//                     <Link
//                       to="/panel/admin/change-password"
//                       className="nav-link"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Change Password</p>
//                     </Link>
//                   </li> */}
//                   <li className="nav-item" >
//                     <div
//                       className="nav-link cursor-pointer ml-2"
//                       data-toggle="modal"
//                       data-target="#exampleModalCenter_lss"
//                     >
//                       <i className="fa fa-circle-o nav-icon text-sm" />
//                       <p>Logout</p>
//                     </div>
//                   </li>
//                 </ul>
//               </li>
//             </ul>
//           </nav>
//         </div>
//       </aside>
//       <div
//         className="modal fade"
//         id="exampleModalCenter_lss"
//         tabIndex={-1}
//         role="dialog"
//         aria-labelledby="exampleModalCenterTitle"
//         aria-hidden="true"
//       >
//         <div className="modal-dialog modal-dialog-centered" role="document">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h5 className="modal-title" id="exampleModalLongTitle">
//                 Logout
//               </h5>
//               <button
//                 type="button"
//                 className="close"
//                 data-dismiss="modal"
//                 aria-label="Close"
//               >
//                 <span aria-hidden="true">×</span>
//               </button>
//             </div>
//             <div className="modal-body">Are you sure ?</div>
//             <div className="modal-footer">
//               <button
//                 type="button"
//                 className="btn btn-secondary"
//                 data-dismiss="modal"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 className="btn bg-[#00613e] text-white"
//                 onClick={logoutStaff}
//                 data-dismiss="modal"
//               >
//                 Logout
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/sidebar.css";
import fng_logo from "../../assets/images/fng_logo.png";

export default function StaffSidebar() {
  const navigate = useNavigate();
  const staffMenu = sessionStorage.getItem("staffMenu");
  const [activeMenu, setActiveMenu] = useState(staffMenu);

  useEffect(()=>{
    // localStorage.removeItem("lastViewedCode");
    const staffMenu = sessionStorage.getItem("staffMenu");
    setActiveMenu(staffMenu);
  },[])

  const toggleMenu = (menuName) => {
    console.log(localStorage.removeItem("lastViewedCode"));
    setActiveMenu(activeMenu === menuName ? null : menuName);
    sessionStorage.setItem("staffMenu", menuName);
  };

  const logoutStaff = () => {
    localStorage.removeItem("lastViewedCode");
    localStorage.removeItem("f&gstafftoken");
    navigate("/panel/office/login");
  };

  const clearLastViewedCode = () => {
    try {
      localStorage.removeItem("lastViewedCode");
    } catch (error) {
      console.error("Error : ", error);
    }
  }

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
              {/* <Link to="/panel/admin/dashboard">
                <li class="nav-header cursor-pointer block w-full hover:bg-[#444b52] text-white rounded">
                  <span className="text-base">
                    <i class="nav-icon fa fa-tachometer mr-2"></i>
                    Dashboard
                  </span>
                </li>
              </Link> */}

              <li
                className={`nav-item ${
                  activeMenu === "projects" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("projects")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-id-card  text-sm"></i>Project
                    Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "projects" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item"  onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/all-projects/1"
                      className="nav-link ml-2"
                     
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Ongoing Projects</p>
                    </Link>
                  </li>
                  {/* <li className="nav-item">
                    <Link to="/panel/office/completed-projects/1" className="nav-link ml-2">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Completed Projects</p>
                    </Link>
                  </li> */}
                  <li className="nav-item"  onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/billed-projects/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Billed Projects</p>
                    </Link>
                  </li>
                  <li className="nav-item"  onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/project/add/0"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Project</p>
                    </Link>
                  </li>
                </ul>
              </li>

              {/* <li
                className={`nav-item ${
                  activeMenu === "bids" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("bids")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-id-card text-sm"></i>Bids
                    Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "bids" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item">
                    <Link
                      to="/panel/office/bid-projects/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Bid Projects</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link
                      to="/panel/office/project/add/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Create Bid</p>
                    </Link>
                  </li>
                </ul>
              </li> */}

         

              <li
                className={`nav-item ${
                  activeMenu === "bid" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("bid")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-id-card text-sm"></i>Bids Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "bid" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/all-proposals/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Bid Projects</p>
                    </Link>
                  </li>
                  
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/add-proposal"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Create Proposal</p>
                    </Link>
                  </li>

                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/all-closed-proposals/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Closed Bids</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "compiled" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("compiled")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-id-card text-sm"></i>Compilation
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "compiled" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/all-customers/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Compilation</p>
                    </Link>
                  </li>
                </ul>
              </li>
              
              <li
                className={`nav-item ${
                  activeMenu === "chemical" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("chemical")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-id-card text-sm"></i>Scheduled Maintenance


                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "chemical" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      // to="/panel/office/all-customers/1"
                      to="/panel/office/chemical-maintenance/dashboard"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p className="mb-0">
                        Scheduled Application
                        <br />
                        <span style={{ marginLeft: "1.4rem" }}>Dashboard</span>
                      </p>
                    </Link>
                  </li>
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/chemical-maintenance/add-new-customer"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>   Add New Customer</p>
                    </Link>
                  </li>
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/chemical-maintenance/manage-customer"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Manage Customers</p>
                    </Link>
                  </li>
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/chemical-maintenance/archived-plans"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Archived Plans</p>
                    </Link>
                  </li>
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/chemical-maintenance/add-chemicals"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Chemicals</p>
                    </Link>
                  </li>
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/chemical-maintenance/other-treatments"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Other Treatments</p>
                    </Link>
                  </li>
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/chemical-maintenance/chemicals-mixs"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Chemical Mixes</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "customerSummary" ? "menu-open" : ""
                }`}
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("customerSummary")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-id-card text-sm"></i>Customer Summary
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "customerSummary" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/chemical-maintenance/customer-summary"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Customer Summary</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li
                className={`nav-item ${
                  activeMenu === "trash" ? "menu-open" : ""
                }`}
                
              >
                <li
                  className="nav-header cursor-pointer"
                  onClick={() => toggleMenu("trash")}
                >
                  <span className="text-base">
                    <i class="nav-icon fa fa-trash text-sm"></i>Trash Management
                  </span>
                </li>
                <ul
                  className={`nav nav-treeview ${
                    activeMenu === "trash" ? "slide-in" : "slide-out"
                  }`}
                >
                  <li className="nav-item" onClick={clearLastViewedCode}>
                    <Link
                      to="/panel/office/deleted-projects/1"
                      className="nav-link ml-2"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Trash Projects</p>
                    </Link>
                  </li>
                </ul>
              </li>

              {/* <li className={`nav-item ${activeMenu === 'jobTypes' ? 'menu-open' : ''}`}>
                <li className="nav-header cursor-pointer" onClick={() => toggleMenu('jobTypes')}>
                  <span className="text-base"><i class="nav-icon fa fa-address-book  text-sm"></i>Job Type Management</span>
                </li>
                <ul className={`nav nav-treeview ${activeMenu === 'jobTypes' ? 'slide-in' : 'slide-out'}`}>
                  <li className="nav-item">
                    <Link to="/panel/admin/all-job-types" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Job Types</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/panel/admin/job-type/add" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Staff</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li className={`nav-item ${activeMenu === 'materials' ? 'menu-open' : ''}`}>
                <li className="nav-header cursor-pointer" onClick={() => toggleMenu('materials')}>
                  <span className="text-base"><i class="nav-icon fa fa-gg-circle  text-sm"></i>Material Management</span>
                </li>
                <ul className={`nav nav-treeview ${activeMenu === 'materials' ? 'slide-in' : 'slide-out'}`}>
                  <li className="nav-item">
                    <Link to="/panel/admin/all-materials" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Materials</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/panel/admin/material/add" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Material</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li className={`nav-item ${activeMenu === 'crewCategories' ? 'menu-open' : ''}`}>
                <li className="nav-header cursor-pointer" onClick={() => toggleMenu('crewCategories')}>
                  <span className="text-base"><i class="nav-icon fa fa-asterisk  text-sm"></i>Crew Category Management</span>
                </li>
                <ul className={`nav nav-treeview ${activeMenu === 'crewCategories' ? 'slide-in' : 'slide-out'}`}>
                  <li className="nav-item">
                    <Link to="/panel/admin/all-crew-categories" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Crew Categories</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/panel/admin/crew-category/add" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Crew Category</p>
                    </Link>
                  </li>
                </ul>
              </li>

              <li className={`nav-item ${activeMenu === 'crews' ? 'menu-open' : ''}`}>
                <li className="nav-header cursor-pointer" onClick={() => toggleMenu('crews')}>
                  <span className="text-base"><i class="nav-icon fa fa-users  text-sm"></i>Crew Management</span>
                </li>
                <ul className={`nav nav-treeview ${activeMenu === 'crews' ? 'slide-in' : 'slide-out'}`}>
                  <li className="nav-item">
                    <Link to="/panel/admin/all-crews" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>All Crews</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/panel/admin/crew/add" className="nav-link">
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Add Crew</p>
                    </Link>
                  </li>
                </ul>
              </li> */}

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
                  {/* <li className="nav-item">
                    <Link
                      to="/panel/admin/change-password"
                      className="nav-link"
                    >
                      <i className="fa fa-circle-o nav-icon text-sm" />
                      <p>Change Password</p>
                    </Link>
                  </li> */}
                  <li className="nav-item" >
                    <div
                      className="nav-link cursor-pointer ml-2"
                      data-toggle="modal"
                      data-target="#exampleModalCenter_lss"
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
        id="exampleModalCenter_lss"
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
                className="btn bg-[#00613e] text-white"
                onClick={logoutStaff}
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
