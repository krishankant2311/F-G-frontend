import axios from "axios";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StaffResetPassword() {
  const location = useLocation();
  const email = location.state.data;

  const [formData, setFormData] = useState({
    email: email,
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const navigate = useNavigate("");
  const [disableBtn, setDisableBtn] = useState(false);
  const [passwordVisible1, setPasswordVisible1] = useState(false);
  const [passwordVisible2, setPasswordVisible2] = useState(false);

  const togglePasswordVisibility1 = () => {
    setPasswordVisible1(!passwordVisible1);
  };

  const togglePasswordVisibility2 = () => {
    setPasswordVisible2(!passwordVisible2);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formdata = new FormData();
      formdata.append("email", formData.email);
      formdata.append("otp", formData.otp);
      formdata.append("newPassword", formData.newPassword);
      formdata.append("confirmPassword", formData.confirmPassword);
      setDisableBtn(true);
      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/staff/reset-password`,
        formdata
      );
      if (response.data.statusCode === 200) {
        navigate("/panel/office/login");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.data?.message);
    }
    setDisableBtn(false);
  };

  return (
    <div className="flex justify-center items-center h-[100vh] w-full bg-[#e9ecef]">
      <div class="login-box rounded">
        {/* <div class="login-logo">
          <a href="../../index2.html">
            <b>F&G</b>
          </a>
        </div> */}

        <div class="card px-2">
          <ToastContainer />
          <div class="card-body login-card-body">
            <h1 class="font-bold text-center text-2xl mb-4 tracking-wide">
              F&G
            </h1>
            <form action="" method="post" onSubmit={handleSubmit}>
              <div class="input-group mb-3">
                <input
                  type="email"
                  class="form-control"
                  placeholder="Email"
                  name="email"
                  onChange={handleInputChange}
                  value={formData.email}
                  required
                  readOnly={true}
                />
                <div class="input-group-append">
                  <div class="input-group-text">
                    <span class="fa fa-envelope text-[14px]"></span>
                  </div>
                </div>
              </div>
              <div class="input-group mb-3">
                <input
                  type="number"
                  class="form-control"
                  placeholder="Enter OTP (Sent on Email)"
                  name="otp"
                  onChange={handleInputChange}
                  value={formData.otp}
                  required
                />
                <div class="input-group-append">
                  <div class="input-group-text">
                    <span class="fa fa-key text-[14px]"></span>
                  </div>
                </div>
              </div>
              <div class="input-group mb-3">
                <input
                  type={passwordVisible1 ? "text" : "password"}
                  class="form-control"
                  placeholder="Enter New Password"
                  name="newPassword"
                  onChange={handleInputChange}
                  value={formData.newPassword}
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
                  placeholder="Confirm Your Password"
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

                <div class="col-4">
                  <button
                    type="submit"
                    disabled={disableBtn}
                    class="btn btn-primary btn-block"
                  >
                    {disableBtn ? "Loading..." : "Submit"}
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

            
            <p class="mb-0">
              <a href="register.html" class="text-center">
                Register a new membership
              </a>
            </p> */}
          </div>
        </div>
      </div>
    </div>
  );
}
