import { useEffect, useRef } from 'react'
import { MicOff, UserRound } from 'lucide-react'

export function LocalVideo({ stream, name, cameraEnabled, cameraAvailable, muted, mirror = true }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null
  }, [stream])

  return (
    <div className="local-video-wrap">
      {stream && cameraEnabled && cameraAvailable
        ? <video ref={videoRef} className="local-video" style={{ transform: mirror ? 'scaleX(-1)' : 'none' }} autoPlay playsInline muted aria-label="Your camera preview" />
        : <div className="local-empty"><UserRound size={25} /></div>}
      <span className="local-name">{muted && <MicOff size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />}{name || 'You'}</span>
    </div>
  )
}

export function RemoteVideo({ stream, name, connected, audioRef }) {
  const videoRef = useRef(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream || null
    if (audioRef) audioRef(videoRef.current)
  }, [audioRef, stream])

  return (
    <div className="remote-video-wrap">
      {stream
        ? <video ref={videoRef} className="remote-video" autoPlay playsInline aria-label={`${name || 'Participant'} video`} />
        : <div className="remote-empty"><span className="remote-avatar"><UserRound size={38} /></span><span>{connected ? 'Camera is off' : 'Waiting for someone to join'}</span></div>}
      {stream && <div className="remote-name"><span className="live-dot" />{name || 'Participant'}</div>}
    </div>
  )
}
