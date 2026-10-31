import { Link } from 'react-router-dom'
import { Video } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="site-nav">
      <Link to="/" className="brand" aria-label="ConnectLive home">
        <span className="brand-mark"><Video size={19} /></span>
        <span>Connect<span style={{ color: '#ab96ff' }}>Live</span></span>
      </Link>
      <div className="nav-actions">
        <span className="nav-caption">Private calls. Real connection.</span>
        <a className="btn btn-outline" href="#features">How it works</a>
      </div>
    </nav>
  )
}
