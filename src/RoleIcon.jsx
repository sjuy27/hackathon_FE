export default function RoleIcon({ name, ...props }) {
  const paths = {
    shop: 'M4 10V4h16v6M5 10v11h14V10M3 10h18M10 21v-7h4v7',
    home: 'm3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9',
    mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6',
    video: 'M3 5h12v14H3ZM15 10l6-4v12l-6-4',
    edit: 'm4 16 12-12 4 4L8 20H4ZM13 7l4 4',
    chart: 'M4 21V11M10 21V3M16 21V8M22 21V15',
    back: 'm15 5-7 7 7 7',
    play: 'm9 5 11 7-11 7Z',
    sound: 'M11 4 5 9H2v6h3l6 5ZM16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14',
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.shop}/></svg>
}
