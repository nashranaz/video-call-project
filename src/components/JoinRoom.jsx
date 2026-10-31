import { ArrowRight, Link2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function JoinRoom({ name }) {
  const [roomId, setRoomId] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const joinRoom = (event) => {
    event.preventDefault()
    const id = roomId.trim()
    if (!/^[a-zA-Z0-9_-]{4,80}$/.test(id)) {
      setError('Enter a valid room ID (4–80 letters, numbers, dashes, or underscores).')
      return
    }
    navigate(`/room/${encodeURIComponent(id)}?name=${encodeURIComponent(name.trim() || 'Guest')}`)
  }

  return (
    <form className="join-form" onSubmit={joinRoom}>
      <div className="join-box">
        <label className="room-field">
          <Link2 size={17} />
          <input value={roomId} onChange={(event) => { setRoomId(event.target.value); setError('') }} placeholder="Paste a room ID" aria-label="Room ID" />
        </label>
        <button className="btn btn-outline" type="submit">Join room <ArrowRight size={15} /></button>
      </div>
      {error && <span className="form-error">{error}</span>}
    </form>
  )
}
