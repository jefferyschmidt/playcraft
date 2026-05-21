import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { nanoid } from 'nanoid'
import { saveGame } from '@/lib/store'
import { buildPrompt } from '@/lib/prompts'
import type { GameConfig, Game, GameCard, CardsAgainstCard } from '@/lib/types'

const client = new OpenAI()

async function callOpenAI(system: string, user: string): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    })
    const raw = response.choices[0].message.content ?? ''
    // Strip any accidental markdown fences
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    try {
      return JSON.parse(jsonText) as Record<string, unknown>
    } catch (e) {
      if (attempt === 3) throw e
      console.warn(`JSON parse failed (attempt ${attempt}), retrying...`)
    }
  }
  throw new Error('Failed to parse response after 3 attempts')
}

export async function POST(request: NextRequest) {
  try {
    const config: GameConfig = await request.json()

    if (!config.type || !config.contentLevel) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { system, user } = buildPrompt(config)
    const parsed = await callOpenAI(system, user)

    let cards: GameCard[]

    if (config.type === 'cards-against') {
      const prompts = (parsed.prompts as string[]) ?? []
      const responses = (parsed.responses as string[]) ?? []
      const promptCards: CardsAgainstCard[] = prompts.map((content) => ({
        id: nanoid(8),
        cardType: 'prompt',
        content,
        blanks: (content.match(/___/g) ?? []).length || undefined,
      }))
      const responseCards: CardsAgainstCard[] = responses.map((content) => ({
        id: nanoid(8),
        cardType: 'response',
        content,
      }))
      cards = [...promptCards, ...responseCards]
    } else {
      const rawCards = (parsed.cards as Omit<GameCard, 'id'>[]) ?? []
      cards = rawCards.map((card) => ({ ...card, id: nanoid(8) } as GameCard))
    }

    if (cards.length === 0) {
      return NextResponse.json({ error: 'No cards were generated — try again' }, { status: 500 })
    }

    const game: Game = {
      id: nanoid(10),
      config,
      cards,
      createdAt: Date.now(),
    }

    await saveGame(game)
    return NextResponse.json({ gameId: game.id, cardCount: cards.length })
  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}
