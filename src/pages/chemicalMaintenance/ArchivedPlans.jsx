import React from "react";
import Layout from "../../components/layout/Layout";
import ArchivedPlansTable from "../../components/tables/chemical/ArchivedPlansTable";

const ArchivedPlans = () => {
  return (
    <div>
      <Layout>
        <ArchivedPlansTable />
      </Layout>
    </div>
  );
};

export default ArchivedPlans;
