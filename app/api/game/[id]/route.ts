import { NextRequest, NextResponse } from 'next/server'
import { getGame, updateGameCards } from '@/lib/store'
import type { GameCard } from '@/lib/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const game = await getGame(id)
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  return NextResponse.json(game)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { cards } = (await request.json()) as { cards: GameCard[] }
  const updated = await updateGameCards(id, cards)
  if (!updated) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  return NextResponse.json({ ok: true, cardCount: updated.cards.length })
}
