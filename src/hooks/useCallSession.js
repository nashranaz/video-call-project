import { useCallback, useEffect, useRef, useState } from 'react'
import { createSocket } from '../config/socket.js'
import { createPeerConnection } from '../utils/webrtc.js'

function getMediaMessage(error, mediaType) {
  if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
    return `${mediaType} permission was denied. You can still join the room.`
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return `No ${mediaType.toLowerCase()} device was found.`
  }
  return `Could not access your ${mediaType.toLowerCase()}: ${error?.message || 'Unknown error'}`
}

async function acquireMedia() {
  if (!window.RTCPeerConnection) {
    throw new Error('This browser does not support WebRTC video calling. Please use a modern browser.')
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera and microphone access requires a supported browser and a secure connection (HTTPS or localhost).')
  }

  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio: true, video: true }), notice: '' }
  } catch (bothError) {
    const notices = []
    let tracks = []
    for (const [kind, constraints] of [['video', { video: true }], ['audio', { audio: true }]]) {
      try {
        const partial = await navigator.mediaDevices.getUserMedia(constraints)
        tracks.push(...partial.getTracks())
      } catch (error) {
        notices.push(getMediaMessage(error, kind === 'video' ? 'Camera' : 'Microphone'))
      }
    }
    if (!tracks.length) {
      const notice = notices.length ? notices.join(' ') : getMediaMessage(bothError, 'Camera and microphone')
      return { stream: new MediaStream(), notice }
    }
    const partialStream = new MediaStream(tracks)
    return { stream: partialStream, notice: notices.join(' ') }
  }
}

