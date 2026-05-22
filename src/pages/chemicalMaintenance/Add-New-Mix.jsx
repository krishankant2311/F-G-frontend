import React from "react";

import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import AddNewMix from "../../components/tables/chemical/components/AddNewMix";

const ManageCustomers = () => {
  return (
    <div>
      <Layout>
        <AddNewMix />
      </Layout>
    </div>
  );
};

export default ManageCustomers;
