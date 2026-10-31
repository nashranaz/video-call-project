export default function LoadingScreen({ message = 'Getting your call ready…' }) {
  return <main className="loading-screen"><div style={{ display: 'flex', alignItems: 'center', gap: 13 }}><span className="spinner" />{message}</div></main>
}
