import { NextRequest, NextResponse } from 'next/server';
import { fetchChesscomRecentGames } from '@/lib/chesscom';

export async function GET(
  request: NextRequest,
  { params }: { params: { username: string } }
) {
  const username = params.username;
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    const games = await fetchChesscomRecentGames(username, limit);
    return NextResponse.json({ username, count: games.length, games });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch games' }, { status: 500 });
  }
}
