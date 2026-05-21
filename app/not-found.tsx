export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-4"
      style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 60%)' }}
    >
      <div className="text-6xl mb-4">🎮</div>
      <h1 className="text-3xl font-black mb-2">Game Not Found</h1>
      <p className="text-white/50 mb-8">This game link may have expired or never existed.</p>
      <a
        href="/"
        className="px-8 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-all"
      >
        Create a New Game
      </a>
    </div>
  )
}
