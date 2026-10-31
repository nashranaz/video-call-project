import { AlertCircle } from 'lucide-react'

export default function ErrorMessage({ message, onDismiss }) {
  if (!message) return null
  return <div className="toast-stack call-notice-stack" role="status"><div className="toast error"><AlertCircle size={15} style={{ verticalAlign: 'middle', marginRight: 8 }} />{message}<button className="toast-dismiss" onClick={onDismiss} aria-label="Dismiss message">×</button></div></div>
}
