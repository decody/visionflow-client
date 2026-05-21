import type { IQuickInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '../../../auth';

export const dynamic = 'force-dynamic';

type QuickInquiryPayload = {
  content?: string;
  email?: string;
  name?: string;
  subject?: string | null;
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const getSupabaseRestUrl = () => {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');

  return `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/quick_inquiries`;
};

const getServiceHeaders = (prefer?: string): HeadersInit => {
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
};

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const parseProviderError = async (response: Response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

const normalizePayload = (payload: QuickInquiryPayload) => {
  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const subject = payload.subject?.trim() || null;
  const content = payload.content?.trim();

  if (!name || !email || !content) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    content,
    created_at: now,
    email,
    name,
    status: 'pending',
    subject,
    updated_at: now,
  };
};

export async function GET() {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const url = new URL(getSupabaseRestUrl());
    url.searchParams.set('select', '*');
    url.searchParams.set('order', 'created_at.desc');

    const response = await fetch(url, {
      headers: getServiceHeaders(),
      method: 'GET',
    });

    if (!response.ok) {
      return jsonError(
        'Failed to load quick inquiries.',
        502,
        await parseProviderError(response),
      );
    }

    const rows = (await response.json()) as IQuickInquiry[];

    return NextResponse.json(rows);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = normalizePayload(
      (await request.json()) as QuickInquiryPayload,
    );

    if (!payload) {
      return jsonError('name, email, and content are required.', 400);
    }

    const url = new URL(getSupabaseRestUrl());
    url.searchParams.set('select', '*');

    const response = await fetch(url, {
      body: JSON.stringify(payload),
      headers: getServiceHeaders('return=representation'),
      method: 'POST',
    });

    if (!response.ok) {
      return jsonError(
        'Failed to create quick inquiry.',
        502,
        await parseProviderError(response),
      );
    }

    const rows = (await response.json()) as IQuickInquiry[];
    const inquiry = rows[0];

    if (!inquiry) {
      return jsonError('Created inquiry was not returned.', 502);
    }

    return NextResponse.json(inquiry, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
