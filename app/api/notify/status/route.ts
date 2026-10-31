import { NextResponse } from 'next/server';
import { NOTIFY, notifyMissing } from '@/lib/notify';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json(Object.fromEntries(Object.entries(NOTIFY).map(([k, v]) => [k, { label: v.label, ok: !notifyMissing(k as keyof typeof NOTIFY).length, missing: notifyMissing(k as keyof typeof NOTIFY) }]))); }
