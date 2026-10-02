const moneyFormats = new Map()

// Amounts arrive as exact decimal strings. Intl formats strings without converting them to floats.
function moneyFormat(currency, signDisplay) {
  const key = `${currency}:${signDisplay}`
  if (!moneyFormats.has(key)) moneyFormats.set(key, new Intl.NumberFormat('en-US', { style: 'currency', currency, signDisplay, minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  return moneyFormats.get(key)
}

export function formatMoney(amount, currency) {
  if (!currency || amount === null || amount === undefined || amount === '') return amount ?? ''
  return moneyFormat(currency, 'auto').format(amount)
}

// Direction "in" shows +, "out" shows −, anything else stays unsigned.
export function formatFlow(amount, currency, direction) {
  if (!currency || !direction) return formatMoney(amount, currency)
  const value = String(amount).replace(/^-/, '')
  return moneyFormat(currency, 'exceptZero').format(direction === 'out' ? `-${value}` : value)
}

export function currencySymbol(currency) {
  if (!currency) return ''
  return moneyFormat(currency, 'auto').formatToParts(0).find(part => part.type === 'currency')?.value ?? currency
}

function utcDate(date) {
  return new Date(`${date}T00:00:00Z`)
}

function shiftDay(date, days) {
  const value = utcDate(date)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export function formatDate(date, today) {
  const sameYear = today && date.slice(0, 4) === today.slice(0, 4)
  return utcDate(date).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}

export function dayLabel(date, today) {
  if (date === today) return 'Today'
  if (today && date === shiftDay(today, -1)) return 'Yesterday'
  return `${utcDate(date).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })}, ${formatDate(date, today)}`
}

export function formatMonth(month) {
  if (!month) return ''
  return utcDate(`${month}-01`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' })
}
