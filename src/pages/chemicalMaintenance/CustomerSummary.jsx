import React from "react";
import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import CustomerSummary from "../../components/tables/chemical/components/Dashboard/CustomerSummary";

export default function StaffBidsProject() {
  return (
    <div className="">
      <Layout>
        <CustomerSummary />
      </Layout>
    </div>
  );
}
