import type { IQuickInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { auth } from '../../../auth';

export const dynamic = 'force-dynamic';

type QuickInquiryPayload = {
  content?: string;
  email?: string;
  name?: string;
  subject?: string | null;
};

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;
const MAX_CONTENT_LENGTH = 5000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const normalizePayload = (
  payload: QuickInquiryPayload,
):
  | {
      content: string;
      created_at: string;
      email: string;
      name: string;
      status: 'pending';
      subject: string | null;
      updated_at: string;
    }
  | {
      error: string;
    } => {
  const name = payload.name?.trim();
  const email = payload.email?.trim();
  const subject = payload.subject?.trim() || null;
  const content = payload.content?.trim();

  if (!name || !email || !content) {
    return { error: 'name, email, and content are required.' };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return {
      error: `name must be ${MAX_NAME_LENGTH} characters or fewer.`,
    };
  }

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: 'email must be a valid email address.' };
  }

  if (subject && subject.length > MAX_SUBJECT_LENGTH) {
    return {
      error: `subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`,
    };
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return {
      error: `content must be ${MAX_CONTENT_LENGTH} characters or fewer.`,
    };
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
    const { data, error } = await supabaseAdmin
      .from('quick_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return jsonError('Failed to load quick inquiries.', 502, error);
    }

    return NextResponse.json((data ?? []) as IQuickInquiry[]);
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

    if ('error' in payload) {
      return jsonError(payload.error, 400);
    }

    const { data: inquiry, error } = await supabaseAdmin
      .from('quick_inquiries')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to create quick inquiry.', 502, error);
    }

    return NextResponse.json(inquiry as IQuickInquiry, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
