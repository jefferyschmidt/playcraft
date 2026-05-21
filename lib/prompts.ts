import type { GameConfig, GameType } from './types'

const contentDescriptions: Record<string, string> = {
  family:
    'completely family-friendly and appropriate for all ages including children. No violence, romance, suggestive themes, or adult content whatsoever.',
  teen:
    'appropriate for teenagers 13+. Can include mild awkward situations, crushes, school/social drama, light embarrassment, but absolutely nothing sexually explicit or graphically violent.',
  adult:
    'for adults 18+. Can include sexual innuendo, flirting, drinking, mature relationship themes, crude humor, and mildly suggestive content. Keep it fun and cheeky.',
  'very-adult':
    'for adults 18+ who want explicitly raunchy content. Include sexually explicit scenarios, very graphic content, adult humor. Go all out — nothing is off limits.',
}

const gameDescriptions: Record<GameType, string> = {
  'truth-or-dare': 'Truth or Dare',
  'would-you-rather': 'Would You Rather',
  'never-have-i-ever': 'Never Have I Ever',
  'hot-takes': 'Hot Takes',
  trivia: 'Trivia',
  'most-likely-to': 'Most Likely To',
  'cards-against': 'Cards Against',
}

function getSchemaDescription(type: GameType, players: string[], cardCount: number, cardFilter?: 'both' | 'truths-only' | 'dares-only'): string {
  const playerNote =
    players.length > 0
      ? `The players are: ${players.join(', ')}. You may mention other players by name within a card's text (e.g. "Have you ever lied to ${players[0]}?") but ALWAYS address the card recipient as "you" — never write "Alex, do X" or "Alex must...". Cards are dealt randomly so the named player may not be the one receiving the card.`
      : 'Players are unnamed, so keep prompts generic.'

  switch (type) {
    case 'truth-or-dare': {
      let kindInstruction: string
      let kindSchema: string
      if (cardFilter === 'truths-only') {
        kindInstruction = 'Generate ONLY truth prompts — no dares at all.'
        kindSchema = '"truth"'
      } else if (cardFilter === 'dares-only') {
        kindInstruction = 'Generate ONLY dare prompts — no truths at all.'
        kindSchema = '"dare"'
      } else {
        kindInstruction = 'Mix roughly 50/50 truths and dares.'
        kindSchema = '"truth"|"dare"'
      }
      return `Generate truth/dare cards. Return JSON: {"cards": [{"kind": ${kindSchema}, "content": "..."}]}
${playerNote}
${kindInstruction} Truths: revealing questions addressed as "What is your..." / "Have you ever...". Dares: actionable physical or social challenges addressed as "You must..." / "Do your best...". If couples are present, include some couple-specific dares like "Give your partner a compliment" or "Tell your partner something you've never said out loud."`
    }

    case 'would-you-rather':
      return `Generate Would You Rather scenarios with two compelling options. Return JSON: {"cards": [{"optionA": "...", "optionB": "..."}]}
Each option should start with a verb (e.g. "Eat a bug" vs "Drink spoiled milk"). Make both options genuinely difficult to choose between.${players.length > 0 ? ` You may reference the players (${players.join(', ')}) in some options to make them personal.` : ''}`

    case 'never-have-i-ever':
      return `Generate Never Have I Ever statements. Return JSON: {"cards": [{"statement": "Never have I ever..."}]}
${playerNote}
Each statement should start with "Never have I ever" and describe something surprising but plausible that some people in the group may have done. If couples are present, include some romantic/relationship statements.`

    case 'trivia':
      return `Generate trivia questions with 4 multiple choice options. Return JSON: {"cards": [{"question": "...", "options": ["A...", "B...", "C...", "D..."], "answerIndex": 0, "category": "..."}]}
answerIndex is 0-3 indicating which option is correct. Make questions engaging and varied in difficulty.`

    case 'hot-takes':
      return `Generate spicy, debate-worthy opinion statements. Return JSON: {"cards": [{"statement": "..."}]}
Each statement should be a bold, possibly controversial opinion that sparks discussion. Examples: "Pineapple on pizza is actually good", "Morning people are insufferable". Make them fun and argumentative.`

    case 'most-likely-to':
      return `Generate "Most Likely To" statements. Return JSON: {"cards": [{"statement": "Most likely to..."}]}
${playerNote}
Each statement should describe a funny, relatable, or surprising scenario. Players vote for who in the group fits best.`

    case 'cards-against': {
      const promptCount = cardCount
      const responseCount = Math.round(cardCount * 5)
      return `Generate a Cards Against Humanity / Apples to Apples style card deck.

Return JSON in this exact format:
{
  "prompts": ["string", ...],
  "responses": ["string", ...]
}

PROMPT CARDS (black cards) — generate ${promptCount}:
- Mix of questions (~40%) and fill-in-the-blank statements (~60%)
- Use ___ for blanks (can have 1 or 2 blanks per card)
- Examples: "What's the secret ingredient?", "I never expected ___ to save my marriage.", "___ + ___ = a perfect evening."
- Make them open-ended so any response card can be hilarious

RESPONSE CARDS (white cards) — generate ${responseCount}:
- Short noun phrases, concepts, people, objects, or actions
- Should be diverse: absurd, mundane, specific, vague, highbrow, lowbrow
- Examples: "A really long receipt", "Emotional damage", "My step-dad's fishing boat", "The concept of time", "Doing it for the gram"
- They should work (hilariously or not) with many different prompt cards`
    }
  }
}

export function buildPrompt(config: GameConfig): { system: string; user: string } {
  const theme = config.theme?.trim() || 'general party game'
  const cardCount = config.cardCount || 20

  // Build player detail lines (pronouns + couple info)
  const playerDetailLines: string[] = []
  if (config.playerMeta && config.players.length > 0) {
    for (const name of config.players) {
      const meta = config.playerMeta[name]
      if (!meta) continue
      const parts: string[] = []
      if (meta.pronouns) parts.push(`pronouns: ${meta.pronouns}`)
      if (meta.partner) parts.push(`coupled with ${meta.partner}`)
      if (parts.length > 0) playerDetailLines.push(`  - ${name}: ${parts.join(', ')}`)
    }
  }
  const playerDetailsSection = playerDetailLines.length > 0
    ? `\nPlayer details (use correct pronouns; reference couples in relevant cards):\n${playerDetailLines.join('\n')}`
    : ''

  const system = `You are a creative party game content generator. Your job is to create fun, engaging game content.
Content level: ${contentDescriptions[config.contentLevel]}
Theme/context: ${theme}${playerDetailsSection}
Return ONLY valid JSON — no explanation, no markdown fences, just the raw JSON object.`

  const responseCount = Math.round(cardCount * 5)
  const cardCountDesc = config.type === 'cards-against'
    ? `${cardCount} prompt cards (plus ~${responseCount} response cards)`
    : `${cardCount} cards`

  const user = `Generate a "${gameDescriptions[config.type]}" game with ${cardCountDesc}.

${getSchemaDescription(config.type, config.players, cardCount, config.cardFilter)}

Rules:
- Content level: ${contentDescriptions[config.contentLevel]}
- Theme/context to incorporate: ${theme}
- Make every card unique and entertaining
- Vary the difficulty/intensity throughout
- Return ONLY the JSON object, nothing else`

  return { system, user }
}
