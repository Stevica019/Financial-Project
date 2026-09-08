import { Box } from '@mui/material'
import { Outlet, useLocation } from 'react-router-dom'

export default function Dashboard() {
  const { pathname } = useLocation()
  return <Box key={pathname} className="page-enter" sx={{ width: '100%', minWidth: 0 }}><Outlet /></Box>
}
