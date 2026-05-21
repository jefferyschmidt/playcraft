'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import type {
  Game, GameType, GameCard, TruthOrDareCard, WouldYouRatherCard,
  NeverHaveIEverCard, TriviaCard, HotTakeCard, MostLikelyToCard, CardsAgainstCard, SharedGameState,
} from '@/lib/types'

/* ─────────────────────────── Types ─────────────────────────── */

interface PlayerStats {
  truths: number; dares: number; chickens: number
  correct: number; incorrect: number
  haveCount: number
  agrees: number; disagrees: number; wilds: number
  votesReceived: number
}
const emptyStats = (): PlayerStats => ({
  truths: 0, dares: 0, chickens: 0, correct: 0, incorrect: 0,
  haveCount: 0, agrees: 0, disagrees: 0, wilds: 0, votesReceived: 0,
})
const bumpStat = (
  prev: Record<string, PlayerStats>, player: string,
  key: keyof PlayerStats, by = 1
): Record<string, PlayerStats> => ({
  ...prev,
  [player]: { ...(prev[player] ?? emptyStats()), [key]: (prev[player]?.[key] ?? 0) + by },
})

/* ─────────────────────────── Themes ─────────────────────────── */

const THEMES: Record<GameType, { gradient: string; accent: string; bg: string; cardBg: string }> = {
  'truth-or-dare': { gradient: 'from-violet-600 to-purple-700', accent: '#a855f7', bg: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 60%)', cardBg: 'rgba(139,92,246,0.08)' },
  'would-you-rather': { gradient: 'from-blue-600 to-cyan-600', accent: '#38bdf8', bg: 'radial-gradient(ellipse at top, #0a1a2e 0%, #0a0a14 60%)', cardBg: 'rgba(56,189,248,0.08)' },
  'never-have-i-ever': { gradient: 'from-emerald-600 to-teal-600', accent: '#34d399', bg: 'radial-gradient(ellipse at top, #0a1f1a 0%, #0a0a14 60%)', cardBg: 'rgba(52,211,153,0.08)' },
  trivia: { gradient: 'from-amber-500 to-orange-600', accent: '#f59e0b', bg: 'radial-gradient(ellipse at top, #1f150a 0%, #0a0a14 60%)', cardBg: 'rgba(245,158,11,0.08)' },
  'hot-takes': { gradient: 'from-red-600 to-rose-600', accent: '#f43f5e', bg: 'radial-gradient(ellipse at top, #2e0a0a 0%, #0a0a14 60%)', cardBg: 'rgba(244,63,94,0.08)' },
  'most-likely-to': { gradient: 'from-pink-600 to-fuchsia-600', accent: '#e879f9', bg: 'radial-gradient(ellipse at top, #2e0a2e 0%, #0a0a14 60%)', cardBg: 'rgba(232,121,249,0.08)' },
  'cards-against': { gradient: 'from-zinc-700 to-zinc-900', accent: '#ffffff', bg: '#0a0a0a', cardBg: 'rgba(255,255,255,0.05)' },
}
const LABELS: Record<GameType, string> = {
  'truth-or-dare': 'Truth or Dare', 'would-you-rather': 'Would You Rather',
  'never-have-i-ever': 'Never Have I Ever', trivia: 'Trivia',
  'hot-takes': 'Hot Takes', 'most-likely-to': 'Most Likely To', 'cards-against': 'Cards Against…',
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}

/* ─────────────────────────── Confetti ─────────────────────────── */

function Confetti() {
  const COLORS = ['#ff2d78', '#a855f7', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#fb923c', '#60a5fa', '#e879f9']
  const pieces = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 3.5,
    duration: 2.5 + Math.random() * 2.5, color: COLORS[i % COLORS.length],
    w: 6 + Math.random() * 10, h: 4 + Math.random() * 9, circle: Math.random() > 0.55,
    spin: 360 + Math.floor(Math.random() * 720),
  })), [])
  return (
    <>
      <style>{`@keyframes cfall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}85%{opacity:.9}100%{transform:translateY(108vh) rotate(var(--spin,720deg));opacity:0}}`}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {pieces.map(p => (
          <div key={p.id} style={{
            position: 'absolute', left: `${p.left}%`, top: '-20px',
            width: p.w, height: p.h, background: p.color,
            borderRadius: p.circle ? '50%' : '2px',
            ['--spin' as string]: `${p.spin}deg`,
            animation: `cfall ${p.duration}s ${p.delay}s ease-in forwards`,
          }} />
        ))}
      </div>
    </>
  )
}

/* ─────────────────────────── Podium ─────────────────────────── */

