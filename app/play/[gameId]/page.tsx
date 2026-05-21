import { notFound } from 'next/navigation'
import { getGame } from '@/lib/store'
import GamePlayer from './GamePlayer'

export default async function PlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const game = await getGame(gameId)

  if (!game) {
    notFound()
  }

  return <GamePlayer game={game} />
}
