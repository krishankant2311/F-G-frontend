import React from 'react'
import Layout from '../../components/layout/Layout'
import CustomerProjectsTable from '../../components/tables/compiledProjects/CustomerProjectsTable'

export default function CustomerProjects() {

  return (
    <div>
        <Layout>
            <CustomerProjectsTable />
        </Layout>
    </div>
  )
}
