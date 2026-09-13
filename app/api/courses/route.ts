import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_COURSES } from '@/lib/initialData';

export async function GET() {
  return NextResponse.json({ courses: INITIAL_COURSES });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, course: body });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
