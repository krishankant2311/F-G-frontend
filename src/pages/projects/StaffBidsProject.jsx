import React from "react";
import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import StaffBidsProjectTable from "../../components/tables/projects/StaffBidsProjectTable";

export default function StaffBidsProject() {
  return (
    <div className="">
      <Layout>
        <StaffBidsProjectTable />
      </Layout>
    </div>
  );
}