function Podium({ players, scores, titles }: { players: string[]; scores: Record<string, number>; titles?: Record<string, string> }) {
  if (players.length === 0) return null
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
  const podium = [
    sorted[1] ? { p: sorted[1], place: 2, h: 'h-20', medal: '🥈', bg: 'linear-gradient(135deg,#94a3b8,#64748b)' } : null,
    sorted[0] ? { p: sorted[0], place: 1, h: 'h-28', medal: '🥇', bg: 'linear-gradient(135deg,#fbbf24,#d97706)' } : null,
    sorted[2] ? { p: sorted[2], place: 3, h: 'h-14', medal: '🥉', bg: 'linear-gradient(135deg,#b45309,#92400e)' } : null,
  ].filter(Boolean) as { p: string; place: number; h: string; medal: string; bg: string }[]

  return (
    <div className="flex items-end justify-center gap-3 mb-8 mt-2">
      {podium.map(({ p, h, medal, bg }) => (
        <div key={p} className="flex flex-col items-center gap-1">
          <div className="text-xl">{medal}</div>
          <div className="text-xs font-bold text-center max-w-[70px] truncate">{p}</div>
          <div className="text-xs text-white/40">{scores[p] ?? 0} pts</div>
          {titles?.[p] && <div className="text-xs text-white/50 italic text-center max-w-[80px]">{titles[p]}</div>}
          <div className={`w-16 ${h} rounded-t-xl flex items-end justify-center pb-2`} style={{ background: bg }}>
            <span className="text-lg font-black">{podium.find(x => x.p === p)?.place}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── Hearts (lives) ─────────────────────────── */

function Hearts({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-sm transition-all ${i < count ? 'grayscale-0' : 'grayscale opacity-30'}`}>
          {i < count ? '❤️' : '🖤'}
        </span>
      ))}
    </span>
  )
}

/* ─────────────────────────── Stat row ─────────────────────────── */

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
      <span className="text-white/50">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

/* ─────────────────────────── Titles per game ─────────────────────────── */

function getTitles(type: GameType, players: string[], scores: Record<string, number>, stats: Record<string, PlayerStats>): Record<string, string> {
  if (!players.length) return {}
  const top = (key: keyof PlayerStats) => players.reduce((best, p) => (stats[p]?.[key] ?? 0) > (stats[best]?.[key] ?? 0) ? p : best, players[0])
  const bot = (key: keyof PlayerStats) => players.reduce((worst, p) => (stats[p]?.[key] ?? 0) < (stats[worst]?.[key] ?? 0) ? p : worst, players[0])
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
  const result: Record<string, string> = {}

  switch (type) {
    case 'truth-or-dare':
      players.forEach(p => {
        const s = stats[p] ?? emptyStats()
        if (s.chickens > 0 && p === top('chickens')) result[p] = '🐔 The Chicken'
        else if (s.dares > 0 && p === top('dares')) result[p] = '😈 Dare Devil'
        else if (p === sorted[0]) result[p] = '🏆 Champion'
        else result[p] = '📖 Truth Teller'
      })
      break
    case 'trivia':
      players.forEach((p, _i) => {
        const rank = sorted.indexOf(p)
        result[p] = rank === 0 ? '🧠 The Brain' : rank === 1 ? '📚 Smart Cookie' : rank === 2 ? '🎓 Studying Hard' : '💻 Just Google It'
      })
      break
    case 'never-have-i-ever':
      players.forEach(p => {
        const innocent = p === bot('haveCount')
        const worldly = p === top('haveCount')
        result[p] = innocent ? '😇 Pure Soul' : worldly ? '🌍 Most Worldly' : '🤷 Average Human'
      })
      break
    case 'most-likely-to':
      players.forEach(p => {
        const v = stats[p]?.votesReceived ?? 0
        const rank = sorted.indexOf(p)
        result[p] = rank === 0 ? '👑 Life of the Party' : v === 0 ? '🦄 The Mystery' : '🎭 The Usual Suspect'
      })
      break
    case 'hot-takes':
      players.forEach(p => {
        const s = stats[p] ?? emptyStats()
        const total = s.agrees + s.disagrees + s.wilds
        if (total === 0) { result[p] = '🤐 Silent Type'; return }
        const disagreeRatio = s.disagrees / total
        result[p] = disagreeRatio > 0.6 ? '🔥 The Agitator' : s.agrees / total > 0.6 ? '💯 Most Mainstream' : '⚖️ The Moderate'
      })
      break
    case 'would-you-rather':
      players.forEach((p, i) => { result[p] = i === 0 ? '🤔 The Decisive One' : '😵 The Indecisive' })
      break
    case 'cards-against':
      players.forEach(p => {
        const rank = sorted.indexOf(p)
        result[p] = rank === 0 ? '👑 Card Master' : rank === 1 ? '🃏 Card Shark' : '😂 Comedic Relief'
      })
      break
  }
  return result
}

/* ─────────────────────────── End Screen ─────────────────────────── */

interface EndScreenProps {
  game: Game
  scores: Record<string, number>
  stats: Record<string, PlayerStats>
  lives?: Record<string, number>
  groupStats?: Record<string, unknown>
  onPlayAgain: () => void
}

function EndScreen({ game, scores, stats, groupStats, onPlayAgain }: EndScreenProps) {
  const [copied, setCopied] = useState(false)
  const players = game.config.players.filter(p => p.trim())
  const theme = THEMES[game.config.type]
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))
  const winner = sorted[0]
  const titles = getTitles(game.config.type, players, scores, stats)
  const hasScores = players.some(p => (scores[p] ?? 0) > 0)
  const isGroupGame = game.config.type === 'would-you-rather' || game.config.type === 'hot-takes'

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden" style={{ background: theme.bg }}>
      <Confetti />
      <div className="relative z-10 w-full max-w-sm animate-slideUp text-center">

        {/* Win headline */}
        {isGroupGame ? (
          <>
            <div className="text-6xl mb-3">🎉</div>
            <h2 className="text-3xl font-black mb-1 gradient-text">That's a Wrap!</h2>
            <p className="text-white/50 mb-6">{game.cards.length} cards of {LABELS[game.config.type]}</p>
          </>
        ) : winner ? (
          <>
            <div className="text-6xl mb-2 animate-bounce">🏆</div>
            <p className="text-white/50 text-sm uppercase tracking-widest mb-1">Winner</p>
            <h2 className="text-4xl font-black mb-1" style={{ color: theme.accent }}>{winner}</h2>
            {titles[winner] && <p className="text-white/60 mb-2 text-lg">{titles[winner]}</p>}
            {hasScores && <p className="text-white/40 text-sm mb-6">{scores[winner] ?? 0} points</p>}
          </>
        ) : (
          <>
            <div className="text-6xl mb-3">🎉</div>
            <h2 className="text-3xl font-black mb-1 gradient-text">Game Over!</h2>
            <p className="text-white/50 mb-6">{LABELS[game.config.type]} · {game.cards.length} cards</p>
          </>
        )}

        {/* Podium */}
        {hasScores && players.length >= 2 && !isGroupGame && (
          <Podium players={players} scores={scores} titles={titles} />
        )}

        {/* All players with titles when no scoring */}
        {!hasScores && players.length > 0 && !isGroupGame && (
          <div className="glass rounded-2xl p-4 mb-6 space-y-1 text-left">
            {players.map(p => (
              <div key={p} className="flex justify-between items-center py-1">
                <span className="font-semibold">{p}</span>
                <span className="text-sm text-white/50">{titles[p]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Per-game stats */}
        <GameEndStats type={game.config.type} players={players} scores={scores} stats={stats} groupStats={groupStats} titles={titles} />

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-6">
          <button onClick={onPlayAgain}
            className={`w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-all shadow-lg`}>
            Play Again 🔄
          </button>
          <button onClick={copyLink}
            className="w-full py-3 rounded-2xl glass border border-white/20 text-sm font-semibold hover:bg-white/10 transition-colors">
            {copied ? '✓ Link Copied!' : '🔗 Share This Game'}
          </button>
          <a href="/" className="w-full py-3 rounded-2xl text-center text-white/30 hover:text-white/60 text-sm transition-colors">
            Create a New Game
          </a>
        </div>
      </div>
    </div>
  )
}

/* Per-game end stats */
function GameEndStats({ type, players, scores, stats, groupStats, titles }: {
  type: GameType; players: string[]; scores: Record<string, number>;
  stats: Record<string, PlayerStats>; groupStats?: Record<string, unknown>; titles: Record<string, string>
}) {
  if (!players.length && !groupStats) return null

  switch (type) {
    case 'truth-or-dare':
      return (
        <div className="glass rounded-2xl p-4 mb-2 text-left">
          <h3 className="font-bold mb-3 text-center text-sm uppercase tracking-widest text-white/40">Stats</h3>
          {players.map(p => {
            const s = stats[p] ?? emptyStats()
            return (
              <div key={p} className="mb-3 last:mb-0">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-sm">{p}</span>
                  <span className="text-xs text-white/40">{titles[p]}</span>
                </div>
                <div className="flex gap-3 text-xs text-white/50">
                  <span>📖 {s.truths} truths</span>
                  <span>😈 {s.dares} dares</span>
                  {s.chickens > 0 && <span>🐔 {s.chickens}× chicken</span>}
                </div>
              </div>
            )
          })}
        </div>
      )

    case 'never-have-i-ever':
      return (
        <div className="glass rounded-2xl p-4 mb-2 text-left">
          <h3 className="font-bold mb-3 text-center text-sm uppercase tracking-widest text-white/40">Purity Rankings</h3>
          {[...players].sort((a, b) => (scores[b] ?? 100) - (scores[a] ?? 100)).map((p, i) => (
            <div key={p} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-base">{i === 0 ? '😇' : i === players.length - 1 ? '🌍' : '🤷'}</span>
                <span className="font-semibold text-sm">{p}</span>
              </div>
              <div className="text-right">
                <span className="text-emerald-400 font-bold text-sm">{scores[p] ?? 100}% pure</span>
                <div className="text-xs text-white/30">{stats[p]?.haveCount ?? 0} confessions</div>
              </div>
            </div>
          ))}
        </div>
      )

    case 'trivia':
      return (
        <div className="glass rounded-2xl p-4 mb-2 text-left">
          <h3 className="font-bold mb-3 text-center text-sm uppercase tracking-widest text-white/40">Final Scoreboard</h3>
          {[...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)).map((p, i) => {
            const s = stats[p] ?? emptyStats()
            const total = s.correct + s.incorrect
            const pct = total > 0 ? Math.round((s.correct / total) * 100) : 0
            return (
              <div key={p} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '}</span>
                  <span className="font-semibold text-sm">{p}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-amber-400">{scores[p] ?? 0} pts</span>
                  <div className="text-xs text-white/30">{pct}% correct</div>
                </div>
              </div>
            )
          })}
        </div>
      )

    case 'hot-takes': {
      if (!players.length) return null
      const mostAgreeable = [...players].sort((a, b) => (stats[b]?.agrees ?? 0) - (stats[a]?.agrees ?? 0))[0]
      const mostControversial = [...players].sort((a, b) => (stats[b]?.disagrees ?? 0) - (stats[a]?.disagrees ?? 0))[0]
      return (
        <div className="glass rounded-2xl p-4 mb-2 text-left">
          <h3 className="font-bold mb-3 text-center text-sm uppercase tracking-widest text-white/40">Awards</h3>
          {mostAgreeable && <StatRow label="💯 Most Mainstream" value={mostAgreeable} />}
          {mostControversial && mostControversial !== mostAgreeable && <StatRow label="🔥 Most Contrarian" value={mostControversial} />}
          {players.map(p => {
            const s = stats[p] ?? emptyStats()
            return (
              <div key={p} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                <span className="text-white/50">{p}</span>
                <span className="text-xs text-white/30">{s.agrees}✓ {s.disagrees}✗ {s.wilds}🤯</span>
              </div>
            )
          })}
        </div>
      )
    }

    case 'would-you-rather': {
      const gStats = groupStats as Record<string, { a: number; b: number; labelA: string; labelB: string }> | undefined
      if (!gStats) return null
      const rounds = Object.values(gStats)
      if (!rounds.length) return null
      const divisive = rounds.reduce((best, r) => {
        const diff = Math.abs((r.a) - (r.b))
        const bDiff = Math.abs((best.a) - (best.b))
        return diff < bDiff ? r : best
      })
      const decisive = rounds.reduce((best, r) => {
        const diff = Math.abs((r.a) - (r.b))
        const bDiff = Math.abs((best.a) - (best.b))
        return diff > bDiff ? r : best
      })
      return (
        <div className="glass rounded-2xl p-4 mb-2 text-left">
          <h3 className="font-bold mb-3 text-center text-sm uppercase tracking-widest text-white/40">Group Verdicts</h3>
          <div className="mb-2">
            <p className="text-xs text-white/40 mb-1">🔥 Most Divisive</p>
            <p className="text-sm font-medium text-white/80">{divisive.labelA} vs {divisive.labelB}</p>
            <p className="text-xs text-white/30">{divisive.a} vs {divisive.b}</p>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-1">💥 Most One-Sided</p>
            <p className="text-sm font-medium text-white/80">{decisive.labelA} vs {decisive.labelB}</p>
            <p className="text-xs text-white/30">{decisive.a} vs {decisive.b}</p>
          </div>
        </div>
      )
    }

    case 'most-likely-to':
      return (
        <div className="glass rounded-2xl p-4 mb-2 text-left">
          <h3 className="font-bold mb-3 text-center text-sm uppercase tracking-widest text-white/40">Vote Tally</h3>
          {[...players].sort((a, b) => (stats[b]?.votesReceived ?? 0) - (stats[a]?.votesReceived ?? 0)).map(p => (
            <div key={p} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
              <span className="font-semibold text-sm">{p}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 rounded-full bg-white/10 w-16 overflow-hidden">
                  <div className="h-full rounded-full bg-fuchsia-500 transition-all"
                    style={{ width: `${Math.min(100, (stats[p]?.votesReceived ?? 0) * 10)}%` }} />
                </div>
                <span className="text-fuchsia-400 font-bold text-sm w-6">{stats[p]?.votesReceived ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )

    default: return null
  }
}

/* ─────────────────────────── Router ─────────────────────────── */

export default function GamePlayer({ game }: { game: Game }) {
  if (game.config.multiplayerMode === 'individual') {
    return game.config.type === 'cards-against'
      ? <IndividualCardsAgainstGame game={game} />
      : <IndividualStandardGame game={game} />
  }
  return game.config.type === 'cards-against'
    ? <CardsAgainstGame game={game} />
    : <StandardGame game={game} />
}

/* ─────────────────────────── Standard Game ─────────────────────────── */

function StandardGame({ game }: { game: Game }) {
  const players = game.config.players.filter(p => p.trim())
  const hasPlayers = players.length > 0

  const [cardIndex, setCardIndex] = useState(0)
  const [playerIndex, setPlayerIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [triviaChoice, setTriviaChoice] = useState<number | null>(null)
  const [scores, setScores] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map(p => [p, game.config.type === 'never-have-i-ever' ? 100 : 0]))
  )
  const [lives, setLives] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map(p => [p, 3]))
  )
  const [stats, setStats] = useState<Record<string, PlayerStats>>(() =>
    Object.fromEntries(players.map(p => [p, emptyStats()]))
  )
  // For Would You Rather: track per-card group vote for end-screen stats
  const [wyrGroupStats, setWyrGroupStats] = useState<Record<string, { a: number; b: number; labelA: string; labelB: string }>>({})

  const theme = THEMES[game.config.type]

  const filteredCards = useMemo(() => {
    const f = game.config.cardFilter
    if (game.config.type !== 'truth-or-dare' || !f || f === 'both') return game.cards
    const kind = f === 'truths-only' ? 'truth' : 'dare'
    return game.cards.filter(c => 'kind' in c ? (c as { kind: string }).kind === kind : true)
  }, [game.cards, game.config.type, game.config.cardFilter])

  const currentPlayer = hasPlayers ? players[playerIndex % players.length] : null
  const card = filteredCards[cardIndex]
  const progress = ((cardIndex + 1) / filteredCards.length) * 100

  function advance() {
    if (cardIndex + 1 >= filteredCards.length) { setDone(true); return }
    setCardIndex(i => i + 1)
    setPlayerIndex(i => i + 1)
    setRevealed(false)
    setVotes({})
    setTriviaChoice(null)
  }

  function resetGame() {
    setCardIndex(0); setPlayerIndex(0); setDone(false); setRevealed(false)
    setVotes({}); setTriviaChoice(null); setWyrGroupStats({})
    setScores(Object.fromEntries(players.map(p => [p, game.config.type === 'never-have-i-ever' ? 100 : 0])))
    setLives(Object.fromEntries(players.map(p => [p, 3])))
    setStats(Object.fromEntries(players.map(p => [p, emptyStats()])))
  }

  /* T&D callbacks */
  function onToDDone(points: number, kind: 'truth' | 'dare') {
    if (currentPlayer) {
      setScores(s => ({ ...s, [currentPlayer]: (s[currentPlayer] ?? 0) + points }))
      setStats(s => bumpStat(s, currentPlayer, kind === 'dare' ? 'dares' : 'truths'))
    }
    advance()
  }
  function onToDChicken() {
    if (currentPlayer) {
      setLives(l => ({ ...l, [currentPlayer]: Math.max(0, (l[currentPlayer] ?? 3) - 1) }))
      setStats(s => bumpStat(s, currentPlayer, 'chickens'))
    }
    advance()
  }

  /* Trivia callback */
  function onTriviaAnswer(i: number) {
    setTriviaChoice(i)
    const tc = card as TriviaCard
    const correct = i === tc.answerIndex
    if (currentPlayer) {
      if (correct) setScores(s => ({ ...s, [currentPlayer]: (s[currentPlayer] ?? 0) + 1 }))
      setStats(s => bumpStat(s, currentPlayer, correct ? 'correct' : 'incorrect'))
    }
  }

  /* Never Have I Ever callback */
  function onNHIEHave(player: string) {
    setVotes(v => ({ ...v, [player]: (v[player] ?? 0) + 1 }))
    setScores(s => ({ ...s, [player]: Math.max(0, (s[player] ?? 100) - 10) }))
    setStats(s => bumpStat(s, player, 'haveCount'))
  }

  /* Hot Takes callback */
  function onHotTakeReact(player: string, reaction: 'agrees' | 'disagrees' | 'wilds') {
    setVotes(v => ({ ...v, [reaction]: (v[reaction] ?? 0) + 1 }))
    setStats(s => bumpStat(s, player, reaction))
  }

  /* Most Likely To callback */
  function onMLTVote(votedFor: string) {
    setVotes(v => ({ ...v, [votedFor]: (v[votedFor] ?? 0) + 1 }))
    setStats(s => bumpStat(s, votedFor, 'votesReceived'))
    // award a point to the most-voted player each round
    const newVotes = { ...votes, [votedFor]: (votes[votedFor] ?? 0) + 1 }
    const top = Object.entries(newVotes).sort(([, a], [, b]) => b - a)[0]?.[0]
    if (top) setScores(s => ({ ...s, [top]: (s[top] ?? 0) + 1 }))
  }

  /* Would You Rather: capture group stat per card then advance */
  function onWyrAdvance(cardVotes: Record<string, number>, wyrCard: WouldYouRatherCard) {
    setWyrGroupStats(g => ({
      ...g,
      [wyrCard.id]: { a: cardVotes['a'] ?? 0, b: cardVotes['b'] ?? 0, labelA: wyrCard.optionA.slice(0, 30), labelB: wyrCard.optionB.slice(0, 30) },
    }))
    advance()
  }

  if (done) {
    return (
      <EndScreen
        game={game} scores={scores} stats={stats} lives={lives}
        groupStats={game.config.type === 'would-you-rather' ? wyrGroupStats : undefined}
        onPlayAgain={resetGame}
      />
    )
  }

  /* ── In-game header ── */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 glass">
        <a href="/" className="text-lg font-black gradient-text">PlayCraft</a>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{cardIndex + 1}/{filteredCards.length}</span>
          <span className="text-xs text-white/40 hidden sm:block">{LABELS[game.config.type]}</span>
        </div>
      </header>

      {/* Progress */}
      <div className="h-1 bg-white/10">
        <div className={`h-1 bg-gradient-to-r ${theme.gradient} transition-all duration-500`} style={{ width: `${progress}%` }} />
      </div>

      {/* Player bar */}
      {hasPlayers && currentPlayer && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Turn:</span>
            <span className="font-bold text-sm" style={{ color: theme.accent }}>{currentPlayer}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Running score */}
            {(game.config.type === 'trivia' || game.config.type === 'truth-or-dare') && (
              <span className="text-xs text-white/40">{scores[currentPlayer] ?? 0} pts</span>
            )}
            {/* Lives for T&D */}
            {game.config.type === 'truth-or-dare' && (
              <Hearts count={lives[currentPlayer] ?? 3} />
            )}
            {/* Purity for NHIE */}
            {game.config.type === 'never-have-i-ever' && (
              <span className="text-xs text-emerald-400 font-bold">{scores[currentPlayer] ?? 100}% pure</span>
            )}
          </div>
        </div>
      )}

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg" key={cardIndex} style={{ animation: 'slideInCard 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <style>{`@keyframes slideInCard{from{transform:translateX(40px) scale(0.97);opacity:0}to{transform:none;opacity:1}}`}</style>
          <CardRenderer
            card={card} gameType={game.config.type} theme={theme}
            revealed={revealed} onReveal={() => setRevealed(true)}
            votes={votes} onVote={key => setVotes(v => ({ ...v, [key]: (v[key] ?? 0) + 1 }))}
            triviaChoice={triviaChoice} onTriviaChoice={onTriviaAnswer}
            players={players} currentPlayer={currentPlayer}
            onToDDone={onToDDone} onToDChicken={onToDChicken}
            onNHIEHave={onNHIEHave}
            onHotTakeReact={onHotTakeReact}
            onMLTVote={onMLTVote}
            scores={scores}
          />
        </div>
      </div>

      {/* Bottom nav — hidden for T&D (uses its own buttons) */}
      {game.config.type !== 'truth-or-dare' && (
        <div className="px-4 pb-6 pt-2 flex gap-3 max-w-lg mx-auto w-full">
          {cardIndex > 0 && (
            <button
              onClick={() => { setCardIndex(i => i - 1); setPlayerIndex(i => Math.max(0, i - 1)); setRevealed(false); setVotes({}); setTriviaChoice(null) }}
              className="flex-1 py-3.5 rounded-2xl glass border border-white/20 font-semibold text-white/60 hover:text-white transition-colors text-sm"
            >← Prev</button>
          )}
          {game.config.type === 'would-you-rather' ? (
            <button
              onClick={() => onWyrAdvance(votes, card as WouldYouRatherCard)}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-all`}
            >{cardIndex + 1 >= filteredCards.length ? 'See Results 🏁' : 'Next →'}</button>
          ) : (
            <button
              onClick={advance}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-all`}
            >{cardIndex + 1 >= filteredCards.length ? 'Finish 🏁' : 'Next Card →'}</button>
          )}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── Card renderer ─────────────────────────── */

interface CardRendererProps {
  card: GameCard; gameType: GameType
  theme: { gradient: string; accent: string; bg: string; cardBg: string }
  revealed: boolean; onReveal: () => void
  votes: Record<string, number>; onVote: (key: string) => void
  triviaChoice: number | null; onTriviaChoice: (i: number) => void
  players: string[]; currentPlayer: string | null
  onToDDone: (pts: number, kind: 'truth' | 'dare') => void
  onToDChicken: () => void
  onNHIEHave: (player: string) => void
  onHotTakeReact: (player: string, r: 'agrees' | 'disagrees' | 'wilds') => void
  onMLTVote: (p: string) => void
  scores: Record<string, number>
}

function CardRenderer(props: CardRendererProps) {
  switch (props.gameType) {
    case 'truth-or-dare': return <TruthOrDareCard {...props} card={props.card as TruthOrDareCard} />
    case 'would-you-rather': return <WouldYouRatherCard {...props} card={props.card as WouldYouRatherCard} />
    case 'never-have-i-ever': return <NeverHaveIEverCard {...props} card={props.card as NeverHaveIEverCard} />
    case 'trivia': return <TriviaCard {...props} card={props.card as TriviaCard} />
    case 'hot-takes': return <HotTakesCard {...props} card={props.card as HotTakeCard} />
    case 'most-likely-to': return <MostLikelyToCard {...props} card={props.card as MostLikelyToCard} />
    default: return null
  }
}

/* ─────────── Truth or Dare ─────────── */

const ANTE_OPTIONS = [
  { val: 1 as const, emoji: '🛡️', label: 'Safe', sub: '+1 pt' },
  { val: 2 as const, emoji: '⚡', label: 'Bold', sub: '+2 pts' },
  { val: 3 as const, emoji: '🔥', label: 'Wild', sub: '+3 pts' },
]

function TruthOrDareCard({ card, theme, revealed, onReveal, onToDDone, onToDChicken, currentPlayer, players, scores }: CardRendererProps & { card: TruthOrDareCard }) {
  const [ante, setAnte] = useState<1 | 2 | 3 | null>(null)
  const isTruth = card.kind === 'truth'
  const color = isTruth ? '#a78bfa' : '#f87171'
  const earnedPts = ante ?? (isTruth ? 1 : 2)

  if (!revealed) {
    return (
      <div className="glass rounded-3xl p-7 text-center" style={{ background: `rgba(${isTruth ? '139,92,246' : '248,113,113'},0.08)` }}>
        <div className="text-5xl mb-3">{isTruth ? '🤫' : '😈'}</div>
        <div className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4"
          style={{ background: `${color}25`, color }}>
          {isTruth ? 'Truth' : 'Dare'}
        </div>
        <p className="text-sm text-white/50 mb-5">
          {currentPlayer ? `${currentPlayer}, set your stake before the reveal!` : 'Set your stake before the reveal!'}
        </p>

        {/* Ante picker */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {ANTE_OPTIONS.map(({ val, emoji, label, sub }) => (
            <button
              key={val}
              onClick={() => setAnte(val)}
              className="flex flex-col items-center py-4 rounded-2xl border transition-all hover:scale-105 active:scale-95"
              style={{
                background: ante === val ? `${color}28` : 'rgba(255,255,255,0.05)',
                borderColor: ante === val ? color : 'rgba(255,255,255,0.1)',
                boxShadow: ante === val ? `0 0 14px ${color}35` : 'none',
              }}
            >
              <span className="text-3xl mb-1">{emoji}</span>
              <span className="text-xs font-bold">{label}</span>
              <span className="text-xs mt-0.5" style={{ color: ante === val ? color : 'rgba(255,255,255,0.4)' }}>{sub}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onReveal}
          disabled={ante === null}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${ante !== null ? `bg-gradient-to-r ${theme.gradient} hover:opacity-90` : 'bg-white/10 opacity-40 cursor-not-allowed'}`}
        >
          {ante !== null ? `🎲 Lock In ${ante} pt${ante > 1 ? 's' : ''} & Reveal!` : 'Pick a stake first…'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card content */}
      <div className="glass rounded-3xl p-7 text-center" style={{ background: `rgba(${isTruth ? '139,92,246' : '248,113,113'},0.1)`, border: `1px solid ${color}30` }}>
        <div className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
          style={{ background: `${color}25`, color }}>
          {isTruth ? '📖 Truth' : '😈 Dare'} · {earnedPts} {earnedPts === 1 ? 'point' : 'points'} on the line
        </div>
        <p className="text-xl font-semibold leading-relaxed">{card.content}</p>
      </div>

      {/* Choice buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onToDDone(earnedPts, card.kind)}
          className="py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          ✓ Nailed It!<br /><span className="text-xs font-normal opacity-80">+{earnedPts} {earnedPts === 1 ? 'pt' : 'pts'}</span>
        </button>
        <button onClick={onToDChicken}
          className="py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}>
          🐔 Chicken Out<br /><span className="text-xs font-normal opacity-80">-1 ❤️</span>
        </button>
      </div>

      {/* All players scoreboard strip */}
      {players.length > 1 && (
        <div className="glass rounded-2xl px-4 py-3 flex justify-around">
          {players.map(p => (
            <div key={p} className="text-center">
              <div className="text-xs text-white/40 truncate max-w-[60px]">{p}</div>
              <div className="font-bold text-sm" style={{ color: p === currentPlayer ? theme.accent : 'white' }}>{scores[p] ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────── Would You Rather ─────────── */

function WouldYouRatherCard({ card, votes, onVote }: CardRendererProps & { card: WouldYouRatherCard }) {
  const total = (votes['a'] ?? 0) + (votes['b'] ?? 0)
  const pctA = total ? Math.round((votes['a'] ?? 0) / total * 100) : 50
  const pctB = 100 - pctA
  return (
    <div className="glass rounded-3xl p-6">
      <p className="text-center text-white/40 text-xs font-bold uppercase tracking-widest mb-5">Would You Rather…</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {([['a', card.optionA, '#38bdf8'], ['b', card.optionB, '#a855f7']] as const).map(([key, text, color]) => {
          const voteCount = votes[key] ?? 0
          const pct = key === 'a' ? pctA : pctB
          return (
            <button key={key} onClick={() => onVote(key)}
              className="relative rounded-2xl p-4 text-center overflow-hidden border transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: voteCount > 0 ? `${color}22` : 'rgba(255,255,255,0.05)', borderColor: voteCount > 0 ? `${color}60` : 'rgba(255,255,255,0.1)' }}>
              {total > 0 && <div className="absolute bottom-0 left-0 h-1 transition-all duration-700" style={{ width: `${pct}%`, background: color }} />}
              <p className="font-semibold text-sm leading-snug">{text}</p>
              {total > 0 && <p className="text-xs mt-2 font-bold" style={{ color }}>{pct}%</p>}
            </button>
          )
        })}
      </div>
      <p className="text-center text-xs text-white/25">{total} vote{total !== 1 ? 's' : ''} — tap to weigh in</p>
    </div>
  )
}

/* ─────────── Never Have I Ever ─────────── */

function NeverHaveIEverCard({ card, votes, players, onNHIEHave, scores }: CardRendererProps & { card: NeverHaveIEverCard }) {
  const haveList = Object.keys(votes).filter(p => p !== 'have')
  const anonymousCount = votes['have'] ?? 0

  return (
    <div className="glass rounded-3xl p-7 text-center">
      <div className="text-4xl mb-3">🍻</div>
      <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Never Have I Ever…</p>
      <p className="text-xl font-semibold leading-relaxed mb-7">{card.statement.replace(/^never have i ever\s*/i, '')}</p>

      {players.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {players.map(p => {
            const has = !!votes[p]
            return (
              <button key={p} onClick={() => !has && onNHIEHave(p)}
                disabled={has}
                className="rounded-xl py-3 px-3 font-semibold text-sm transition-all border"
                style={{
                  background: has ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.05)',
                  borderColor: has ? '#34d399' : 'rgba(255,255,255,0.1)',
                  color: has ? '#34d399' : 'white',
                }}>
                {has ? '✋ I Have!' : p}
                {has && <div className="text-xs font-normal mt-0.5 opacity-70">{scores[p] ?? 100}% pure</div>}
              </button>
            )
          })}
        </div>
      ) : (
        <button onClick={() => onNHIEHave('have')}
          className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 mb-3">
          ✋ I Have! ({anonymousCount})
        </button>
      )}

      {haveList.length > 0 && (
        <p className="text-xs text-white/30">{haveList.join(', ')} {haveList.length === 1 ? 'has' : 'have'} done this!</p>
      )}
    </div>
  )
}

/* ─────────── Trivia ─────────── */

function TriviaCard({ card, theme, triviaChoice, onTriviaChoice, scores, players }: CardRendererProps & { card: TriviaCard }) {
  const answered = triviaChoice !== null
  const correct = triviaChoice === card.answerIndex
  return (
    <div className="flex flex-col gap-3">
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: `${theme.accent}22`, color: theme.accent }}>{card.category}</span>
          {answered && <span className={`text-xs font-bold px-3 py-1 rounded-full ${correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{correct ? '✓ Correct!' : '✗ Wrong'}</span>}
        </div>
        <p className="text-lg font-bold leading-snug">{card.question}</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {card.options.map((opt, i) => {
          const letter = ['A', 'B', 'C', 'D'][i]
          const isCorrect = i === card.answerIndex, isChosen = i === triviaChoice
          let bg = 'rgba(255,255,255,0.05)', border = 'rgba(255,255,255,0.1)', color = 'white'
          if (answered) {
            if (isCorrect) { bg = 'rgba(52,211,153,0.2)'; border = '#34d399'; color = '#34d399' }
            else if (isChosen) { bg = 'rgba(248,113,113,0.2)'; border = '#f87171'; color = '#f87171' }
          }
          return (
            <button key={i} disabled={answered} onClick={() => onTriviaChoice(i)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-left border transition-all hover:scale-[1.01] active:scale-[0.99] disabled:scale-100"
              style={{ background: bg, borderColor: border, color }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: answered && isCorrect ? '#34d399' : `${theme.accent}25`, color: answered && isCorrect ? '#000' : theme.accent }}>{letter}</span>
              <span className="text-sm font-medium flex-1">{opt}</span>
              {answered && (isCorrect ? <span>✓</span> : isChosen ? <span>✗</span> : null)}
            </button>
          )
        })}
      </div>
      {/* Mini leaderboard strip */}
      {players.length > 1 && (
        <div className="glass rounded-2xl px-4 py-2 flex justify-around">
          {[...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)).map((p, i) => (
            <div key={p} className="text-center">
              <div className="text-xs">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
              <div className="text-xs text-white/40 truncate max-w-[50px]">{p}</div>
              <div className="font-bold text-sm text-amber-400">{scores[p] ?? 0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────── Hot Takes ─────────── */

function HotTakesCard({ card, votes, players, currentPlayer, onHotTakeReact }: CardRendererProps & { card: HotTakeCard }) {
  const REACTIONS = [
    { key: 'agrees' as const, label: 'Hard Agree', emoji: '💯', color: '#34d399' },
    { key: 'disagrees' as const, label: 'Disagree!', emoji: '🙅', color: '#f87171' },
    { key: 'wilds' as const, label: "That's Wild", emoji: '🤯', color: '#a855f7' },
  ]
  const total = Object.values(votes).reduce((a, b) => a + b, 0)
  const myReaction = REACTIONS.find(r => (votes[r.key] ?? 0) > 0 && currentPlayer)

  return (
    <div className="glass rounded-3xl p-7">
      <div className="text-4xl text-center mb-4">🔥</div>
      <p className="text-2xl font-bold text-center leading-snug mb-7">{card.statement}</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {REACTIONS.map(r => {
          const count = votes[r.key] ?? 0
          return (
            <button key={r.key}
              onClick={() => currentPlayer && onHotTakeReact(currentPlayer, r.key)}
              className="flex flex-col items-center rounded-2xl py-4 px-2 border transition-all hover:scale-105 active:scale-95"
              style={{ background: count > 0 ? `${r.color}18` : 'rgba(255,255,255,0.05)', borderColor: count > 0 ? `${r.color}50` : 'rgba(255,255,255,0.1)' }}>
              <span className="text-3xl mb-1">{r.emoji}</span>
              <span className="text-xs font-bold">{r.label}</span>
              {total > 0 && <span className="text-xs mt-1 font-bold" style={{ color: r.color }}>{count}</span>}
            </button>
          )
        })}
      </div>
      <p className="text-center text-xs text-white/25">{total} reaction{total !== 1 ? 's' : ''}</p>
    </div>
  )
}

/* ─────────── Most Likely To ─────────── */

function MostLikelyToCard({ card, votes, players, onMLTVote }: CardRendererProps & { card: MostLikelyToCard }) {
  const maxVotes = Math.max(0, ...Object.values(votes))
  const leaders = Object.entries(votes).filter(([, v]) => v === maxVotes && maxVotes > 0).map(([p]) => p)

  if (!players.length) {
    return (
      <div className="glass rounded-3xl p-8 text-center">
        <div className="text-4xl mb-3">👆</div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-3">Most Likely To…</p>
        <p className="text-xl font-bold">{card.statement.replace(/^most likely to\s*/i, '')}</p>
        <p className="text-sm text-white/30 mt-4">Point at the person who fits!</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-3xl p-6">
      <div className="text-3xl text-center mb-3">👆</div>
      <p className="text-xs font-bold uppercase tracking-widest text-white/40 text-center mb-3">Most Likely To…</p>
      <p className="text-xl font-bold text-center leading-snug mb-6">{card.statement.replace(/^most likely to\s*/i, '')}</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map(p => {
          const count = votes[p] ?? 0
          const isLeader = leaders.includes(p)
          return (
            <button key={p} onClick={() => onMLTVote(p)}
              className="rounded-2xl py-3 px-4 font-bold text-sm transition-all border hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background: isLeader ? 'rgba(232,121,249,0.25)' : count > 0 ? 'rgba(232,121,249,0.1)' : 'rgba(255,255,255,0.05)',
                borderColor: isLeader ? '#e879f9' : 'rgba(255,255,255,0.1)',
                color: isLeader ? '#e879f9' : 'white',
              }}>
              {isLeader && '👑 '}{p}
              {count > 0 && <span className="ml-1 text-xs font-normal opacity-70">({count})</span>}
            </button>
          )
        })}
      </div>
      {leaders.length > 0 && (
        <p className="text-center text-sm text-fuchsia-400 mt-4 font-bold animate-pulse">
          👑 {leaders.join(' & ')}!
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────── Cards Against ─────────────────────────── */

const HAND_SIZE = 7

function CardsAgainstGame({ game }: { game: Game }) {
  const allPrompts = useMemo(() => shuffle(game.cards.filter((c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'prompt')), [game.cards])
  const allResponses = useMemo(() => shuffle(game.cards.filter((c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'response')), [game.cards])

  const players = game.config.players.filter(p => p.trim())
  const hasPlayers = players.length > 1

  const [hands, setHands] = useState<Record<string, CardsAgainstCard[]>>(() => {
    if (!hasPlayers) return {}
    const result: Record<string, CardsAgainstCard[]> = {}
    let idx = 0
    for (const p of players) { result[p] = allResponses.slice(idx, idx + HAND_SIZE); idx += HAND_SIZE }
    return result
  })

  const [roundIndex, setRoundIndex] = useState(0)
  const [czarIndex, setCzarIndex] = useState(0)
  const [phase, setPhase] = useState<'pick' | 'judge' | 'winner'>('pick')
  const [pickerIndex, setPickerIndex] = useState(0)
  const [submissions, setSubmissions] = useState<{ player: string; card: CardsAgainstCard }[]>([])
  const [winner, setWinner] = useState<string | null>(null)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [stats, setStats] = useState<Record<string, PlayerStats>>(() => Object.fromEntries(players.map(p => [p, emptyStats()])))
  const [gameOver, setGameOver] = useState(false)
  const [copied, setCopied] = useState(false)

  const shuffledSubs = useMemo(() => shuffle(submissions), [submissions])
  const currentPrompt = allPrompts[roundIndex % allPrompts.length]
  const czar = hasPlayers ? players[czarIndex % players.length] : 'Card Czar'
  const nonCzarPlayers = hasPlayers ? players.filter((_, i) => i !== czarIndex % players.length) : []
  const currentPicker = nonCzarPlayers[pickerIndex]

  function pickCard(card: CardsAgainstCard, player: string) {
    const newSubs = [...submissions, { player, card }]
    if (hasPlayers) {
      setHands(h => {
        const remaining = (h[player] ?? []).filter(c => c.id !== card.id)
        const usedIds = new Set([...Object.values(h).flat().map(c => c.id), ...newSubs.map(s => s.card.id)])
        const next = allResponses.find(c => !usedIds.has(c.id))
        return { ...h, [player]: next ? [...remaining, next] : remaining }
      })
    }
    setSubmissions(newSubs)
    if (pickerIndex + 1 >= nonCzarPlayers.length) setPhase('judge')
    else setPickerIndex(i => i + 1)
  }

  function pickWinner(player: string) {
    setWinner(player)
    setScores(s => ({ ...s, [player]: (s[player] ?? 0) + 1 }))
    setStats(s => bumpStat(s, player, 'votesReceived'))
    setPhase('winner')
  }

  function nextRound() {
    if (roundIndex + 1 >= allPrompts.length) { setGameOver(true); return }
    setRoundIndex(i => i + 1); setCzarIndex(i => i + 1)
    setPhase('pick'); setPickerIndex(0); setSubmissions([]); setWinner(null)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (gameOver) {
    return (
      <EndScreen
        game={game} scores={scores} stats={stats}
        onPlayAgain={() => { setRoundIndex(0); setCzarIndex(0); setPhase('pick'); setPickerIndex(0); setSubmissions([]); setWinner(null); setScores({}); setStats(Object.fromEntries(players.map(p => [p, emptyStats()]))); setGameOver(false) }}
      />
    )
  }

  const BG = { background: '#0a0a0a' }

  if (!hasPlayers) {
    const pool = allResponses.slice((roundIndex * 5) % Math.max(1, allResponses.length - 5), (roundIndex * 5) % Math.max(1, allResponses.length - 5) + 5)
    return (
      <div className="min-h-screen flex flex-col" style={BG}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <a href="/" className="text-lg font-black gradient-text">PlayCraft</a>
          <button onClick={copyLink} className="text-xs glass border border-white/20 px-3 py-1.5 rounded-lg">{copied ? '✓' : '🔗 Share'}</button>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-6 shadow-2xl">
            <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">🖤 Round {roundIndex + 1}</div>
            <p className="text-xl font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
            {pool.map(c => <button key={c.id} className="bg-white text-zinc-900 rounded-xl p-3 text-sm font-semibold text-left hover:bg-white/90 transition-colors leading-snug">{c.content}</button>)}
          </div>
          <button onClick={nextRound} className="w-full max-w-sm py-3.5 rounded-2xl font-bold text-white bg-zinc-700 hover:bg-zinc-600 transition-all">Next Round →</button>
        </div>
      </div>
    )
  }

  if (phase === 'pick') {
    const hand = hands[currentPicker] ?? []
    return (
      <div className="min-h-screen flex flex-col" style={BG}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <a href="/" className="text-lg font-black gradient-text">PlayCraft</a>
          <span className="text-xs text-white/40">Round {roundIndex + 1} · {czar} is Czar 👑</span>
        </header>
        <div className="px-4 pt-5 pb-3 flex justify-center">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-5 shadow-xl">
            <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">🖤 Prompt</div>
            <p className="text-lg font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
          </div>
        </div>
        <div className="text-center py-2 border-b border-white/5">
          <p className="text-white/30 text-xs">Pass the phone to</p>
          <p className="font-black text-2xl">{currentPicker}</p>
          <p className="text-white/30 text-xs">({pickerIndex + 1} of {nonCzarPlayers.length})</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
          <p className="text-center text-xs text-white/30 mb-3">Tap your best answer (Czar can't see this 🙈)</p>
          <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
            {hand.map(c => (
              <button key={c.id} onClick={() => pickCard(c, currentPicker)}
                className="bg-white text-zinc-900 rounded-xl p-3 text-sm font-semibold text-left hover:scale-105 active:scale-95 transition-transform shadow-md min-h-[70px] leading-snug">
                {c.content}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'judge') {
    return (
      <div className="min-h-screen flex flex-col" style={BG}>
        <header className="px-4 py-3 border-b border-white/10 text-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <p className="text-white/40 text-xs">Pass the phone to</p>
          <p className="font-black text-2xl">{czar} 👑</p>
          <p className="text-white/40 text-xs">Pick the winner</p>
        </header>
        <div className="px-4 pt-5 pb-3 flex justify-center">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">🖤 Prompt</div>
            <p className="text-lg font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <p className="text-center text-xs text-white/30 mb-3">{czar}, pick the funniest answer:</p>
          <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
            {shuffledSubs.map(sub => (
              <button key={sub.card.id} onClick={() => pickWinner(sub.player)}
                className="bg-white text-zinc-900 rounded-xl p-4 text-base font-semibold text-left hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md">
                {sub.card.content}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // winner phase
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={BG}>
      <Confetti />
      <div className="animate-slideUp relative z-10">
        <div className="text-6xl mb-3">🎉</div>
        <p className="text-white/50 text-sm mb-1">The Czar chose</p>
        <h2 className="text-4xl font-black mb-3">{winner}</h2>
        <div className="bg-white text-zinc-900 rounded-2xl p-5 text-lg font-bold mb-5 max-w-xs mx-auto shadow-xl">
          {submissions.find(s => s.player === winner)?.card.content}
        </div>
        {/* Scoreboard */}
        <div className="glass rounded-2xl p-4 text-sm max-w-xs mx-auto mb-6">
          {[...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)).map((p, i) => (
            <div key={p} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
              <span>{i === 0 ? '👑 ' : ''}{p}</span>
              <span className="font-bold text-amber-400">{scores[p] ?? 0} {scores[p] === 1 ? 'pt' : 'pts'}</span>
            </div>
          ))}
        </div>
        <button onClick={nextRound}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-white bg-zinc-700 hover:bg-zinc-600 transition-all">
          {roundIndex + 1 >= allPrompts.length ? 'Final Scores 🏁' : 'Next Round →'}
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   INDIVIDUAL (OWN-DEVICE) MODE — server-state + polling
   ═══════════════════════════════════════════════════════════════ */

/* ── Server state hook ── */

function useServerState(gameId: string) {
  const [state, setState] = useState<SharedGameState | null>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    let timeoutId: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const res = await fetch(`/api/game/${gameId}/state`)
        if (res.ok && activeRef.current) setState(await res.json())
      } catch {}
      if (activeRef.current) timeoutId = setTimeout(poll, 2000)
    }
    poll()
    return () => { activeRef.current = false; clearTimeout(timeoutId) }
  }, [gameId])

  const act = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/game/${gameId}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) setState(await res.json())
  }, [gameId])

  return { state, act }
}

/* ── Player picker ── */

function PlayerPickerScreen({ game, players, onPick }: { game: Game; players: string[]; onPick: (p: string) => void }) {
  const theme = THEMES[game.config.type]
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: theme.bg }}>
      <div className="w-full max-w-sm animate-slideUp text-center">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-3xl font-black mb-2">Who are you?</h2>
        <p className="text-white/40 mb-8">Pick your name to join the game</p>
        <div className="flex flex-col gap-3">
          {players.map(p => (
            <button
              key={p}
              onClick={() => onPick(p)}
              className={`w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-all shadow-lg`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Waiting screen ── */

function WaitingFor({ name, detail, theme }: { name: string; detail?: string; theme: { bg: string; accent: string } }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-5xl mb-4 animate-pulse">⏳</div>
      <p className="text-white/40 text-sm mb-1">Waiting for</p>
      <p className="font-black text-2xl mb-2" style={{ color: theme.accent }}>{name}</p>
      {detail && <p className="text-white/30 text-sm">{detail}</p>}
    </div>
  )
}

/* ── Loading ── */

function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 60%)' }}>
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

/* ── Individual Standard Game ── */

function IndividualStandardGame({ game }: { game: Game }) {
  const [myPlayer, setMyPlayer] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [localAnte, setLocalAnte] = useState<1 | 2 | 3 | null>(null)
  const prevCardIdx = useRef(-1)
  const { state, act } = useServerState(game.id)

  useEffect(() => {
    const stored = sessionStorage.getItem(`playcraft_who_${game.id}`)
    const players = game.config.players.filter(p => p.trim())
    if (stored && players.includes(stored)) setMyPlayer(stored)
    setInitialized(true)
  }, [game.id])

  // Reset local ante when card changes
  useEffect(() => {
    if (state && state.cardIndex !== prevCardIdx.current) {
      setLocalAnte(null)
      prevCardIdx.current = state.cardIndex
    }
  }, [state?.cardIndex])

  const filteredCards = useMemo(() => {
    const f = game.config.cardFilter
    if (game.config.type !== 'truth-or-dare' || !f || f === 'both') return game.cards
    const kind = f === 'truths-only' ? 'truth' : 'dare'
    return game.cards.filter(c => 'kind' in c ? (c as TruthOrDareCard).kind === kind : true)
  }, [game.cards, game.config.type, game.config.cardFilter])

  if (!initialized) return <FullPageLoader />

  const players = game.config.players.filter(p => p.trim())

  if (!myPlayer) {
    return (
      <PlayerPickerScreen
        game={game}
        players={players}
        onPick={p => { sessionStorage.setItem(`playcraft_who_${game.id}`, p); setMyPlayer(p) }}
      />
    )
  }

  if (!state) return <FullPageLoader />

  const theme = THEMES[game.config.type]

  if (state.phase === 'done') {
    return (
      <EndScreen
        game={game}
        scores={state.scores}
        stats={state.stats}
        lives={state.lives}
        groupStats={game.config.type === 'would-you-rather' ? state.wyrGroupStats : undefined}
        onPlayAgain={() => act({ action: 'reset' })}
      />
    )
  }

  const card = filteredCards[state.cardIndex]
  const currentPlayer = players[state.playerTurnIndex % players.length]
  const isMyTurn = currentPlayer === myPlayer
  const progress = ((state.cardIndex + 1) / filteredCards.length) * 100
  const votes = state.votes as Record<string, unknown>
  const hasVoted = myPlayer in votes

  const isTurnBased = game.config.type === 'truth-or-dare' || game.config.type === 'trivia'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 glass">
        <a href="/" className="text-lg font-black gradient-text">PlayCraft</a>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">{myPlayer}</span>
          <span className="text-xs text-white/40">{state.cardIndex + 1}/{filteredCards.length}</span>
        </div>
      </header>

      {/* Progress */}
      <div className="h-1 bg-white/10">
        <div className={`h-1 bg-gradient-to-r ${theme.gradient} transition-all duration-500`} style={{ width: `${progress}%` }} />
      </div>

      {/* Turn bar */}
      {currentPlayer && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">Turn:</span>
            <span className="font-bold text-sm" style={{ color: isMyTurn ? theme.accent : 'white' }}>
              {isMyTurn ? '⭐ Your turn!' : currentPlayer}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {(game.config.type === 'trivia' || game.config.type === 'truth-or-dare') && (
              <span className="text-xs text-white/40">{state.scores[myPlayer] ?? 0} pts</span>
            )}
            {game.config.type === 'truth-or-dare' && <Hearts count={state.lives[myPlayer] ?? 3} />}
            {game.config.type === 'never-have-i-ever' && (
              <span className="text-xs text-emerald-400 font-bold">{state.scores[myPlayer] ?? 100}% pure</span>
            )}
          </div>
        </div>
      )}

      {/* Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-lg" key={state.cardIndex} style={{ animation: 'slideInCard 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <IndivCardView
            gameType={game.config.type}
            card={card}
            theme={theme}
            state={state}
            myPlayer={myPlayer}
            isMyTurn={isMyTurn}
            currentPlayer={currentPlayer}
            players={players}
            localAnte={localAnte}
            setLocalAnte={setLocalAnte}
            hasVoted={hasVoted}
            votes={votes}
            act={act}
          />
        </div>
      </div>

      {/* Bottom nav */}
      {!isTurnBased && (
        <div className="px-4 pb-6 pt-2 max-w-lg mx-auto w-full">
          <button
            onClick={() => act({ action: 'advance', player: myPlayer })}
            className={`w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-all`}
          >
            {state.cardIndex + 1 >= filteredCards.length
              ? (game.config.type === 'would-you-rather' ? 'See Results 🏁' : 'Finish 🏁')
              : 'Next Card →'}
          </button>
        </div>
      )}
      {game.config.type === 'trivia' && hasVoted && (
        <div className="px-4 pb-6 pt-2 max-w-lg mx-auto w-full">
          <button
            onClick={() => act({ action: 'advance', player: myPlayer })}
            className={`w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r ${theme.gradient} hover:opacity-90 transition-all`}
          >
            {state.cardIndex + 1 >= filteredCards.length ? 'Finish 🏁' : 'Next Card →'}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Individual card views ── */

interface IndivCardProps {
  gameType: GameType
  card: Game['cards'][number]
  theme: { gradient: string; accent: string; bg: string; cardBg: string }
  state: SharedGameState
  myPlayer: string
  isMyTurn: boolean
  currentPlayer: string | null
  players: string[]
  localAnte: 1 | 2 | 3 | null
  setLocalAnte: (v: 1 | 2 | 3 | null) => void
  hasVoted: boolean
  votes: Record<string, unknown>
  act: (body: Record<string, unknown>) => Promise<void>
}

function IndivCardView(props: IndivCardProps) {
  const { gameType, card, theme, state, myPlayer, isMyTurn, currentPlayer, players, localAnte, setLocalAnte, hasVoted, votes, act } = props

  switch (gameType) {
    case 'truth-or-dare': {
      const tdc = card as TruthOrDareCard
      const isTruth = tdc.kind === 'truth'
      const color = isTruth ? '#a78bfa' : '#f87171'
      const earnedPts = state.ante ?? localAnte ?? (isTruth ? 1 : 2)

      if (!isMyTurn) {
        return (
          <div className="glass rounded-3xl p-7 text-center" style={{ background: state.revealed ? `rgba(${isTruth ? '139,92,246' : '248,113,113'},0.1)` : 'rgba(255,255,255,0.05)' }}>
            {state.revealed ? (
              <>
                <div className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
                  style={{ background: `${color}25`, color }}>
                  {isTruth ? '📖 Truth' : '😈 Dare'} · {earnedPts} {earnedPts === 1 ? 'point' : 'points'} on the line
                </div>
                <p className="text-xl font-semibold leading-relaxed mb-4">{tdc.content}</p>
                <p className="text-xs text-white/30">{currentPlayer} is deciding…</p>
              </>
            ) : (
              <WaitingFor name={currentPlayer ?? ''} detail="Picking their stake…" theme={theme} />
            )}
          </div>
        )
      }

      if (!state.revealed) {
        return (
          <div className="glass rounded-3xl p-7 text-center" style={{ background: `rgba(${isTruth ? '139,92,246' : '248,113,113'},0.08)` }}>
            <div className="text-5xl mb-3">{isTruth ? '🤫' : '😈'}</div>
            <div className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4"
              style={{ background: `${color}25`, color }}>{isTruth ? 'Truth' : 'Dare'}</div>
            <p className="text-sm text-white/50 mb-5">Set your stake before the reveal!</p>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {ANTE_OPTIONS.map(({ val, emoji, label, sub }) => (
                <button key={val} onClick={() => setLocalAnte(val)}
                  className="flex flex-col items-center py-4 rounded-2xl border transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: localAnte === val ? `${color}28` : 'rgba(255,255,255,0.05)',
                    borderColor: localAnte === val ? color : 'rgba(255,255,255,0.1)',
                    boxShadow: localAnte === val ? `0 0 14px ${color}35` : 'none',
                  }}>
                  <span className="text-3xl mb-1">{emoji}</span>
                  <span className="text-xs font-bold">{label}</span>
                  <span className="text-xs mt-0.5" style={{ color: localAnte === val ? color : 'rgba(255,255,255,0.4)' }}>{sub}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => localAnte !== null && act({ action: 'reveal', player: myPlayer, ante: localAnte })}
              disabled={localAnte === null}
              className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all ${localAnte !== null ? `bg-gradient-to-r ${theme.gradient} hover:opacity-90` : 'bg-white/10 opacity-40 cursor-not-allowed'}`}
            >
              {localAnte !== null ? `🎲 Lock In ${localAnte} pt${localAnte > 1 ? 's' : ''} & Reveal!` : 'Pick a stake first…'}
            </button>
          </div>
        )
      }

      // Revealed — my turn
      return (
        <div className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-7 text-center" style={{ background: `rgba(${isTruth ? '139,92,246' : '248,113,113'},0.1)`, border: `1px solid ${color}30` }}>
            <div className="inline-block text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5"
              style={{ background: `${color}25`, color }}>
              {isTruth ? '📖 Truth' : '😈 Dare'} · {earnedPts} {earnedPts === 1 ? 'point' : 'points'} on the line
            </div>
            <p className="text-xl font-semibold leading-relaxed">{tdc.content}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => act({ action: 'complete', player: myPlayer, kind: tdc.kind, points: earnedPts })}
              className="py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              ✓ Nailed It!<br /><span className="text-xs font-normal opacity-80">+{earnedPts} {earnedPts === 1 ? 'pt' : 'pts'}</span>
            </button>
            <button onClick={() => act({ action: 'chicken', player: myPlayer })}
              className="py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#6b7280,#4b5563)' }}>
              🐔 Chicken Out<br /><span className="text-xs font-normal opacity-80">-1 ❤️</span>
            </button>
          </div>
          {players.length > 1 && (
            <div className="glass rounded-2xl px-4 py-3 flex justify-around">
              {players.map(p => (
                <div key={p} className="text-center">
                  <div className="text-xs text-white/40 truncate max-w-[60px]">{p}</div>
                  <div className="font-bold text-sm" style={{ color: p === myPlayer ? theme.accent : 'white' }}>{state.scores[p] ?? 0}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    case 'would-you-rather': {
      const wyr = card as WouldYouRatherCard
      const myChoice = votes[myPlayer] as string | undefined
      const total = Object.values(votes).length
      const aCount = Object.values(votes).filter(v => v === 'a').length
      const bCount = total - aCount
      const pctA = total ? Math.round(aCount / total * 100) : 50
      const pctB = 100 - pctA
      return (
        <div className="glass rounded-3xl p-6">
          <p className="text-center text-white/40 text-xs font-bold uppercase tracking-widest mb-5">Would You Rather…</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {([['a', wyr.optionA, '#38bdf8'], ['b', wyr.optionB, '#a855f7']] as const).map(([key, text, color]) => {
              const chosen = myChoice === key
              return (
                <button key={key} onClick={() => !myChoice && act({ action: 'vote', player: myPlayer, choice: key })}
                  disabled={!!myChoice}
                  className="relative rounded-2xl p-4 text-center overflow-hidden border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100"
                  style={{ background: chosen ? `${color}30` : myChoice ? `${color}10` : 'rgba(255,255,255,0.05)', borderColor: chosen ? color : 'rgba(255,255,255,0.1)' }}>
                  {chosen && <div className="absolute top-2 right-2 text-xs font-bold" style={{ color }}>✓ You</div>}
                  {total > 0 && <div className="absolute bottom-0 left-0 h-1 transition-all duration-700" style={{ width: `${key === 'a' ? pctA : pctB}%`, background: color }} />}
                  <p className="font-semibold text-sm leading-snug">{text}</p>
                  {total > 0 && <p className="text-xs mt-2 font-bold" style={{ color }}>{key === 'a' ? pctA : pctB}%</p>}
                </button>
              )
            })}
          </div>
          <p className="text-center text-xs text-white/25">{total} vote{total !== 1 ? 's' : ''} cast</p>
        </div>
      )
    }

    case 'never-have-i-ever': {
      const nhie = card as NeverHaveIEverCard
      const myChoice = votes[myPlayer] as string | undefined
      const haveList = Object.entries(votes).filter(([, v]) => v === 'have').map(([p]) => p)
      return (
        <div className="glass rounded-3xl p-7 text-center">
          <div className="text-4xl mb-3">🍻</div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Never Have I Ever…</p>
          <p className="text-xl font-semibold leading-relaxed mb-7">{nhie.statement.replace(/^never have i ever\s*/i, '')}</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(['have', 'never'] as const).map(choice => {
              const chosen = myChoice === choice
              return (
                <button key={choice} onClick={() => !myChoice && act({ action: 'vote', player: myPlayer, choice })}
                  disabled={!!myChoice}
                  className="rounded-2xl py-4 font-bold text-sm transition-all border disabled:cursor-default hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: chosen ? (choice === 'have' ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.05)',
                    borderColor: chosen ? (choice === 'have' ? '#34d399' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.1)',
                  }}>
                  {choice === 'have' ? '✋ I Have!' : '😇 Never!'}
                  {chosen && <div className="text-xs font-normal mt-1 opacity-60">{choice === 'have' ? `${state.scores[myPlayer] ?? 100}% pure` : '✓ Safe'}</div>}
                </button>
              )
            })}
          </div>
          {haveList.length > 0 && (
            <p className="text-xs text-white/30">{haveList.join(', ')} {haveList.length === 1 ? 'has' : 'have'} done this!</p>
          )}
        </div>
      )
    }

    case 'hot-takes': {
      const ht = card as HotTakeCard
      const myChoice = votes[myPlayer] as string | undefined
      const REACTIONS = [
        { key: 'agrees', label: 'Hard Agree', emoji: '💯', color: '#34d399' },
        { key: 'disagrees', label: 'Disagree!', emoji: '🙅', color: '#f87171' },
        { key: 'wilds', label: "That's Wild", emoji: '🤯', color: '#a855f7' },
      ] as const
      const counts = REACTIONS.reduce((acc, r) => {
        acc[r.key] = Object.values(votes).filter(v => v === r.key).length
        return acc
      }, {} as Record<string, number>)
      return (
        <div className="glass rounded-3xl p-7">
          <div className="text-4xl text-center mb-4">🔥</div>
          <p className="text-2xl font-bold text-center leading-snug mb-7">{ht.statement}</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {REACTIONS.map(r => {
              const chosen = myChoice === r.key
              return (
                <button key={r.key} onClick={() => !myChoice && act({ action: 'vote', player: myPlayer, choice: r.key })}
                  disabled={!!myChoice}
                  className="flex flex-col items-center rounded-2xl py-4 px-2 border transition-all hover:scale-105 active:scale-95 disabled:cursor-default"
                  style={{ background: chosen ? `${r.color}28` : counts[r.key] > 0 ? `${r.color}12` : 'rgba(255,255,255,0.05)', borderColor: chosen ? r.color : 'rgba(255,255,255,0.1)', boxShadow: chosen ? `0 0 12px ${r.color}30` : 'none' }}>
                  <span className="text-3xl mb-1">{r.emoji}</span>
                  <span className="text-xs font-bold">{r.label}</span>
                  {counts[r.key] > 0 && <span className="text-xs mt-1 font-bold" style={{ color: r.color }}>{counts[r.key]}</span>}
                </button>
              )
            })}
          </div>
          <p className="text-center text-xs text-white/25">{Object.values(votes).length} reaction{Object.values(votes).length !== 1 ? 's' : ''}</p>
        </div>
      )
    }

    case 'most-likely-to': {
      const mlt = card as MostLikelyToCard
      const myChoice = votes[myPlayer] as string | undefined
      const counts = players.reduce((acc, p) => {
        acc[p] = Object.values(votes).filter(v => v === p).length
        return acc
      }, {} as Record<string, number>)
      const maxVotes = Math.max(0, ...Object.values(counts))
      return (
        <div className="glass rounded-3xl p-6">
          <div className="text-3xl text-center mb-3">👆</div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/40 text-center mb-3">Most Likely To…</p>
          <p className="text-xl font-bold text-center leading-snug mb-6">{mlt.statement.replace(/^most likely to\s*/i, '')}</p>
          <div className="grid grid-cols-2 gap-2">
            {players.map(p => {
              if (p === myPlayer) return null // Can't vote for yourself
              const chosen = myChoice === p
              const isLeader = counts[p] === maxVotes && maxVotes > 0
              return (
                <button key={p} onClick={() => !myChoice && act({ action: 'vote', player: myPlayer, choice: p })}
                  disabled={!!myChoice}
                  className="rounded-2xl py-3 px-4 font-bold text-sm transition-all border hover:scale-[1.03] active:scale-[0.97] disabled:cursor-default"
                  style={{
                    background: chosen ? 'rgba(232,121,249,0.3)' : isLeader ? 'rgba(232,121,249,0.15)' : 'rgba(255,255,255,0.05)',
                    borderColor: chosen ? '#e879f9' : 'rgba(255,255,255,0.1)',
                    color: chosen ? '#e879f9' : 'white',
                  }}>
                  {chosen ? '✓ ' : isLeader ? '👑 ' : ''}{p}
                  {counts[p] > 0 && <span className="ml-1 text-xs font-normal opacity-70">({counts[p]})</span>}
                </button>
              )
            })}
          </div>
          {myChoice && <p className="text-center text-xs text-white/30 mt-3">You voted for {myChoice}</p>}
        </div>
      )
    }

    case 'trivia': {
      const tv = card as TriviaCard
      const myAnswerIdx = votes[myPlayer] as number | undefined
      const answered = myAnswerIdx !== undefined
      const correct = answered && myAnswerIdx === tv.answerIndex
      return (
        <div className="flex flex-col gap-3">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" style={{ background: `${theme.accent}22`, color: theme.accent }}>{tv.category}</span>
              {answered && <span className={`text-xs font-bold px-3 py-1 rounded-full ${correct ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{correct ? '✓ Correct!' : '✗ Wrong'}</span>}
            </div>
            {!isMyTurn && !answered && (
              <div className="mb-3">
                <WaitingFor name={currentPlayer ?? ''} detail="Answering the question…" theme={theme} />
              </div>
            )}
            <p className="text-lg font-bold leading-snug">{tv.question}</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {tv.options.map((opt, i) => {
              const letter = ['A', 'B', 'C', 'D'][i]
              const isCorrect = i === tv.answerIndex
              const isChosen = answered && i === myAnswerIdx
              let bg = 'rgba(255,255,255,0.05)', border = 'rgba(255,255,255,0.1)', color = 'white'
              if (answered) {
                if (isCorrect) { bg = 'rgba(52,211,153,0.2)'; border = '#34d399'; color = '#34d399' }
                else if (isChosen) { bg = 'rgba(248,113,113,0.2)'; border = '#f87171'; color = '#f87171' }
              }
              return (
                <button key={i}
                  disabled={answered || !isMyTurn}
                  onClick={() => isMyTurn && !answered && act({ action: 'vote', player: myPlayer, choice: i })}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-left border transition-all hover:scale-[1.01] active:scale-[0.99] disabled:scale-100"
                  style={{ background: bg, borderColor: border, color }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: answered && isCorrect ? '#34d399' : `${theme.accent}25`, color: answered && isCorrect ? '#000' : theme.accent }}>{letter}</span>
                  <span className="text-sm font-medium flex-1">{opt}</span>
                  {answered && (isCorrect ? <span>✓</span> : isChosen ? <span>✗</span> : null)}
                </button>
              )
            })}
          </div>
          {players.length > 1 && (
            <div className="glass rounded-2xl px-4 py-2 flex justify-around">
              {[...players].sort((a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0)).map((p, i) => (
                <div key={p} className="text-center">
                  <div className="text-xs">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div className="text-xs text-white/40 truncate max-w-[50px]">{p}</div>
                  <div className="font-bold text-sm text-amber-400">{state.scores[p] ?? 0}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    default: return null
  }
}

/* ── Individual Cards Against ── */

function IndividualCardsAgainstGame({ game }: { game: Game }) {
  const [myPlayer, setMyPlayer] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const { state, act } = useServerState(game.id)

  useEffect(() => {
    const stored = sessionStorage.getItem(`playcraft_who_${game.id}`)
    const players = game.config.players.filter(p => p.trim())
    if (stored && players.includes(stored)) setMyPlayer(stored)
    setInitialized(true)
  }, [game.id])

  if (!initialized) return <FullPageLoader />

  const players = game.config.players.filter(p => p.trim())
  const BG = { background: '#0a0a0a' }

  if (!myPlayer) {
    if (players.length < 2) {
      // Fallback to shared mode if no named players
      return <CardsAgainstGame game={game} />
    }
    return (
      <PlayerPickerScreen
        game={game}
        players={players}
        onPick={p => { sessionStorage.setItem(`playcraft_who_${game.id}`, p); setMyPlayer(p) }}
      />
    )
  }

  if (!state) return <FullPageLoader />

  if (state.phase === 'done' || !state.ca) {
    return (
      <EndScreen
        game={game}
        scores={state.scores}
        stats={state.stats}
        onPlayAgain={() => act({ action: 'reset' })}
      />
    )
  }

  const ca = state.ca
  const prompts = game.cards.filter((c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'prompt')
  const responsesById = Object.fromEntries(
    game.cards.filter((c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'response').map(c => [c.id, c])
  )
  const currentPrompt = prompts[ca.roundIndex % prompts.length]
  const czar = players[ca.czarIndex % players.length]
  const iAmCzar = myPlayer === czar
  const nonCzarPlayers = players.filter((_, i) => i !== ca.czarIndex % players.length)
  const myHand = (ca.hands[myPlayer] ?? []).map(id => responsesById[id]).filter(Boolean)
  const mySubmission = ca.submissions.find(s => s.player === myPlayer)
  const submitted = !!mySubmission

  // Pick phase
  if (ca.phase === 'pick') {
    if (iAmCzar) {
      return (
        <div className="min-h-screen flex flex-col" style={BG}>
          <header className="px-4 py-3 border-b border-white/10 text-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <p className="text-white/40 text-xs">You are the Card Czar 👑</p>
            <p className="font-black text-2xl">{myPlayer}</p>
            <p className="text-white/40 text-xs">Round {ca.roundIndex + 1}</p>
          </header>
          <div className="px-4 pt-5 flex justify-center">
            <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">🖤 Prompt</div>
              <p className="text-lg font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <p className="text-white/60 font-semibold">Waiting for players to pick…</p>
            <p className="text-white/30 text-sm mt-2">{ca.submissions.length} / {nonCzarPlayers.length} submitted</p>
          </div>
        </div>
      )
    }

    if (submitted) {
      const myCard = responsesById[mySubmission!.cardId]
      return (
        <div className="min-h-screen flex flex-col" style={BG}>
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <a href="/" className="text-lg font-black gradient-text">PlayCraft</a>
            <span className="text-xs text-white/40">Round {ca.roundIndex + 1} · {czar} is Czar 👑</span>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-4">
            <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-5">
              <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">🖤 Prompt</div>
              <p className="text-lg font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
            </div>
            <div className="bg-white text-zinc-900 rounded-2xl p-4 max-w-sm w-full text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Your pick:</p>
              <p className="font-bold text-base">{myCard?.content}</p>
            </div>
            <p className="text-white/30 text-sm">{ca.submissions.length}/{nonCzarPlayers.length} submitted · waiting for {czar} to judge…</p>
          </div>
        </div>
      )
    }

    // My turn to pick
    return (
      <div className="min-h-screen flex flex-col" style={BG}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <a href="/" className="text-lg font-black gradient-text">PlayCraft</a>
          <span className="text-xs text-white/40">Round {ca.roundIndex + 1} · {czar} is Czar 👑</span>
        </header>
        <div className="px-4 pt-5 flex justify-center">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-5">
            <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">🖤 Prompt</div>
            <p className="text-lg font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
          </div>
        </div>
        <div className="text-center py-2 border-b border-white/5">
          <p className="text-white/30 text-xs">Pick your answer, {myPlayer}</p>
          <p className="text-white/20 text-xs">(Czar can&apos;t see this 🙈)</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
          <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto">
            {myHand.map(c => (
              <button key={c.id} onClick={() => act({ action: 'ca_pick', player: myPlayer, cardId: c.id })}
                className="bg-white text-zinc-900 rounded-xl p-3 text-sm font-semibold text-left hover:scale-105 active:scale-95 transition-transform shadow-md min-h-[70px] leading-snug">
                {c.content}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Judge phase
  if (ca.phase === 'judge') {
    const shuffledSubs = [...ca.submissions].sort(() => Math.random() - 0.5)
    if (iAmCzar) {
      return (
        <div className="min-h-screen flex flex-col" style={BG}>
          <header className="px-4 py-3 border-b border-white/10 text-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <p className="text-white/40 text-xs">You are the Card Czar 👑 — pick the funniest</p>
            <p className="font-black text-2xl">{myPlayer}</p>
          </header>
          <div className="px-4 pt-5 flex justify-center">
            <div className="w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">🖤 Prompt</p>
              <p className="text-lg font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-3">
            <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
              {shuffledSubs.map(sub => (
                <button key={sub.cardId} onClick={() => act({ action: 'ca_judge', winner: sub.player })}
                  className="bg-white text-zinc-900 rounded-xl p-4 text-base font-semibold text-left hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-md">
                  {responsesById[sub.cardId]?.content}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={BG}>
        <WaitingFor name={czar} detail="Picking the funniest answer… 👑" theme={THEMES['cards-against']} />
        <div className="mt-4 w-full max-w-sm bg-zinc-900 border border-white/20 rounded-2xl p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2">🖤 Prompt</p>
          <p className="text-lg font-bold leading-relaxed">{formatPrompt(currentPrompt?.content ?? '')}</p>
        </div>
      </div>
    )
  }

  // Winner phase
  const winnerCard = ca.winner ? responsesById[ca.submissions.find(s => s.player === ca.winner)?.cardId ?? ''] : null
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={BG}>
      <Confetti />
      <div className="animate-slideUp relative z-10">
        <div className="text-6xl mb-3">🎉</div>
        <p className="text-white/50 text-sm mb-1">{czar} chose</p>
        <h2 className="text-4xl font-black mb-3">{ca.winner}</h2>
        {winnerCard && (
          <div className="bg-white text-zinc-900 rounded-2xl p-5 text-lg font-bold mb-5 max-w-xs mx-auto shadow-xl">
            {winnerCard.content}
          </div>
        )}
        <div className="glass rounded-2xl p-4 text-sm max-w-xs mx-auto mb-6">
          {[...players].sort((a, b) => (state.scores[b] ?? 0) - (state.scores[a] ?? 0)).map((p, i) => (
            <div key={p} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
              <span>{i === 0 ? '👑 ' : ''}{p}</span>
              <span className="font-bold text-amber-400">{state.scores[p] ?? 0} {state.scores[p] === 1 ? 'pt' : 'pts'}</span>
            </div>
          ))}
        </div>
        <button onClick={() => act({ action: 'ca_next_round', player: myPlayer })}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-white bg-zinc-700 hover:bg-zinc-600 transition-all">
          {ca.roundIndex + 1 >= prompts.length ? 'Final Scores 🏁' : 'Next Round →'}
        </button>
      </div>
    </div>
  )
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function formatPrompt(text: string) {
  const parts = text.split('___')
  if (parts.length === 1) return <>{text}</>
  return (
    <>{parts.map((p, i) => (
      <span key={i}>{p}{i < parts.length - 1 && <span className="inline-block border-b-2 border-white/60 w-14 mx-1 align-bottom" />}</span>
    ))}</>
  )
}
