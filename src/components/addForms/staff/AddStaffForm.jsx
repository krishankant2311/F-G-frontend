import React, { useEffect, useState } from "react";
import Layout from "../../layout/Layout";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../../context/TableContext";
import { useNavigate } from "react-router-dom";

export default function AddStaffForm() {
  const [formData, setFormData] = useState({
    staffName: "",
    email: "",
    password: "",
  });
  const [disableBtn, setDisableBtn] = useState(false);
  const navigate = useNavigate();
  const { tableSize } = useTableContext();
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  });

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleInputChange = (e) => {
    if (e.target.name === "staffName") {
      const val = e.target.value;
      // if (containsNumberOrSpecialChar(val)) {
      //   toast.error("Staff Name cannot contain numbers or special characters.");
      //   return;
      // }
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  function containsNumberOrSpecialChar(text) {
    // Regular expression to check for numbers (0-9) or special characters
    const regex = /[0-9!@#$%^&*(),.?":{}|<>]/;

    // Test the text against the regex
    return regex.test(text);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.staffName.trim() === "") {
        toast.error("Please enter staff name");
        return;
      }
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
      };
      setDisableBtn(true);
      const formdata = new FormData();
      formdata.append("staffName", formData.staffName);
      formdata.append("email", formData.email);
      formdata.append("password", formData.password);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/add-staff`,
        formdata,
        {
          headers: headers,
        }
      );
      if (response.data.statusCode === 201) {
        toast.success(response.data.message);
        navigate("/panel/admin/all-staffs/1");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response.message);
    }
    // setFormData({
    //     staffName: "",
    //     email: "",
    //     password: "",
    //   });
    setDisableBtn(false);
  };

  return (
    <Layout>
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <ToastContainer />
        <div className="lg:p-10 p-3">
          <div className="card">
            <div className="card-header bg-[#00613e] text-white">
              <h3 className="card-title mt-1"><button
                    onClick={() => {
                      navigate(-1);
                    }}
                  >
                    <i className="fa fa-arrow-left mr-2"></i>
                  </button>{" "}Add New Staff</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="card-body">
                <div className="form-group">
                  <label htmlFor="exampleInputEmail1">Staff Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Staff Name"
                    value={formData.staffName}
                    onChange={handleInputChange}
                    name="staffName"
                    title="Please enter only letters and spaces."
                    // pattern="[a-zA-Z\s]*"
                    maxLength={50}
                    autoComplete="hidden"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="">Staff Email *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Staff Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    name="email"
                    autoComplete="hidden"
                    maxLength={40}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="">Create Password *</label>
                  <div className="input-group mb-3">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      className="form-control"
                      placeholder="Password"
                      name="password"
                      onChange={handleInputChange}
                      value={formData.password}
                      autoComplete="new-password"
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
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-footer">
                <button
                  type="submit"
                  disabled={disableBtn}
                  className="btn bg-[#00613e] text-white"
                >
                  {disableBtn ? "Loading..." : "Submit"}
                </button>
              </div>
            </form>
            {/* <form action="" autoComplete="hidden">
              <input
                type="text"
                className="form-control"
                placeholder="Enter Staff Email"
                value={formData.email}
                onChange={handleInputChange}
                name="email"
                autoComplete="hidden"
                maxLength={40}
                required
              />
            </form> */}
          </div>
        </div>
      </div>
    </Layout>
  );
}
