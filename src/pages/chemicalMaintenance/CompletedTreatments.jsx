import React from "react";
import Layout from "../../components/layout/Layout";
import ChemicalDashboardTable from "../../components/tables/chemical/ChemicalDashboardTable";

export default function CompletedTreatments() {
  return (
    <div className="">
      <Layout>
        <ChemicalDashboardTable pageMode="completed" />
      </Layout>
    </div>
  );
}
