import { SvgIcon } from '@mui/material'

const paths = {
  overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  wallet: 'M3 7V5a2 2 0 0 1 2-2h13v4 M3 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z M21 12h-6v5h6',
  activity: 'M3 7h16 M15 3l4 4-4 4 M21 17H5 M9 13l-4 4 4 4',
  goal: 'M21 12a9 9 0 1 1-9-9 M16 3h5v5 M21 3l-9 9 M16 12a4 4 0 1 1-4-4',
  chart: 'M4 3v17h17 M8 15v-4 M13 15V7 M18 15V4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  chevron: 'm7 10 5 5 5-5',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  plus: 'M12 5v14 M5 12h14',
  income: 'M7 17 17 7 M7 7h10v10',
  expense: 'M7 7l10 10 M7 17h10V7',
  budget: 'M12 3a9 9 0 1 0 9 9h-9z M15 3.5A9 9 0 0 1 20.5 9H15z',
  settings: 'M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h11 M19 18h1 M15 4v4 M9 10v4 M17 16v4',
  logout: 'M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3 M16 17l5-5-5-5 M21 12H9',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14z M20 20l-4-4',
  filter: 'M4 5h16l-6 7.5V18l-4 2v-7.5z',
  more: 'M5 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2z M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2z M19 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2z',
  refresh: 'M4 10a8 8 0 0 1 13.65-4.65L21 9 M21 3v6h-6 M20 14a8 8 0 0 1-13.65 4.65L3 15 M3 21v-6h6',
}

export default function Icon({ name, ...props }) {
  return <SvgIcon {...props} viewBox="0 0 24 24"><path d={paths[name] || paths.overview} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>
}
