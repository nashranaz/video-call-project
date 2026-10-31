import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ChatMessage from './ChatMessage.jsx'

export default function ChatSidebar({ messages, name, socketId, onSend, onClose, mobile = false }) {
  const [text, setText] = useState('')
  const listRef = useRef(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])
  const submit = (event) => {
    event.preventDefault()
    if (onSend(text)) setText('')
  }

  return (
    <aside className={`chat-panel${mobile ? ' mobile-chat-panel' : ''}`} aria-label="Room messages">
      <div className="chat-head">
        <div><div className="chat-head-title">Room messages</div><div className="chat-head-caption">Only people in this room can see messages</div></div>
        <button className="icon-button" onClick={onClose} aria-label="Close chat"><X size={17} /></button>
      </div>
      <div ref={listRef} className="chat-list" aria-live="polite">
        {messages.length
          ? messages.map((message) => <ChatMessage key={message.id} message={message} mine={message.senderId === socketId} />)
          : <div className="chat-empty"><div><MessageCircle size={22} style={{ margin: '0 auto 10px', opacity: .7 }} /><br />No messages yet.<br />Say hello to get things started.</div></div>}
      </div>
      <form className="chat-compose" onSubmit={submit}>
        <input className="chat-input" value={text} onChange={(event) => setText(event.target.value)} placeholder={`Message as ${name || 'Guest'}…`} aria-label="Type a message" maxLength={2000} />
        <button className="send-button" type="submit" aria-label="Send message" disabled={!text.trim()}><Send size={16} /></button>
      </form>
    </aside>
  )
}
