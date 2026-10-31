import { NextResponse } from 'next/server';
import { publisherStatus } from '@/lib/publishers';
export const dynamic = 'force-dynamic';
export async function GET() { return NextResponse.json(publisherStatus()); }
