import { Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CreateRoom({ name }) {
  const navigate = useNavigate()
  const createRoom = () => {
    const roomId = crypto.randomUUID().replaceAll('-', '').slice(0, 12)
    navigate(`/room/${roomId}?name=${encodeURIComponent(name.trim() || 'Guest')}`)
  }
  return (
    <button className="btn btn-primary" type="button" onClick={createRoom}>
      <Video size={17} /> Start a video call
    </button>
  )
}
