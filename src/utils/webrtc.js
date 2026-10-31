export async function getIceServers() {
  const configured = import.meta.env.VITE_ICE_SERVERS
  if (configured) {
    try {
      const servers = JSON.parse(configured)
      if (!Array.isArray(servers) || servers.length === 0) {
        throw new Error('VITE_ICE_SERVERS must be a non-empty JSON array.')
      }
      return servers
    } catch (error) {
      throw new Error(`Unable to parse VITE_ICE_SERVERS: ${error.message}`)
    }
  }

  const configUrl = new URL('/config/ice', import.meta.env.VITE_SIGNALING_URL || window.location.origin)
  const response = await fetch(configUrl)
  if (!response.ok) throw new Error(`The signaling server could not provide ICE configuration (${response.status}).`)
  const config = await response.json()
  if (!Array.isArray(config.iceServers) || config.iceServers.length === 0) {
    throw new Error('The signaling server returned no ICE servers.')
  }
  return config.iceServers
}

export async function createPeerConnection() {
  if (!window.RTCPeerConnection) {
    throw new Error('This browser does not support WebRTC video calling.')
  }
  return new RTCPeerConnection({ iceServers: await getIceServers() })
}
