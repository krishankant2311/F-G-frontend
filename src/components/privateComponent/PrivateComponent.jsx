import React from 'react'
import { Navigate, Outlet } from 'react-router-dom';

export default function PrivateComponent() {

    const auth = localStorage.getItem('f&gadmintoken');

  return (
    <div>
{
    auth ? <Outlet /> : <Navigate to='/panel/admin/login' />
}
    </div>
  )
}
