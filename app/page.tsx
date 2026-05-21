'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { nanoid } from 'nanoid'
import type { GameType, ContentLevel, Game, CardsAgainstCard, GameCard, PlayerMeta } from '@/lib/types'

/* ──────────────────── Game type definitions ──────────────────── */

interface GameTypeInfo {
  type: GameType
  label: string
  emoji: string
  desc: string
  color: string
  border: string
  glow: string
  badge?: string
}

const GAME_TYPES: GameTypeInfo[] = [
  {
    type: 'truth-or-dare',
    label: 'Truth or Dare',
    emoji: '🎲',
    desc: 'Classic party game — reveal secrets or accept wild challenges',
    color: 'from-violet-600 to-purple-700',
    border: 'border-violet-500/40',
    glow: 'hover:shadow-violet-500/20',
  },
  {
    type: 'would-you-rather',
    label: 'Would You Rather',
    emoji: '🤔',
    desc: 'Choose between two impossible options — group debates included',
    color: 'from-blue-600 to-cyan-600',
    border: 'border-blue-500/40',
    glow: 'hover:shadow-blue-500/20',
  },
  {
    type: 'never-have-i-ever',
    label: 'Never Have I Ever',
    emoji: '🍻',
    desc: "Confess what you've done — see who's the wildest",
    color: 'from-emerald-600 to-teal-600',
    border: 'border-emerald-500/40',
    glow: 'hover:shadow-emerald-500/20',
  },
  {
    type: 'trivia',
    label: 'Trivia',
    emoji: '🧠',
    desc: 'Themed questions with multiple choice — compete for the crown',
    color: 'from-amber-500 to-orange-600',
    border: 'border-amber-500/40',
    glow: 'hover:shadow-amber-500/20',
  },
  {
    type: 'hot-takes',
    label: 'Hot Takes',
    emoji: '🔥',
    desc: 'Bold opinions designed to spark heated debate',
    color: 'from-red-600 to-rose-600',
    border: 'border-red-500/40',
    glow: 'hover:shadow-red-500/20',
  },
  {
    type: 'most-likely-to',
    label: 'Most Likely To',
    emoji: '👆',
    desc: "Vote for who in the group is most likely to — hilariously accurate",
    color: 'from-pink-600 to-fuchsia-600',
    border: 'border-pink-500/40',
    glow: 'hover:shadow-pink-500/20',
  },
  {
    type: 'cards-against',
    label: 'Cards Against…',
    emoji: '🃏',
    desc: 'AI-generated fill-in-the-blank party game — fully customizable deck',
    color: 'from-slate-700 to-zinc-800',
    border: 'border-white/30',
    glow: 'hover:shadow-white/10',
    badge: 'Customizable',
  },
]

const CONTENT_LEVELS: {
  level: ContentLevel
  label: string
  emoji: string
  desc: string
  warning?: string
}[] = [
  { level: 'family', label: 'Family Fun', emoji: '👨‍👩‍👧', desc: 'All ages welcome — totally clean' },
  { level: 'teen', label: 'Teen', emoji: '🎒', desc: 'Ages 13+ — mild, school-safe awkwardness' },
  {
    level: 'adult',
    label: 'Adult',
    emoji: '🍸',
    desc: 'Ages 18+ — flirty, suggestive, party vibes',
    warning: '18+',
  },
  {
    level: 'very-adult',
    label: 'Very Adult',
    emoji: '🌶️',
    desc: 'Ages 18+ — explicit, raunchy, nothing off limits',
    warning: '18+ EXPLICIT',
  },
]

/* ──────────────────── Wizard ──────────────────── */

type Step = 'type' | 'content' | 'players' | 'theme' | 'generating' | 'customize' | 'ready'

