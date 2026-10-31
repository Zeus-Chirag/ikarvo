import { NextResponse } from 'next/server';
import { plans } from '@/lib/plans';
import { CREDIT_COSTS } from '@/lib/credits';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json({ ...plans(), costs: CREDIT_COSTS }); }
