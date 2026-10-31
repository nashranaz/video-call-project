# ConnectLive

ConnectLive is a responsive one-on-one video calling app built with React, Vite, WebRTC, Express, and Socket.IO. The browser sends audio/video peer-to-peer; Socket.IO is used for room membership, WebRTC signaling, and room-only chat.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A modern browser with WebRTC support

## Run locally

1. Install dependencies:

   ```sh
   npm install
   ```

2. Copy `.env.example` to `.env` and adjust values if needed.

3. Start the frontend and signaling server:

   ```sh
   npm run dev:all
   ```

4. Open the Vite URL printed in the terminal (normally `http://localhost:5173`). Create a room, then open its invitation link in a second browser profile/device and allow camera and microphone access.

Alternatively, run the processes in separate terminals with `npm run server` and `npm run dev`.

## Configuration

The signaling server listens on port `3001` by default. `VITE_SIGNALING_URL` can point the browser at a separately hosted signaling server; leave it unset for local development, where Vite proxies `/socket.io` and `/config` to `localhost:3001`.

The server serves ICE settings from `GET /config/ice`. STUN is configured by `STUN_URL`. For reliable connections across restrictive networks, set a TURN service:

```dotenv
TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
TURN_USERNAME=your-temporary-turn-username
TURN_CREDENTIAL=your-temporary-turn-credential
```

`CLIENT_ORIGIN` is a comma-separated allowlist of frontend origins for Socket.IO and ICE configuration requests. For example, set it to the deployed HTTPS origin in production. A direct frontend override is also supported through `VITE_ICE_SERVERS`, as a JSON array of standard `RTCIceServer` objects.

Camera/microphone and screen sharing require a secure context: use `localhost` during development and HTTPS in deployment. Users choose which screen/window/tab to share in the browser's native picker.

## Features

- Unique room links with a server-enforced two-participant limit.
- Peer-to-peer camera and microphone via WebRTC.
- Microphone mute, camera toggle, camera/microphone device selection, and camera switching.
- Screen sharing with restoration of the camera when sharing ends.
- Room-private real-time messages, sender names, timestamps, and unread badge.
- Room ID and invitation-link copy actions, fullscreen, and leave controls.
- Connection, permission, room-full, and signaling error states.

Rooms, participants, and messages are held in server memory and are not persisted. Deploy multiple signaling-server instances only with a shared room store and Socket.IO adapter; the included in-memory server is intended for local development or a single server instance.

## Verify

```sh
npm run build
npm run lint
```

Two real browser sessions, camera/microphone permissions, and a working network path are needed to manually verify a complete call. Screen sharing must be tested in a browser that supports `getDisplayMedia`. TURN configuration is required for some NAT/firewall combinations; the public STUN server alone cannot guarantee connectivity on every network.
