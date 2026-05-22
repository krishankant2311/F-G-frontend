import React from "react";
import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import TreatmentList from "../../components/tables/chemical/components/Dashboard/TreatmentList";

export default function StaffBidsProject() {
  return (
    <div className="">
      <Layout>
        <TreatmentList />
      </Layout>
    </div>
  );
}
