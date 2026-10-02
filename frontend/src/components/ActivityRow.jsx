import { Box, ButtonBase } from '@mui/material'
import { formatDate, formatFlow } from '../format'
import Icon from './Icon'

// One line of activity. Pass accountId inside an account history so transfers show their direction.
export default function ActivityRow({ entry, currency, accountId, today, showDate = true, onClick }) {
  const transfer = entry.kind === 'transfer'
  const direction = transfer
    ? accountId ? (String(entry.source_account_id) === String(accountId) ? 'out' : 'in') : null
    : entry.type === 'income' ? 'in' : 'out'
  const meta = transfer ? `${entry.source_account_name} → ${entry.destination_account_name}` : `${entry.category_name} · ${entry.account_name}`
  const label = transfer ? (direction === 'out' ? 'Transfer out' : direction === 'in' ? 'Transfer in' : 'Transfer') : entry.type === 'income' ? 'Income' : 'Expense'
  const tone = transfer ? 'neutral' : direction
  return <ButtonBase className="activity-row" onClick={onClick} focusRipple>
    <span className={`activity-icon ${tone}`} aria-hidden="true"><Icon name={transfer ? 'activity' : entry.type === 'income' ? 'income' : 'expense'} fontSize="small" /></span>
    <span className="activity-text">
      <span className="activity-title">{entry.description || 'Transfer'}</span>
      <span className="activity-meta">{showDate && `${formatDate(entry.date, today)} · `}{meta}</span>
      {entry.notes && <span className="activity-meta activity-notes">{entry.notes}</span>}
    </span>
    <Box component="span" className={`activity-amount money ${tone}`}>
      <span className="visually-hidden">{label}: </span>{formatFlow(entry.amount, currency, direction)}
    </Box>
  </ButtonBase>
}
