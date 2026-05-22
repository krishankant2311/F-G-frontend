import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/layout/Layout";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTableContext } from "../../context/TableContext";

export default function ChangePassword() {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword:""
  });
  const navigate = useNavigate("");
  const { tableSize } = useTableContext();
  const [disableBtn, setDisableBtn] = useState(false);
  const [passwordVisible1, setPasswordVisible1] = useState(false);
  const [passwordVisible2, setPasswordVisible2] = useState(false);
  const [passwordVisible3, setPasswordVisible3] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("f&gadmintoken");
      const headers = {
        token: token,
        "Content-Type": "application/json",
      };

      if(formData.newPassword !== formData.confirmPassword){
        toast.error("New password must be equal to the confirm password");
        return;
      }

      const formdata = new FormData();
      formdata.append("oldPassword", formData.oldPassword);
      formdata.append("newPassword", formData.newPassword);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/admin/change-password`,
        formdata,
        { headers: headers }
      );
      if (response.data.statusCode === 200) {
        toast(response.data.message);
        localStorage.removeItem("f&gadmintoken");
        navigate("/panel/admin/login");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error(error);
    }
    setDisableBtn(false);
  };

  const togglePasswordVisibility1 = () => {
    setPasswordVisible1(!passwordVisible1);
  };

  const togglePasswordVisibility2 = () => {
    setPasswordVisible2(!passwordVisible2);
  };

  const togglePasswordVisibility3 = () => {
    setPasswordVisible3(!passwordVisible3);
  };

  return (
    <Layout>
      <div
        className={`${tableSize === 250 ? "md:ml-[250px]" : "md:ml-[90px]"}`}
      >
        <ToastContainer />
        <div className="flex justify-center items-center h-[90vh] w-full bg-[#e9ecef]">
          <div class="login-box rounded">
            <div class="login-logo font-medium">
              <b>F&G</b>
            </div>

            <div class="card px-2">
              <div class="card-body login-card-body">
                <h1 class="font-medium text-center text-base mb-4 tracking-wide">
                  Change Password
                </h1>
                <form action="" method="post" onSubmit={handleSubmit}>
                  <div class="input-group mb-3">
                    <input
                      type={passwordVisible1 ? "text" : "password"}
                      class="form-control"
                      placeholder="Old Password"
                      name="oldPassword"
                      onChange={handleInputChange}
                      value={formData.oldPassword}
                      required
                    />
                    <div class="input-group-append">
                      <div
                        className="input-group-text"
                        style={{ cursor: "pointer" }}
                        onClick={togglePasswordVisibility1}
                      >
                        <span
                          className={`fa ${
                            passwordVisible1 ? "fa-eye-slash" : "fa-eye"
                          } text-[18px]`}
                        ></span>
                      </div>
                      <div class="input-group-text w-[38px]">
                        <span class="fa fa-lock text-[18px]"></span>
                      </div>
                    </div>
                  </div>
                  <div class="input-group mb-3">
                    <input
                      type={passwordVisible2 ? "text" : "password"}
                      class="form-control"
                      placeholder="New Password"
                      name="newPassword"
                      onChange={handleInputChange}
                      value={formData.newPassword}
                      required
                    />
                    <div class="input-group-append">
                      <div
                        className="input-group-text"
                        style={{ cursor: "pointer" }}
                        onClick={togglePasswordVisibility2}
                      >
                        <span
                          className={`fa ${
                            passwordVisible2 ? "fa-eye-slash" : "fa-eye"
                          } text-[18px]`}
                        ></span>
                      </div>
                      <div class="input-group-text w-[38px]">
                        <span class="fa fa-lock text-[18px]"></span>
                      </div>
                    </div>
                  </div>
                  <div class="input-group mb-3">
                    <input
                      type={passwordVisible2 ? "text" : "password"}
                      class="form-control"
                      placeholder="Confirm Password"
                      name="confirmPassword"
                      onChange={handleInputChange}
                      value={formData.confirmPassword}
                      required
                    />
                    <div class="input-group-append">
                      <div
                        className="input-group-text"
                        style={{ cursor: "pointer" }}
                        onClick={togglePasswordVisibility2}
                      >
                        <span
                          className={`fa ${
                            passwordVisible2 ? "fa-eye-slash" : "fa-eye"
                          } text-[18px]`}
                        ></span>
                      </div>
                      <div class="input-group-text w-[38px]">
                        <span class="fa fa-lock text-[18px]"></span>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    {/* <div class="col-8">
                  <div class="icheck-primary">
                    <input type="checkbox" id="remember" />
                    <label for="remember"> Remember Me </label>
                  </div>
                </div> */}

                    <div class="col-12">
                      <button
                        type="submit"
                        disabled={disableBtn}
                        class="btn bg-[#00613e] text-white w-full"
                      >
                        {disableBtn ? "Loading..." : "Change Password"}
                      </button>
                    </div>
                  </div>
                </form>
                {/* <div class="social-auth-links text-center mb-3">
              <p>- OR -</p>
              <a href="#" class="btn btn-block btn-primary">
                <i class="fab fa-facebook mr-2"></i> Sign in using Facebook
              </a>
              <a href="#" class="btn btn-block btn-danger">
                <i class="fab fa-google-plus mr-2"></i> Sign in using Google+
              </a>
            </div>

            <p class="mb-1">
              <a href="forgot-password.html">I forgot my password</a>
            </p>
            <p class="mb-0">
              <a href="register.html" class="text-center">
                Register a new membership
              </a>
            </p> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
