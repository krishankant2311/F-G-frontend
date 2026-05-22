import React from 'react'
import Layout from '../../components/layout/Layout'
import CustomerTable from '../../components/tables/customer/CustomerTable'

export default function CustomerManagement() {

  return (
    <div>
        <Layout>
            <CustomerTable />
        </Layout>
    </div>
  )
}
