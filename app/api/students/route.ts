import { NextRequest, NextResponse } from 'next/server';
import { INITIAL_STUDENTS } from '@/lib/initialData';

export async function GET() {
  return NextResponse.json({ students: INITIAL_STUDENTS });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, student: body });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
