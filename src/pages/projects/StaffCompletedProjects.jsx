import React from "react";
import Layout from "../../components/layout/Layout";
import StaffCompletedProjectTable from "../../components/tables/projects/StaffCompletedProjectTable";

export default function StaffCompletedProjects() {
  return (
    <div className="">
      <Layout>
        <StaffCompletedProjectTable />
      </Layout>
    </div>
  );
}
