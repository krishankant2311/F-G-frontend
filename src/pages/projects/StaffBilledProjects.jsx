import React from "react";
import Layout from "../../components/layout/Layout";
import StaffBilledProjectTable from "../../components/tables/projects/StaffBilledProjectTable";

export default function StaffBilledProjects() {
  return (
    <div className="">
      <Layout>
        <StaffBilledProjectTable />
      </Layout>
    </div>
  );
}
