import { useAuth } from '../auth/useAuth'
import { useRemote } from '../useRemote'
import RemoteState from '../components/RemoteState'
import ResourceManager from '../components/ResourceManager'
import TransferDetails from '../components/TransferDetails'
import { browseFields, transferFields } from '../components/activityFields'

export default function Transfers() {
  const { user } = useAuth()
  const accounts = useRemote('/accounts')
  const settings = useRemote('/settings')
  return <RemoteState remote={accounts}><RemoteState remote={settings}>
    {accounts.data && settings.data && <ResourceManager title="Transfers" noun="transfer" endpoint="/transfers"
      fields={transferFields(accounts.data.data, user.currency)}
      defaults={{ source_account_id: '', destination_account_id: '', amount: '', date: settings.data.today, description: '' }}
      browseFields={browseFields(accounts.data.data, [], { transfers: true })}
      onSaved={accounts.refresh}
      introduction="Move money between two of your accounts. Transfers change account balances while keeping your total balance, income and expenses unchanged. Create two active accounts to get started."
      details={entry => <TransferDetails entry={entry} currency={user.currency} />}
    />}
  </RemoteState></RemoteState>
}
