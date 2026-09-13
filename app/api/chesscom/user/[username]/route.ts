import { NextRequest, NextResponse } from 'next/server';
import { fetchChesscomPlayer, fetchChesscomStats } from '@/lib/chesscom';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username;
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  const [player, stats] = await Promise.all([
    fetchChesscomPlayer(username),
    fetchChesscomStats(username),
  ]);

  if (!player && !stats) {
    return NextResponse.json(
      { error: 'Player not found on Chess.com', username },
      { status: 404 }
    );
  }

  return NextResponse.json({ player, stats });
}
