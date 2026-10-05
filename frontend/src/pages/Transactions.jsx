import { Link, useParams } from 'react-router-dom'
import { Button, Stack, Typography } from '@mui/material'
import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import { dayLabel, formatDate, formatMoney } from '../format'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'
import ActivityEditor from '../components/ActivityEditor'
import ActivityRow from '../components/ActivityRow'
import { browseFields } from '../components/activityFields'
import { ActivityTabs } from '../components/SectionTabs'

export default function Transactions() {
  const { accountId } = useParams()
  const { user } = useAuth()
  const accounts = useRemote('/accounts')
  const categories = useRemote('/categories')
  const settings = useRemote('/settings')
  const account = accounts.data?.data.find(item => String(item.id) === accountId)
  const today = settings.data?.today
  const hasActiveAccount = accounts.data?.data.some(item => item.is_active)
  const introduction = accountId
    ? account && `Current balance: ${formatMoney(account.balance, user.currency)} · Opened with ${formatMoney(account.opening_balance, user.currency)} on ${formatDate(account.opening_date)}${account.is_active ? '' : ' · Archived: existing entries can still be corrected'}`
    : !hasActiveAccount && <>You need an account before recording transactions. <Link to="/accounts">Add an account</Link></>
  return <RemoteState remote={accounts}><RemoteState remote={categories}><RemoteState remote={settings}>
    {accounts.data && categories.data && settings.data && <Stack spacing={2}>
      {accountId && <Button component={Link} to="/accounts" sx={{ alignSelf: 'flex-start' }}>Back to accounts</Button>}
      {accountId && !account ? <Typography>Account not found.</Typography> : <ResourceManager
        key={accountId ?? 'all'} title={accountId ? `${account.name} history` : 'Activity'} noun="transaction"
        tabs={!accountId && <ActivityTabs />}
        endpoint={accountId ? `/accounts/${accountId}/history` : '/activity'} writeEndpoint="/transactions"
        onSaved={accounts.refresh}
        browseFields={browseFields(accounts.data.data, categories.data.data, { history: Boolean(accountId) })}
        recordConfig={record => record?.kind === 'transfer' ? { noun: 'transfer', endpoint: '/transfers' } : {}}
        introduction={introduction}
        layout="rows"
        groupBy={entry => dayLabel(entry.date, today)}
        row={(entry, { grouped, open }) => <ActivityRow entry={entry} currency={user.currency} accountId={accountId} today={today} showDate={!grouped} onClick={open} />}
        editor={props => <ActivityEditor {...props} accountId={account?.is_active ? account.id : undefined} accounts={accounts.data.data} categories={categories.data.data} today={today} currency={user.currency} />}
      />}
    </Stack>}
  </RemoteState></RemoteState></RemoteState>
}
