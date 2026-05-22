import React from "react";

import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import ChemicalMixes from "../../components/tables/chemical/ChemicalMixes";

const ManageCustomers = () => {
  return (
    <div>
      <Layout>
        <ChemicalMixes />
      </Layout>
    </div>
  );
};

export default ManageCustomers;
