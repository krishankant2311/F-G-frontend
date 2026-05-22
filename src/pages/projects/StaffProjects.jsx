import React from "react";
import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";

export default function StaffProjects() {
  return (
    <div className="">
      <Layout>
        <StaffProjectTable />
      </Layout>
    </div>
  );
}
