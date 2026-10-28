import { useEffect, useState } from 'react'

// Two-step confirm without window.confirm (which desktop webviews may not show):
// the first tap arms the action for a few seconds, the second carries it out.
export function useArm(ms = 3000) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), ms)
    return () => clearTimeout(t)
  }, [armed, ms])
  return [armed, () => setArmed(true), () => setArmed(false)]
}
