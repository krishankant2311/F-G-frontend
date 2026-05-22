import React from "react";
import Navbar from "../navbar/Navbar";
import Footer from "../footer/Footer";
import Sidebar from "../sidebar/Sidebar";
import { useLocation } from "react-router-dom";
import StaffSidebar from "../sidebar/StaffSidebar";
import StaffNavbar from "../navbar/StaffNavbar";

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div>
      {
        location.pathname.startsWith("/panel/admin")? <Navbar /> : <StaffNavbar />
      }
      {
        location.pathname.startsWith("/panel/admin") ? <Sidebar /> : <StaffSidebar />
      }
      
      {children}
      <Footer />
    </div>
  );
}

