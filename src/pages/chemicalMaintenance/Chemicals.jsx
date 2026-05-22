import React from "react";

import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import ChemicalTable from "../../components/tables/chemical/ChemicalTable";

const ManageCustomers = () => {
  return (
    <div>
      <Layout>
        <ChemicalTable />
      </Layout>
    </div>
  );
};

export default ManageCustomers;
