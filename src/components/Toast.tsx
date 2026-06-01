import { useEffect } from 'react'

interface Props { message: string; onDone: () => void }

export default function Toast({ message, onDone }: Props) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return <div className="toast">{message}</div>
}
