import React from 'react'
import Layout from '../../components/layout/Layout'
import JobTypesTable from '../../components/tables/jobTypes/JobTypesTable'
import MaterialTable from '../../components/tables/materials/MaterialTable'

export default function AllMaterials() {

  return (
    <div>
        <Layout>
            <MaterialTable />
        </Layout>
    </div>
  )
}
