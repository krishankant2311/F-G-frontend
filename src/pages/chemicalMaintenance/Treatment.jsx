import React from "react";
import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import Treatment from "../../components/tables/chemical/components/Dashboard/Treatment";

export default function StaffBidsProject() {
  return (
    <div className="">
      <Layout>
        <Treatment />
      </Layout>
    </div>
  );
}
