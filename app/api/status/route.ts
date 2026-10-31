import { NextResponse } from 'next/server';
import { featureStatus } from '@/lib/env';
export const dynamic = 'force-dynamic';
// Reports which features are configured. Only booleans and env var *names* are exposed.
export async function GET() { return NextResponse.json(featureStatus()); }
