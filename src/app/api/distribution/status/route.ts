import { NextRequest, NextResponse } from 'next/server';
import { getStatus } from '@/lib/stepHelpers';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const monthId = new URL(req.url).searchParams.get('month') ?? '';
  if (!monthId) return NextResponse.json({ error: 'Thiếu month' }, { status: 400 });
  const status = await getStatus(monthId);
  return NextResponse.json(status);
}
