import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import AuthPage from './auth/AuthPage'
import Dashboard from './Dashboard'
import Settings from './pages/Settings'
import Accounts from './pages/Accounts'
import Categories from './pages/Categories'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import RecurringRules from './pages/RecurringRules'
import SavingsGoals from './pages/SavingsGoals'
import Reports from './pages/Reports'
import CsvImport from './pages/CsvImport'
import Appearance from './Appearance'
import WorkspaceNavigation from './components/WorkspaceNavigation'
import WorkspaceHeader from './components/WorkspaceHeader'
import WorkspaceProvider from './WorkspaceProvider'
import QuickAdd from './components/QuickAdd'

// Earlier routes, kept so existing links and bookmarks still land on the right page.
const redirects = [['/transactions', '/activity'], ['/transfers', '/activity'], ['/recurring', '/activity/scheduled'], ['/categories', '/settings/categories'], ['/import', '/settings/import']]

export default function App() {
  const { status, user, retry } = useAuth()
  const configured = Boolean(user?.currency && user?.timezone)
  const signedIn = status === 'authenticated'
  const ready = element => configured ? element : <Navigate to="/settings" replace />
  let content
  if (status === 'checking') {
    content = <Stack role="status" spacing={2} sx={{ alignItems: 'center' }}><CircularProgress aria-label="Checking your session" /><Typography>Loading your workspace…</Typography></Stack>
  } else if (status === 'error') {
    content = <Alert severity="error" action={<Button color="inherit" onClick={retry}>Try again</Button>}>Unable to check your session. Please try again.</Alert>
  } else {
    content = <Routes>
      <Route path="/login" element={signedIn ? <Navigate to="/" replace /> : <AuthPage key="login" />} />
      <Route path="/register" element={signedIn ? <Navigate to="/" replace /> : <AuthPage key="register" register />} />
      <Route element={signedIn ? <Dashboard /> : <Navigate to="/login" replace />}>
        <Route path="/" element={ready(<Overview />)} />
        <Route path="/activity" element={ready(<Transactions />)} />
        <Route path="/activity/scheduled" element={ready(<RecurringRules />)} />
        <Route path="/accounts" element={ready(<Accounts />)} />
        <Route path="/accounts/:accountId/history" element={ready(<Transactions />)} />
        <Route path="/budgets" element={ready(<Budgets />)} />
        <Route path="/goals" element={ready(<SavingsGoals />)} />
        <Route path="/reports" element={ready(<Reports />)} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/categories" element={ready(<Categories />)} />
        <Route path="/settings/import" element={ready(<CsvImport />)} />
        {redirects.map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  }
  const main = <Box component="main" id="main-content" tabIndex={-1} className={`main-content ${signedIn ? 'workspace-content' : 'guest-content'}`}>{content}</Box>
  return <WorkspaceProvider><Appearance actions={signedIn ? <WorkspaceHeader /> : undefined}>
      {signedIn ? <Box className="workspace-layout"><WorkspaceNavigation />{main}</Box> : main}
      {signedIn && configured && <QuickAdd />}
  </Appearance></WorkspaceProvider>
}
