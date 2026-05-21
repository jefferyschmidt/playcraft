export type GameType =
  | 'truth-or-dare'
  | 'would-you-rather'
  | 'never-have-i-ever'
  | 'hot-takes'
  | 'trivia'
  | 'most-likely-to'
  | 'cards-against'

export type ContentLevel = 'family' | 'teen' | 'adult' | 'very-adult'

export interface PlayerMeta {
  pronouns?: 'he/him' | 'she/her' | 'they/them'
  partner?: string
}

export interface GameConfig {
  type: GameType
  theme: string
  players: string[]
  contentLevel: ContentLevel
  cardCount: number
  cardFilter?: 'both' | 'truths-only' | 'dares-only'
  playerMeta?: Record<string, PlayerMeta>
  multiplayerMode?: 'shared' | 'individual'
}

export interface TruthOrDareCard {
  id: string
  kind: 'truth' | 'dare'
  content: string
  tier?: 'mild' | 'medium' | 'wild'
}

export interface WouldYouRatherCard {
  id: string
  optionA: string
  optionB: string
}

export interface NeverHaveIEverCard {
  id: string
  statement: string
}

export interface TriviaCard {
  id: string
  question: string
  options: [string, string, string, string]
  answerIndex: number
  category: string
}

export interface HotTakeCard {
  id: string
  statement: string
}

export interface MostLikelyToCard {
  id: string
  statement: string
}

/** Cards Against Humanity / Apples to Apples style */
export interface CardsAgainstCard {
  id: string
  /** 'prompt' = black card (question or fill-in-the-blank); 'response' = white card (answer) */
  cardType: 'prompt' | 'response'
  content: string
  /** Number of ___ blanks in a prompt card (1 or 2) */
  blanks?: number
}

export type GameCard =
  | TruthOrDareCard
  | WouldYouRatherCard
  | NeverHaveIEverCard
  | TriviaCard
  | HotTakeCard
  | MostLikelyToCard
  | CardsAgainstCard

export interface Game {
  id: string
  config: GameConfig
  cards: GameCard[]
  createdAt: number
}

export interface PlayerStats {
  truths: number; dares: number; chickens: number
  correct: number; incorrect: number
  haveCount: number
  agrees: number; disagrees: number; wilds: number
  votesReceived: number
}

export interface SharedGameState {
  phase: 'playing' | 'done'
  cardIndex: number
  playerTurnIndex: number
  scores: Record<string, number>
  lives: Record<string, number>
  stats: Record<string, PlayerStats>
  revealed: boolean
  ante: number | null
  /** currentCardId: set when ante is picked for T&D tiered draw; null otherwise */
  currentCardId: string | null
  /** Per-card per-player votes; reset each card. Shape varies by game type. */
  votes: Record<string, unknown>
  wyrGroupStats: Record<string, { a: number; b: number; labelA: string; labelB: string }>
  ca: {
    roundIndex: number
    czarIndex: number
    phase: 'pick' | 'judge' | 'winner'
    pickerIndex: number
    submissions: { player: string; cardId: string }[]
    winner: string | null
    hands: Record<string, string[]>
    usedResponseIds: string[]
  } | null
  version: number
}
