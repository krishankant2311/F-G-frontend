import axios from "axios";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function StaffLogin() {

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });
    const navigate = useNavigate("")
    const [disableBtn,setDisableBtn] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    const handleInputChange = (e) => {
        setFormData({
           ...formData,
            [e.target.name]: e.target.value,
        });
    }

    const handleSubmit = async(e) => {
        e.preventDefault();
        try {
            const formdata = new FormData();
            formdata.append("email", formData.email);
            formdata.append("password",  formData.password);
            setDisableBtn(true);
            const response =  await axios.post(`${process.env.REACT_APP_API_BASE_URL}/staff/login`,formdata);
            console.log("loginresponse",response);
            if(response.data.statusCode === 200){
                localStorage.setItem("f&gstafftoken", response.data.result.token);
                navigate('/panel/office/all-projects/1')
            }else{
               toast.error(response.data.message);
            }
        } catch (error) {
            console.error("dqdw",error);
            toast.error(error.response.data?.message);
        }
        setDisableBtn(false);
    }

    const togglePasswordVisibility = () => {
      setPasswordVisible(!passwordVisible);
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
            <h1 class="font-bold text-center text-2xl mb-4 tracking-wide">F&G</h1>
            <form action="" method="post" onSubmit={handleSubmit}>
              <div class="input-group mb-3">
                <input type="email" class="form-control" placeholder="Email"  name="email"
                    onChange={handleInputChange}
                    value={formData.email}
                    required
                    />
                <div class="input-group-append">
                  <div class="input-group-text">
                    <span class="fa fa-envelope text-[14px]"></span>
                  </div>
                </div>
              </div>
              <div class="input-group mb-3">
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  class="form-control"
                  placeholder="Password"
                  name="password"
                    onChange={handleInputChange}
                    value={formData.password}
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
                  <button type="submit" disabled={disableBtn} class="btn bg-[#00613e] text-white btn-block">
                    {disableBtn ? 'Loading...' : 'Sign In' }
                  </button>
                </div>
              </div>
            </form>
            <p class="mt-2">
              <Link to="/panel/office/forgot-password" className="hover:text-[#00613e]">I forgot my password</Link>
            </p>
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
