import { useState } from 'react'
import { formatMoney } from '../format'
import { Box, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useMediaQuery, useTheme } from '@mui/material'

const metrics = { income: 'Income', expenses: 'Expenses', net_cash_flow: 'Net cash flow' }

export default function ReportCharts({ data }) {
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('sm'))
  const chartWidth = compact ? 360 : 720
  const [metric, setMetric] = useState('net_cash_flow')
  const [months, setMonths] = useState('12')
  const [selected, setSelected] = useState(null)
  const trend = (data.trend ?? []).slice(-Number(months))
  const maximum = Math.max(1, ...trend.map(row => Math.abs(Number(row[metric]))))
  const chosen = trend.find(row => row.month === selected)
  const total = Number(data.monthly.expenses)
  const colors = { income: theme.palette.success.main, expenses: theme.palette.warning.main, net_cash_flow: theme.palette.primary.main }
  return <Stack spacing={3}>
    <Paper component="section" aria-label="Cash flow trend" variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack spacing={2}>
        <Typography component="h3" variant="h6">Cash flow trend</Typography>
        <Typography color="text.secondary">Choose a bar to see its exact value.</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select label="Chart metric" value={metric} onChange={event => setMetric(event.target.value)} slotProps={{ select: { native: true } }}>
            {Object.entries(metrics).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </TextField>
          <TextField select label="Chart period" value={months} onChange={event => { setMonths(event.target.value); setSelected(null) }} slotProps={{ select: { native: true } }}>
            <option value="12">12 months</option><option value="6">6 months</option>
          </TextField>
        </Stack>
        {trend.length > 0 ? <>
          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${chartWidth} 290`} style={{ display: 'block', width: '100%' }} role="group" aria-label={`${metrics[metric]} by month in ${data.currency}`}>
              <line x1="30" x2={chartWidth - 10} y1="135" y2="135" stroke={theme.palette.text.secondary} />
              <text x="8" y="139" fill={theme.palette.text.secondary} fontSize="12">0</text>
              {trend.map((row, index) => {
                const value = Number(row[metric])
                const height = Math.abs(value) / maximum * 110
                const width = (chartWidth - 40) / trend.length
                const x = 30 + index * width
                return <g key={row.month} role="button" tabIndex={0} aria-label={`${row.month}: ${metrics[metric]} ${formatMoney(row[metric], data.currency)}`} aria-pressed={selected === row.month}
                  onClick={() => setSelected(row.month)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(row.month) } }} style={{ cursor: 'pointer' }}>
                  <title>{row.month}: {formatMoney(row[metric], data.currency)}</title>
                  <rect x={x} y="15" width={width - 5} height="239" fill={selected === row.month ? theme.palette.action.selected : 'transparent'} rx="4" />
                  <rect x={x + 6} y={value < 0 ? 135 : 135 - height} width={width - 17} height={Math.max(2, height)} rx="2" fill={value < 0 ? theme.palette.error.main : colors[metric]} />
                  <text x={x + width / 2 - 3} y="275" textAnchor="middle" fill={theme.palette.text.secondary} fontSize="12">{row.month.slice(5)}</text>
                </g>
              })}
            </svg>
          </Box>
          <Typography role="status">{chosen ? `${chosen.month}: ${metrics[metric]} ${formatMoney(chosen[metric], data.currency)}` : `${trend[0].month} to ${trend.at(-1).month} · Scale: ${formatMoney(maximum.toFixed(2), data.currency)} above/below zero`}</Typography>
          <details><summary>View chart data</summary>
            <TableContainer tabIndex={0} role="region" aria-label="Monthly chart data"><Table size="small">
              <TableHead><TableRow><TableCell>Month</TableCell>{Object.values(metrics).map(label => <TableCell key={label}>{label} ({data.currency})</TableCell>)}</TableRow></TableHead>
              <TableBody>{trend.map(row => <TableRow key={row.month}><TableCell>{row.month}</TableCell>{Object.keys(metrics).map(key => <TableCell key={key}>{row[key]}</TableCell>)}</TableRow>)}</TableBody>
            </Table></TableContainer>
          </details>
        </> : <Typography>No trend data available.</Typography>}
      </Stack>
    </Paper>
    <Paper component="section" aria-label="Category spending shares" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Typography component="h3" variant="h6">Where your spending goes</Typography>
        {data.spending_by_category.length === 0 ? <Typography>No spending to chart this month.</Typography> : data.spending_by_category.map(category => {
          const share = total > 0 ? Number(category.amount) / total * 100 : 0
          return <Stack key={category.category_id} spacing={0.5}>
            <Typography sx={{ overflowWrap: 'anywhere' }}>{category.name} · {formatMoney(category.amount, data.currency)} · {share.toFixed(1)}%</Typography>
            <Box aria-hidden="true" sx={{ height: 12, bgcolor: 'action.hover', borderRadius: 1 }}><Box sx={{ height: '100%', width: `${Math.min(100, share)}%`, bgcolor: 'primary.main', borderRadius: 1 }} /></Box>
          </Stack>
        })}
      </Stack>
    </Paper>
  </Stack>
}
