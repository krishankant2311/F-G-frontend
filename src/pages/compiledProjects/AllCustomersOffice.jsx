import React from 'react'
import Layout from '../../components/layout/Layout'
import AllCustomersOfficeTable from '../../components/tables/compiledProjects/AllCustomersOfficeTable'

export default function AllCustomersOffice() {

  return (
    <div>
        <Layout>
            <AllCustomersOfficeTable />
        </Layout>
    </div>
  )
}
