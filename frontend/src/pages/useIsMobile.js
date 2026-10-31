import { useEffect, useState } from 'react'

// Mantenha este valor igual ao breakpoint do CSS (InfoPage.css / DesktopOnly.css).
const QUERY = '(max-width: 768px)'

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches)

  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
