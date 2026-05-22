// import React from 'react'

// const Dashboard = () => {
//   return (
//     <div>
//       dashboard
//     </div>
//   )
// }

// export default Dashboard

import React from "react";
import Layout from "../../components/layout/Layout";
import StaffProjectTable from "../../components/tables/projects/StaffProjectTable";
import ChemicalDashboardTable from "../../components/tables/chemical/ChemicalDashboardTable";

export default function StaffBidsProject() {
  return (
    <div className="">
      <Layout>
        <ChemicalDashboardTable />
      </Layout>
    </div>
  );
}

