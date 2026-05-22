import React from "react";
import Layout from "../../components/layout/Layout";
import StaffDeletedProjectTable from "../../components/tables/projects/StaffDeletedProjectTable";

export default function StaffDeletedProjects() {
  return (
    <div className="">
      <Layout>
        <StaffDeletedProjectTable />
      </Layout>
    </div>
  );
}