export function useCallSession(roomId, participantName) {
  const [localStream, setLocalStream] = useState(null)
  const [localPreviewStream, setLocalPreviewStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [status, setStatus] = useState('Preparing your devices')
  const [connected, setConnected] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [sharingScreen, setSharingScreen] = useState(false)
  const [messages, setMessages] = useState([])
  const [participant, setParticipant] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [devices, setDevices] = useState({ audioinput: [], videoinput: [], audiooutput: [] })
  const [deviceIds, setDeviceIds] = useState({ audioinput: '', videoinput: '', audiooutput: '' })
  const [socketId, setSocketId] = useState('')
  const socketRef = useRef(null)
  const peerRef = useRef(null)
  const localRef = useRef(null)
  const screenTrackRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const cameraTrackRef = useRef(null)
  const joinedRef = useRef(false)
  const leavingRef = useRef(false)
  const offerPendingRef = useRef(false)

  const closePeer = useCallback(() => {
    peerRef.current?.close()
    peerRef.current = null
    setRemoteStream(null)
    setConnected(false)
  }, [])

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    const allDevices = await navigator.mediaDevices.enumerateDevices()
    const nextDevices = {
      audioinput: allDevices.filter((device) => device.kind === 'audioinput'),
      videoinput: allDevices.filter((device) => device.kind === 'videoinput'),
      audiooutput: allDevices.filter((device) => device.kind === 'audiooutput'),
    }
    setDevices(nextDevices)
    setDeviceIds((current) => ({
      audioinput: current.audioinput || nextDevices.audioinput[0]?.deviceId || '',
      videoinput: current.videoinput || nextDevices.videoinput[0]?.deviceId || '',
      audiooutput: current.audiooutput || nextDevices.audiooutput[0]?.deviceId || '',
    }))
  }, [])

  const createOffer = useCallback(async (targetId) => {
    const socket = socketRef.current
    const stream = localRef.current
    if (!socket || !stream || offerPendingRef.current) return
    offerPendingRef.current = true
    try {
      closePeer()
      const peer = await createPeerConnection()
      peerRef.current = peer
      pendingCandidatesRef.current = []
      stream.getTracks().forEach((track) => peer.addTrack(track, stream))
      peer.ontrack = (event) => {
        if (event.streams[0]) setRemoteStream(event.streams[0])
      }
      peer.onicecandidate = (event) => {
        if (event.candidate) socket.emit('ice-candidate', { roomId, to: targetId, candidate: event.candidate })
      }
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'connected') {
          setConnected(true)
          setStatus('Connected')
        } else if (peer.connectionState === 'failed') {
          setConnected(false)
          setStatus('Network connection failed')
          setNotice('The peer connection failed. Check your network or configure a TURN server.')
        } else if (peer.connectionState === 'connecting') {
          setStatus('Connecting')
        } else if (peer.connectionState === 'disconnected') {
          setConnected(false)
          setStatus('Connection interrupted')
        }
      }
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      socket.emit('offer', { roomId, to: targetId, offer })
      setStatus('Connecting')
    } catch (cause) {
      setError(cause.message || 'Could not start the video connection.')
    } finally {
      offerPendingRef.current = false
    }
  }, [closePeer, roomId])

  useEffect(() => {
    let disposed = false
    leavingRef.current = false
    const socket = createSocket()
    socketRef.current = socket

    const begin = async () => {
      try {
        const result = await acquireMedia()
        if (disposed) {
          result.stream.getTracks().forEach((track) => track.stop())
          return
        }
        localRef.current = result.stream
        cameraTrackRef.current = result.stream.getVideoTracks()[0] || null
        setLocalStream(result.stream)
        setLocalPreviewStream(result.stream)
        if (result.notice) setNotice(result.notice)
        socket.on('connect', () => {
          if (disposed || leavingRef.current) return
          setSocketId(socket.id)
          setError('')
          socket.emit('join-room', { roomId, name: participantName }, (response) => {
            if (!response?.ok) {
              setError(response?.error || 'Could not join this room.')
              setStatus(response?.error || 'Unable to join')
              return
            }
            joinedRef.current = true
            setStatus(response.participants?.length ? 'Connecting' : 'Waiting for another participant')
            setParticipant(response.participants?.[0]?.name || '')
            refreshDevices().catch((deviceError) => setNotice(deviceError.message))
          })
        })
        socket.on('user-joined', ({ name }) => {
          setParticipant(name)
          setStatus('Connecting')
        })
        socket.on('offer', async ({ from, offer }) => {
          try {
            closePeer()
            const peer = await createPeerConnection()
            peerRef.current = peer
            pendingCandidatesRef.current = []
            localRef.current?.getTracks().forEach((track) => peer.addTrack(track, localRef.current))
            peer.ontrack = (event) => {
              if (event.streams[0]) setRemoteStream(event.streams[0])
            }
            peer.onicecandidate = (event) => {
              if (event.candidate) socket.emit('ice-candidate', { roomId, to: from, candidate: event.candidate })
            }
            peer.onconnectionstatechange = () => {
              if (peer.connectionState === 'connected') {
                setConnected(true)
                setStatus('Connected')
              } else if (peer.connectionState === 'failed') {
                setConnected(false)
                setStatus('Network connection failed')
                setNotice('The peer connection failed. Check your network or configure a TURN server.')
              } else if (peer.connectionState === 'disconnected') {
                setConnected(false)
                setStatus('Connection interrupted')
              }
            }
            await peer.setRemoteDescription(offer)
            for (const candidate of pendingCandidatesRef.current) await peer.addIceCandidate(candidate)
            pendingCandidatesRef.current = []
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            socket.emit('answer', { roomId, to: from, answer })
            setStatus('Connecting')
          } catch (cause) {
            setError(cause.message || 'Could not accept the incoming call.')
          }
        })
        socket.on('answer', async ({ answer }) => {
          try {
            if (peerRef.current?.signalingState === 'have-local-offer') {
              await peerRef.current.setRemoteDescription(answer)
              for (const candidate of pendingCandidatesRef.current) await peerRef.current.addIceCandidate(candidate)
              pendingCandidatesRef.current = []
            }
          } catch (cause) {
            setError(cause.message || 'Could not complete the call setup.')
          }
        })
        socket.on('ice-candidate', async ({ candidate }) => {
          try {
            if (!peerRef.current?.remoteDescription) pendingCandidatesRef.current.push(candidate)
            else await peerRef.current.addIceCandidate(candidate)
          } catch (cause) {
            setNotice(`Network candidate could not be added: ${cause.message}`)
          }
        })
        socket.on('chat-message', (message) => setMessages((current) => [...current, message]))
        socket.on('user-left', ({ name }) => {
          setParticipant('')
          setStatus('Participant disconnected')
          setNotice(`${name || 'The participant'} left the room.`)
          closePeer()
        })
        socket.on('room-full', () => {
          setError('This room already has two participants.')
          setStatus('Room full')
        })
        socket.on('disconnect', () => {
          if (!leavingRef.current) {
            joinedRef.current = false
            setConnected(false)
            setStatus('Reconnecting to the room')
          }
        })
        socket.on('connect_error', (cause) => {
          setError(`Unable to reach the signaling server: ${cause.message}`)
          setStatus('Signaling connection failed')
        })
        socket.connect()

        socket.on('user-joined', ({ id }) => {
          setParticipant((current) => current || 'Participant')
          createOffer(id)
        })
      } catch (cause) {
        if (!disposed) {
          setError(cause.message || 'Could not initialize the call.')
          setStatus('Unable to start')
        }
      }
    }

    begin()
    return () => {
      disposed = true
      leavingRef.current = true
      socket.removeAllListeners()
      socket.disconnect()
      peerRef.current?.close()
      peerRef.current = null
      screenTrackRef.current?.stop()
      localRef.current?.getTracks().forEach((track) => track.stop())
      localRef.current = null
    }
  }, [closePeer, createOffer, participantName, refreshDevices, roomId])

  const toggleMicrophone = useCallback(() => {
    const tracks = localRef.current?.getAudioTracks() || []
    if (!tracks.length) {
      setNotice('No microphone is available. Check your browser permissions and audio devices.')
      return
    }
    const nextMuted = !muted
    tracks.forEach((track) => { track.enabled = !nextMuted })
    setMuted(nextMuted)
  }, [muted])

  const toggleCamera = useCallback(() => {
    const tracks = localRef.current?.getVideoTracks() || []
    if (!tracks.length) {
      setNotice('No camera is available. Check your browser permissions and video devices.')
      return
    }
    const nextEnabled = !cameraEnabled
    tracks.forEach((track) => { track.enabled = nextEnabled })
    setCameraEnabled(nextEnabled)
  }, [cameraEnabled])

  const restoreCameraAfterShare = useCallback(async () => {
    const cameraTrack = cameraTrackRef.current
    const peer = peerRef.current
    const sender = peer?.getSenders().find((item) => item.track?.kind === 'video')
    if (cameraTrack && sender) await sender.replaceTrack(cameraTrack)
    screenTrackRef.current?.stop()
    screenTrackRef.current = null
    setSharingScreen(false)
    setLocalPreviewStream(localRef.current)
  }, [])

  const toggleScreenShare = useCallback(async () => {
    if (sharingScreen) {
      await restoreCameraAfterShare()
      return
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setNotice('Screen sharing is not supported by this browser.')
      return
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const screenTrack = displayStream.getVideoTracks()[0]
      const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video')
      if (sender) await sender.replaceTrack(screenTrack)
      screenTrackRef.current = screenTrack
      setLocalPreviewStream(new MediaStream([screenTrack, ...(localRef.current?.getAudioTracks() || [])]))
      setSharingScreen(true)
      screenTrack.onended = () => { restoreCameraAfterShare().catch((cause) => setNotice(cause.message)) }
    } catch (cause) {
      if (cause.name !== 'NotAllowedError') setNotice(`Could not share your screen: ${cause.message}`)
    }
  }, [restoreCameraAfterShare, sharingScreen])

  const switchCamera = useCallback(async (deviceId) => {
    if (!navigator.mediaDevices?.getUserMedia) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } })
      const nextTrack = stream.getVideoTracks()[0]
      nextTrack.enabled = cameraEnabled
      const oldTrack = cameraTrackRef.current
      const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'video')
      if (sender) await sender.replaceTrack(nextTrack)
      const current = localRef.current
      if (current) {
        current.getVideoTracks().forEach((track) => {
          current.removeTrack(track)
          if (track !== oldTrack) track.stop()
        })
        current.addTrack(nextTrack)
      }
      if (oldTrack && oldTrack !== nextTrack) oldTrack.stop()
      cameraTrackRef.current = nextTrack
      setLocalStream(current)
      setLocalPreviewStream(current)
      setSharingScreen(false)
      screenTrackRef.current?.stop()
      screenTrackRef.current = null
      setDeviceIds((currentIds) => ({ ...currentIds, videoinput: deviceId }))
      await refreshDevices()
    } catch (cause) {
      setNotice(`Could not switch camera: ${cause.message}`)
    }
  }, [cameraEnabled, refreshDevices])

  const switchMicrophone = useCallback(async (deviceId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } })
      const nextTrack = stream.getAudioTracks()[0]
      nextTrack.enabled = !muted
      const current = localRef.current
      const sender = peerRef.current?.getSenders().find((item) => item.track?.kind === 'audio')
      if (sender) await sender.replaceTrack(nextTrack)
      current?.getAudioTracks().forEach((track) => {
        current.removeTrack(track)
        track.stop()
      })
      current?.addTrack(nextTrack)
      setLocalStream(current)
      setLocalPreviewStream(current)
      setDeviceIds((currentIds) => ({ ...currentIds, audioinput: deviceId }))
      await refreshDevices()
    } catch (cause) {
      setNotice(`Could not switch microphone: ${cause.message}`)
    }
  }, [muted, refreshDevices])

  const sendMessage = useCallback((text) => {
    const trimmed = text.trim()
    if (!trimmed || !joinedRef.current || !socketRef.current?.connected) return false
    socketRef.current.emit('chat-message', { roomId, text: trimmed })
    return true
  }, [roomId])

  const leaveCall = useCallback(() => {
    leavingRef.current = true
    if (joinedRef.current) socketRef.current?.emit('leave-room', { roomId })
    joinedRef.current = false
    socketRef.current?.disconnect()
    peerRef.current?.close()
    peerRef.current = null
    screenTrackRef.current?.stop()
    localRef.current?.getTracks().forEach((track) => track.stop())
  }, [roomId])

  return {
    localStream, localPreviewStream, remoteStream, status, connected, muted, cameraEnabled, socketId,
    sharingScreen, messages, participant, notice, error, devices, deviceIds,
    toggleMicrophone, toggleCamera, toggleScreenShare, switchCamera, switchMicrophone,
    sendMessage, leaveCall, setNotice, setDeviceIds,
  }
}
