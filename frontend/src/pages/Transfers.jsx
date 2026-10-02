import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import { dayLabel } from '../format'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'
import ActivityEditor from '../components/ActivityEditor'
import ActivityRow from '../components/ActivityRow'
import { browseFields } from '../components/activityFields'

export default function Transfers() {
  const { user } = useAuth()
  const accounts = useRemote('/accounts')
  const categories = useRemote('/categories')
  const settings = useRemote('/settings')
  const today = settings.data?.today
  return <RemoteState remote={accounts}><RemoteState remote={categories}><RemoteState remote={settings}>
    {accounts.data && categories.data && settings.data && <ResourceManager title="Transfers" noun="transfer" endpoint="/transfers"
      browseFields={browseFields(accounts.data.data, [], { transfers: true })}
      onSaved={accounts.refresh}
      introduction="Move money between your accounts. Transfers don't count as income or expenses."
      layout="rows"
      groupBy={entry => dayLabel(entry.date, today)}
      row={(entry, { grouped, open }) => <ActivityRow entry={{ ...entry, kind: 'transfer' }} currency={user.currency} today={today} showDate={!grouped} onClick={open} />}
      editor={({ record, ...props }) => <ActivityEditor {...props} record={record.id ? { ...record, kind: 'transfer' } : record} kind="transfer" accounts={accounts.data.data} categories={categories.data.data} today={today} currency={user.currency} />}
    />}
  </RemoteState></RemoteState></RemoteState>
}
