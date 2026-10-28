import { useEffect, useState } from 'react'

export function useMedia(query) {
  const [match, setMatch] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = (e) => setMatch(e.matches)
    mq.addEventListener('change', on)
    setMatch(mq.matches)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

export const useIsDesktop = () => useMedia('(min-width: 768px)')
