import { NextResponse } from 'next/server';
import { featureStatus } from '@/lib/env';
import { sanitize } from '@/lib/publicStatus';
export const dynamic = 'force-dynamic';
// Reports which features are available. Only booleans are meaningful; configuration details are stripped.
export async function GET() { return NextResponse.json(sanitize(featureStatus())); }
