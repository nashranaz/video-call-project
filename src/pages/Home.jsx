import { motion } from 'framer-motion'
import { AudioLines, LockKeyhole, MessageCircle, ShieldCheck, Sparkles, Video, Wifi } from 'lucide-react'
import { useState } from 'react'
import Navbar from '../components/Navbar.jsx'
import CreateRoom from '../components/CreateRoom.jsx'
import JoinRoom from '../components/JoinRoom.jsx'

function MeetingPreview() {
  return (
    <motion.div className="hero-visual" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .15 }}>
      <div className="visual-glow" />
      <div className="preview-card" aria-hidden="true">
        <div className="preview-top">
          <i className="window-dot" /><i className="window-dot" /><i className="window-dot" />
          <div className="preview-status"><span className="live-dot" /> Encrypted meeting</div>
        </div>
        <div className="preview-main">
          <div className="ambient-orb" />
          <div className="portrait-placeholder" />
          <div className="preview-label">A little more face time.</div>
        </div>
      </div>
      <div className="mini-preview"><div className="mini-avatar" /></div>
      <div className="hero-badge badge-top">
        <span className="badge-icon"><ShieldCheck size={17} /></span>
        <span>Private by design<span className="badge-muted">Peer-to-peer video</span></span>
      </div>
      <div className="hero-badge badge-bottom">
        <span className="badge-icon"><AudioLines size={17} /></span>
        <span>Crystal-clear calls<span className="badge-muted">Real-time audio & video</span></span>
      </div>
      <div className="call-card">
        <span className="call-dot"><Video size={17} /></span>
        <span className="call-dot"><AudioLines size={17} /></span>
        <span className="call-dot"><MessageCircle size={17} /></span>
        <span className="call-dot red"><Video size={16} /></span>
      </div>
    </motion.div>
  )
}

export default function Home() {
  const [name, setName] = useState('')
  return (
    <main className="home-page">
      <Navbar />
      <section className="hero-layout">
        <motion.div className="hero-copy" initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .65 }}>
          <span className="eyebrow"><span className="live-dot" /> A better way to be together</span>
          <h1 className="hero-title">Closer, even<br />when <span>you’re apart.</span></h1>
          <p className="hero-description">Simple, private video calls that bring your favorite people a little closer. No downloads, no fuss—just a link and a hello.</p>
          <label className="name-field">
            <Sparkles size={17} />
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="What should people call you?" aria-label="Your name" maxLength={40} />
          </label>
          <div className="home-actions"><CreateRoom name={name} /></div>
          <JoinRoom name={name} />
          <p className="hint"><LockKeyhole size={13} /> Your calls are peer-to-peer and private.</p>
        </motion.div>
        <MeetingPreview />
      </section>
      <section id="features" className="features-strip" aria-label="Call features">
        <span className="feature-item"><ShieldCheck size={16} /> Private by design</span>
        <span className="feature-item"><Wifi size={16} /> No downloads needed</span>
        <span className="feature-item"><Video size={16} /> One-on-one video</span>
        <span className="feature-item"><MessageCircle size={16} /> Room messaging</span>
      </section>
    </main>
  )
}
