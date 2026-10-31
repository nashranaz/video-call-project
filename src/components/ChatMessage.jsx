export default function ChatMessage({ message, mine }) {
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(message.timestamp))
  return (
    <article className={`message${mine ? ' mine' : ''}`}>
      <div className="message-meta">
        <span className="message-author">{mine ? 'You' : message.senderName}</span>
        <time dateTime={message.timestamp}>{time}</time>
      </div>
      <div className="message-bubble">{message.text}</div>
    </article>
  )
}
