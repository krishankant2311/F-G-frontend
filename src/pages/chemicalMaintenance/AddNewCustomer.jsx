import React from "react";
import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import AddCustomerTable from "../../components/tables/chemical/AddCustomer";

export default function StaffBidsProject() {
  return (
    <div className="">
      <Layout>
        <AddCustomerTable />
      </Layout>
    </div>
  );
}