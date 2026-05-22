import React from "react";
import { useTableContext } from "../../context/TableContext";
import { useNavigate } from "react-router-dom";

export default function StaffNavbar() {
  const { tableSize, handleTableSize } = useTableContext();

  const navigate = useNavigate();

  const logoutStaff = () => {
    localStorage.removeItem("f&gstafftoken");
    navigate("/panel/office/login");
  };

  return (
    <div>
      <nav
        className={`main-header navbar navbar-expand navbar-white navbar-light relative w-[calc(100vw-${
          tableSize === 250 ? 250 : 250 + 90
        }px)] -left-[${tableSize === 250 ? tableSize : tableSize - 90}px]`}
      >
        <ul className="navbar-nav">
          <li className="nav-item block md:hidden" onClick={handleTableSize}>
            <a
              className="nav-link"
              data-widget="pushmenu"
              href="#"
              role="button"
            >
              <i className="fa fa-bars" />
            </a>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto">
          {/* <li className="nav-item">
            <a
              className="nav-link"
              data-widget="navbar-search"
              href="#"
              role="button"
            >
              <i className="fas fa-search" />
            </a>
            <div className="navbar-search-block">
              <form className="form-inline">
                <div className="input-group input-group-sm">
                  <input
                    className="form-control form-control-navbar"
                    type="search"
                    placeholder="Search"
                    aria-label="Search"
                  />
                  <div className="input-group-append">
                    <button className="btn btn-navbar" type="submit">
                      <i className="fas fa-search" />
                    </button>
                    <button
                      className="btn btn-navbar"
                      type="button"
                      data-widget="navbar-search"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </li> */}
          <li className="nav-item hidden lg:block">
            <a className="nav-link" data-widget="fullscreen" role="button">
              <i className="fa fa-arrows-alt" />
            </a>
          </li>
          <li
            className="nav-item"
            data-toggle="modal"
            data-target="#exampleModalCenter_lns"
          >
            <a
              className="nav-link"
              data-widget="control-sidebar"
              data-controlsidebar-slide="true"
              href="#"
              role="button"
            >
              <i className="fa fa-sign-out text-lg relative -top-[3px] -left-1" />
            </a>
          </li>
        </ul>
      </nav>
      <div
        className="modal fade"
        id="exampleModalCenter_lns"
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
