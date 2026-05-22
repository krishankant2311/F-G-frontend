import React from 'react'
import Layout from '../../components/layout/Layout'
import CrewCategoryTable from '../../components/tables/crewCategory/CrewCategoryTable'
import CrewTable from '../../components/tables/crew/CrewTable'

export default function AllCrew() {

  return (
    <div>
        <Layout>
            <CrewTable />
        </Layout>
    </div>
  )
}