export default function Home() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<GameType | null>(null)
  const [contentLevel, setContentLevel] = useState<ContentLevel>('teen')
  const [cardCount, setCardCount] = useState(20)
  const [players, setPlayers] = useState<string[]>(['', ''])
  // playerMeta keyed by player index; converted to name-keyed map on submit
  const [playerMeta, setPlayerMeta] = useState<Record<number, { pronouns?: PlayerMeta['pronouns']; partnerIndex?: number }>>({})
  const [multiplayerMode, setMultiplayerMode] = useState<'shared' | 'individual'>('shared')
  const [theme, setTheme] = useState('')
  const [cardFilter, setCardFilter] = useState<'both' | 'truths-only' | 'dares-only'>('both')
  const [error, setError] = useState('')
  const [generatedId, setGeneratedId] = useState('')
  const [copied, setCopied] = useState(false)

  // Customize step state
  const [customizeGame, setCustomizeGame] = useState<Game | null>(null)
  const [customSaving, setCustomSaving] = useState(false)

  const selectedTypeInfo = GAME_TYPES.find((g) => g.type === selectedType)

  /* ── Roster persistence ── */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('playcraft_roster')
      if (raw) {
        const { players: p, playerMeta: m, multiplayerMode: mm } = JSON.parse(raw)
        if (Array.isArray(p) && p.length >= 2) setPlayers(p)
        if (m && typeof m === 'object') {
          const restored: typeof playerMeta = {}
          for (const [k, v] of Object.entries(m)) restored[Number(k)] = v as (typeof playerMeta)[number]
          setPlayerMeta(restored)
        }
        if (mm === 'individual') setMultiplayerMode('individual')
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem('playcraft_roster', JSON.stringify({ players, playerMeta, multiplayerMode }))
    } catch {}
  }, [players, playerMeta, multiplayerMode])

  /* ── Helpers ── */
  const updatePlayer = (i: number, val: string) => {
    const next = [...players]; next[i] = val; setPlayers(next)
  }
  const addPlayer = () => setPlayers([...players, ''])
  function removePlayer(i: number) {
    setPlayerMeta(m => {
      const next: typeof m = {}
      Object.entries(m).forEach(([k, val]) => {
        const key = Number(k)
        if (key === i) return
        const newKey = key > i ? key - 1 : key
        let partnerIndex = val.partnerIndex
        if (partnerIndex === i) partnerIndex = undefined
        else if (partnerIndex !== undefined && partnerIndex > i) partnerIndex--
        next[newKey] = { ...val, partnerIndex }
      })
      return next
    })
    setPlayers(players.filter((_, idx) => idx !== i))
  }
  function setPronouns(i: number, val: PlayerMeta['pronouns']) {
    setPlayerMeta(m => ({ ...m, [i]: { ...m[i], pronouns: val } }))
  }
  function setPartner(i: number, j: number | undefined) {
    setPlayerMeta(m => {
      const next = { ...m }
      // Clear old bidirectional link for i
      const oldJ = m[i]?.partnerIndex
      if (oldJ !== undefined) next[oldJ] = { ...next[oldJ], partnerIndex: undefined }
      // Clear j's previous partner if it wasn't i
      if (j !== undefined) {
        const oldI = m[j]?.partnerIndex
        if (oldI !== undefined && oldI !== i) next[oldI] = { ...next[oldI], partnerIndex: undefined }
        next[j] = { ...next[j], partnerIndex: i }
      }
      next[i] = { ...next[i], partnerIndex: j }
      return next
    })
  }

  /* ── Generate ── */
  async function generate() {
    setStep('generating')
    setError('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify((() => {
          const filteredPlayers = players.filter(p => p.trim())
          // Build name-keyed playerMeta for the API
          const metaForApi: Record<string, PlayerMeta> = {}
          players.forEach((name, i) => {
            if (!name.trim()) return
            const meta = playerMeta[i]
            const pronouns = meta?.pronouns
            const partner = meta?.partnerIndex !== undefined ? players[meta.partnerIndex]?.trim() || undefined : undefined
            if (pronouns || partner) metaForApi[name.trim()] = { ...(pronouns ? { pronouns } : {}), ...(partner ? { partner } : {}) }
          })
          return {
            type: selectedType,
            contentLevel,
            cardCount,
            players: filteredPlayers,
            theme: theme.trim(),
            ...(selectedType === 'truth-or-dare' && cardFilter !== 'both' ? { cardFilter } : {}),
            ...(Object.keys(metaForApi).length > 0 ? { playerMeta: metaForApi } : {}),
            multiplayerMode,
          }
        })()),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setGeneratedId(data.gameId)

      if (selectedType === 'cards-against') {
        // Fetch game to show customization
        const gameRes = await fetch(`/api/game/${data.gameId}`)
        const game: Game = await gameRes.json()
        setCustomizeGame(game)
        setStep('customize')
      } else {
        setStep('ready')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setStep('theme')
    }
  }

  /* ── Save customizations ── */
  async function saveCustomizations() {
    if (!customizeGame) return
    setCustomSaving(true)
    try {
      await fetch(`/api/game/${generatedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: customizeGame.cards }),
      })
      setStep('ready')
    } finally {
      setCustomSaving(false)
    }
  }

  /* ── Share ── */
  const gameUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/play/${generatedId}` : ''

  async function copyLink() {
    await navigator.clipboard.writeText(gameUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ──────────────────── Steps ──────────────────── */

  if (step === 'type') {
    return (
      <Main>
        <div className="text-center mb-12">
          <div className="text-5xl mb-4">🎮</div>
          <h1 className="text-5xl font-black mb-3 gradient-text">PlayCraft</h1>
          <p className="text-lg text-white/60">AI-powered party games, ready to share in seconds</p>
        </div>
        <h2 className="text-2xl font-bold text-center mb-8">What kind of game?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAME_TYPES.map((g) => (
            <button
              key={g.type}
              onClick={() => { setSelectedType(g.type); setCardFilter('both'); setStep('content') }}
              className={`group relative rounded-2xl p-5 text-left transition-all duration-200 border glass hover:shadow-xl hover:-translate-y-0.5 ${g.border} ${g.glow}`}
            >
              {g.badge && (
                <span className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                  {g.badge}
                </span>
              )}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center text-2xl mb-3 group-hover:scale-110 transition-transform`}>
                {g.emoji}
              </div>
              <h3 className="font-bold text-lg mb-1">{g.label}</h3>
              <p className="text-sm text-white/50">{g.desc}</p>
            </button>
          ))}
        </div>
      </Main>
    )
  }

  if (step === 'content') {
    return (
      <Main narrow>
        <BackButton onClick={() => setStep('type')} />
        <StepHeader emoji={selectedTypeInfo?.emoji ?? '🎮'} title={selectedTypeInfo?.label ?? ''} subtitle="Set the content level" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {CONTENT_LEVELS.map((c) => (
            <button
              key={c.level}
              onClick={() => setContentLevel(c.level)}
              className={`relative rounded-2xl p-4 text-left transition-all border glass ${
                contentLevel === c.level
                  ? 'border-purple-500 bg-purple-500/20 shadow-lg shadow-purple-500/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {c.warning && (
                <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/80 text-white">
                  {c.warning}
                </span>
              )}
              <div className="text-2xl mb-2">{c.emoji}</div>
              <div className="font-bold">{c.label}</div>
              <div className="text-sm text-white/50 mt-0.5">{c.desc}</div>
            </button>
          ))}
        </div>
        <div className="glass rounded-2xl p-5 mb-8">
          <label className="block font-semibold mb-3">
            {selectedType === 'cards-against' ? 'Prompt cards: ' : 'Number of cards: '}
            <span className="text-purple-400">{cardCount}</span>
            {selectedType === 'cards-against' && (
              <span className="text-white/30 text-sm font-normal ml-2">
                + ~{Math.round(cardCount * 3.5)} response cards
              </span>
            )}
          </label>
          <input
            type="range"
            min={selectedType === 'cards-against' ? 8 : 10}
            max={selectedType === 'cards-against' ? 30 : 40}
            step={selectedType === 'cards-against' ? 4 : 5}
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
          <div className="flex justify-between text-xs text-white/30 mt-1">
            <span>{selectedType === 'cards-against' ? '8 prompts (quick)' : '10 (quick)'}</span>
            <span>{selectedType === 'cards-against' ? '30 prompts (big deck)' : '40 (marathon)'}</span>
          </div>
        </div>
        {selectedType === 'truth-or-dare' && (
          <div className="glass rounded-2xl p-5 mb-8">
            <label className="block font-semibold mb-3">Card types</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['both', 'Both', '🎲'],
                ['truths-only', 'Truths Only', '📖'],
                ['dares-only', 'Dares Only', '😈'],
              ] as const).map(([val, label, emoji]) => (
                <button
                  key={val}
                  onClick={() => setCardFilter(val)}
                  className={`flex flex-col items-center py-3 rounded-xl border text-sm font-semibold transition-all ${
                    cardFilter === val
                      ? 'border-purple-500 bg-purple-500/20 text-white'
                      : 'border-white/10 hover:border-white/20 glass text-white/60'
                  }`}
                >
                  <span className="text-xl mb-1">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
        <PrimaryButton onClick={() => setStep('players')}>Next: Add Players →</PrimaryButton>
      </Main>
    )
  }

  if (step === 'players') {
    return (
      <Main narrow>
        <BackButton onClick={() => setStep('content')} />
        <StepHeader emoji="👥" title="Who's playing?" subtitle="Optional — add names, pronouns & couples for personalized cards" />
        <div className="space-y-2 mb-4">
          {players.map((p, i) => {
            const meta = playerMeta[i] ?? {}
            const namedPlayers = players.map((n, j) => ({ n, j })).filter(({ n, j }) => j !== i && n.trim())
            return (
              <div key={i} className="glass rounded-2xl border border-white/10 hover:border-white/20 transition-colors p-3">
                {/* Name row */}
                <div className="flex gap-2 mb-2">
                  <input
                    value={p}
                    onChange={(e) => updatePlayer(i, e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    className="flex-1 bg-transparent outline-none text-white placeholder-white/30 text-sm py-1 px-1 border-b border-white/10 focus:border-purple-500 transition-colors"
                  />
                  {players.length > 2 && (
                    <button
                      onClick={() => removePlayer(i)}
                      className="w-7 h-7 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors text-lg flex items-center justify-center shrink-0"
                    >×</button>
                  )}
                </div>
                {/* Pronouns + partner row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1">
                    {(['he/him', 'she/her', 'they/them'] as const).map(pron => (
                      <button
                        key={pron}
                        onClick={() => setPronouns(i, meta.pronouns === pron ? undefined : pron)}
                        className={`px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all ${
                          meta.pronouns === pron
                            ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                            : 'border-white/10 text-white/25 hover:border-white/25 hover:text-white/50'
                        }`}
                      >
                        {pron === 'he/him' ? 'he/him' : pron === 'she/her' ? 'she/her' : 'they/them'}
                      </button>
                    ))}
                  </div>
                  {namedPlayers.length > 0 && (
                    <div className="flex items-center gap-1 ml-auto">
                      <span className="text-xs text-white/25">❤️</span>
                      <select
                        value={meta.partnerIndex ?? ''}
                        onChange={e => setPartner(i, e.target.value === '' ? undefined : Number(e.target.value))}
                        className="text-xs rounded-lg px-2 py-0.5 text-white/50 focus:outline-none focus:border-purple-500 border border-white/10 cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <option value="">No partner</option>
                        {namedPlayers.map(({ n, j }) => (
                          <option key={j} value={j}>{n}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {players.length < 10 && (
          <button
            onClick={addPlayer}
            className="w-full rounded-xl border border-dashed border-white/20 py-3 text-white/40 hover:text-white/70 hover:border-white/40 transition-colors mb-4 text-sm"
          >
            + Add player
          </button>
        )}

        {/* Multiplayer mode */}
        <div className="glass rounded-2xl p-4 mb-8">
          <label className="block font-semibold mb-3 text-sm">How will you play?</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['shared', '📱', 'Pass the Phone', 'One device, take turns'],
              ['individual', '📲', 'Own Devices', 'Each player on their phone'],
            ] as const).map(([val, emoji, label, desc]) => (
              <button
                key={val}
                onClick={() => setMultiplayerMode(val)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  multiplayerMode === val
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-white/10 hover:border-white/20 glass'
                }`}
              >
                <span className="text-xl mb-1">{emoji}</span>
                <span className="font-semibold text-sm">{label}</span>
                <span className="text-xs text-white/40 mt-0.5 leading-tight">{desc}</span>
              </button>
            ))}
          </div>
          {multiplayerMode === 'individual' && players.filter(p => p.trim()).length < 2 && (
            <p className="text-xs text-amber-400 mt-2">⚠️ Add player names so everyone can identify themselves on their device</p>
          )}
        </div>

        <PrimaryButton onClick={() => setStep('theme')}>Next: Set the vibe →</PrimaryButton>
        <button
          onClick={() => setStep('theme')}
          className="w-full mt-3 py-3 text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          Skip — keep it generic
        </button>
      </Main>
    )
  }

  if (step === 'theme') {
    return (
      <Main narrow>
        <BackButton onClick={() => setStep('players')} />
        <StepHeader emoji="✨" title="Set the vibe" subtitle="Give the AI a theme to make your deck unique" />
        <textarea
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder={`e.g. "camping trip with college friends", "office party", "bachelorette in Vegas", "80s nostalgia"...`}
          rows={4}
          className="w-full glass rounded-2xl px-4 py-3 bg-transparent outline-none focus:border-purple-500 border border-white/10 text-white placeholder-white/30 transition-colors resize-none mb-8"
        />
        {error && (
          <div className="rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-3 text-red-300 text-sm mb-4">
            {error}
          </div>
        )}
        <div className="glass rounded-2xl p-4 mb-6 space-y-2 text-sm">
          <SummaryRow label="Game" value={`${selectedTypeInfo?.emoji} ${selectedTypeInfo?.label}`} />
          <SummaryRow label="Content" value={CONTENT_LEVELS.find((c) => c.level === contentLevel)?.label ?? ''} />
          <SummaryRow label="Cards" value={selectedType === 'cards-against' ? `${cardCount} prompts + ~${Math.round(cardCount * 3.5)} responses` : String(cardCount)} />
          {selectedType === 'truth-or-dare' && cardFilter !== 'both' && (
            <SummaryRow label="Type" value={cardFilter === 'truths-only' ? '📖 Truths only' : '😈 Dares only'} />
          )}
          <SummaryRow label="Players" value={players.filter((p) => p.trim()).join(', ') || 'Generic'} />
          <SummaryRow label="Mode" value={multiplayerMode === 'individual' ? '📲 Own Devices' : '📱 Pass the Phone'} />
        </div>
        <PrimaryButton onClick={generate}>🎨 Generate my game!</PrimaryButton>
      </Main>
    )
  }

  if (step === 'generating') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 60%)' }}
      >
        <div className="text-center animate-fadeIn">
          <div className="text-6xl mb-6 animate-pulse2">🎨</div>
          <h2 className="text-3xl font-black mb-3 gradient-text">Crafting your game...</h2>
          <p className="text-white/50 mb-8">
            {selectedType === 'cards-against'
              ? `Generating ${cardCount} prompts and ~${Math.round(cardCount * 3.5)} response cards`
              : `Generating ${cardCount} unique cards`}
          </p>
          <div className="flex gap-2 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (step === 'customize' && customizeGame) {
    return (
      <DeckCustomizer
        game={customizeGame}
        saving={customSaving}
        onChange={setCustomizeGame}
        onSave={saveCustomizations}
        onBack={() => setStep('theme')}
      />
    )
  }

  // step === 'ready'
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 60%)' }}
    >
      <div className="w-full max-w-md text-center animate-slideUp">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-black mb-2 gradient-text">Your game is ready!</h2>
        <p className="text-white/50 mb-8">
          {selectedTypeInfo?.emoji} {selectedTypeInfo?.label} ·{' '}
          {CONTENT_LEVELS.find((c) => c.level === contentLevel)?.label}
        </p>
        <div className="glass rounded-2xl p-4 mb-4 flex items-center gap-3">
          <span className="flex-1 text-sm text-white/60 truncate text-left">{gameUrl}</span>
          <button
            onClick={copyLink}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              copied ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <button
          onClick={() => router.push(`/play/${generatedId}`)}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20 mb-3"
        >
          Play Now! →
        </button>
        {selectedType === 'cards-against' && (
          <button
            onClick={() => setStep('customize')}
            className="w-full py-3 rounded-2xl glass border border-white/20 text-sm font-semibold mb-3 hover:bg-white/10 transition-colors"
          >
            ✏️ Edit Deck Again
          </button>
        )}
        <button
          onClick={() => {
            setStep('type')
            setSelectedType(null)
            setGeneratedId('')
            setTheme('')
            setCardFilter('both')
            // Players/playerMeta/multiplayerMode persist intentionally
            setCustomizeGame(null)
          }}
          className="w-full py-3 text-white/30 hover:text-white/60 text-sm transition-colors"
        >
          Create another game
        </button>
      </div>
    </div>
  )
}

/* ──────────────────── Deck Customizer ──────────────────── */

function DeckCustomizer({
  game,
  saving,
  onChange,
  onSave,
  onBack,
}: {
  game: Game
  saving: boolean
  onChange: (g: Game) => void
  onSave: () => void
  onBack: () => void
}) {
  const [tab, setTab] = useState<'prompt' | 'response'>('prompt')
  const [newCardText, setNewCardText] = useState('')

  const promptCards = game.cards.filter(
    (c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'prompt'
  )
  const responseCards = game.cards.filter(
    (c): c is CardsAgainstCard => 'cardType' in c && (c as CardsAgainstCard).cardType === 'response'
  )

  const updateCard = useCallback(
    (id: string, content: string) => {
      onChange({
        ...game,
        cards: game.cards.map((c) => (c.id === id ? { ...c, content } : c)),
      })
    },
    [game, onChange]
  )

  const deleteCard = useCallback(
    (id: string) => {
      onChange({ ...game, cards: game.cards.filter((c) => c.id !== id) })
    },
    [game, onChange]
  )

  const addCard = () => {
    if (!newCardText.trim()) return
    const newCard: CardsAgainstCard = {
      id: nanoid(8),
      cardType: tab,
      content: newCardText.trim(),
      blanks: tab === 'prompt' ? (newCardText.match(/___/g) ?? []).length || undefined : undefined,
    }
    onChange({ ...game, cards: [...game.cards, newCard] })
    setNewCardText('')
  }

  const shown = tab === 'prompt' ? promptCards : responseCards

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at top, #0a0a1a 0%, #0a0a14 60%)' }}
    >
      {/* Header */}
      <div className="px-4 pt-8 pb-4 max-w-3xl mx-auto w-full">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm mb-6 transition-colors"
        >
          ← Back
        </button>
        <h2 className="text-3xl font-black mb-1">Customize Your Deck</h2>
        <p className="text-white/50 mb-6">
          {promptCards.length} prompt cards · {responseCards.length} response cards
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['prompt', 'response'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all border ${
                tab === t
                  ? t === 'prompt'
                    ? 'bg-zinc-800 border-white/30 text-white'
                    : 'bg-white border-white text-zinc-900'
                  : 'glass border-white/10 text-white/50 hover:border-white/20'
              }`}
            >
              {t === 'prompt' ? `🖤 Prompt Cards (${promptCards.length})` : `🤍 Response Cards (${responseCards.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Card list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 max-w-3xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {shown.map((card) => (
            <EditableCard
              key={card.id}
              card={card}
              onUpdate={(content) => updateCard(card.id, content)}
              onDelete={() => deleteCard(card.id)}
            />
          ))}
        </div>

        {/* Add card input */}
        <div
          className={`rounded-2xl border p-4 flex gap-2 items-start ${
            tab === 'prompt'
              ? 'border-white/20 bg-zinc-900/80'
              : 'border-white/20 bg-white/5'
          }`}
        >
          <textarea
            value={newCardText}
            onChange={(e) => setNewCardText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard() } }}
            placeholder={
              tab === 'prompt'
                ? 'Add a prompt card... use ___ for blanks'
                : 'Add a response card...'
            }
            rows={2}
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder-white/30 resize-none"
          />
          <button
            onClick={addCard}
            disabled={!newCardText.trim()}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-sm font-semibold transition-all"
          >
            Add
          </button>
        </div>
      </div>

      {/* Save footer */}
      <div className="px-4 pb-6 pt-4 max-w-3xl mx-auto w-full">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-slate-700 to-zinc-700 hover:from-slate-600 hover:to-zinc-600 disabled:opacity-60 transition-all border border-white/20"
        >
          {saving ? 'Saving...' : '✓ Looks Good — Let\'s Play!'}
        </button>
      </div>
    </div>
  )
}

function EditableCard({
  card,
  onUpdate,
  onDelete,
}: {
  card: CardsAgainstCard
  onUpdate: (content: string) => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(card.content)
  const isPrompt = card.cardType === 'prompt'

  function save() {
    if (draft.trim()) onUpdate(draft.trim())
    setEditing(false)
  }

  return (
    <div
      className={`group relative rounded-xl p-3 border transition-all ${
        isPrompt
          ? 'bg-zinc-900 border-white/10 hover:border-white/25'
          : 'bg-white/10 border-white/10 hover:border-white/30'
      }`}
    >
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
            rows={3}
            className="w-full bg-transparent outline-none text-sm resize-none"
          />
          <div className="flex gap-2">
            <button onClick={save} className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20">
              Save
            </button>
            <button
              onClick={() => { setDraft(card.content); setEditing(false) }}
              className="text-xs px-2 py-1 rounded-lg text-white/40 hover:text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={`text-sm leading-snug pr-12 ${isPrompt ? 'font-semibold' : ''}`}>
            {card.content}
          </p>
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs"
              title="Edit"
            >
              ✏️
            </button>
            <button
              onClick={onDelete}
              className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-xs"
              title="Delete"
            >
              ×
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ──────────────────── Shared sub-components ──────────────────── */

function Main({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{ background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #0a0a14 60%)' }}
    >
      <div className={`w-full animate-slideUp ${narrow ? 'max-w-2xl' : 'max-w-4xl'}`}>
        {children}
      </div>
    </main>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-sm mb-8 transition-colors"
    >
      ← Back
    </button>
  )
}

function StepHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-8">
      <div className="text-4xl mb-3">{emoji}</div>
      <h2 className="text-3xl font-black mb-1">{title}</h2>
      <p className="text-white/50">{subtitle}</p>
    </div>
  )
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-4 rounded-2xl font-bold text-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20"
    >
      {children}
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/40">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
