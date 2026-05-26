import type { IPartnershipInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ATTACHMENT_BUCKET = 'partnership-attachments';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const isStoragePath = (value?: string | null): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  !/^(?:https?:|data:|\/)/i.test(value);

const encodeContentDispositionFilename = (fileName: string) => {
  const fallback =
    fileName
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/["\\]/g, '_')
      .trim() || 'attachment';
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  const { id } = await params;

  if (!id?.trim()) {
    return jsonError('id is required.', 400);
  }

  try {
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from('partnership_inquiries')
      .select(
        'id, attachment_name, attachment_size, attachment_type, attachment_url',
      )
      .eq('id', id)
      .single();

    if (inquiryError) {
      return jsonError(
        'Failed to load partnership inquiry attachment.',
        502,
        inquiryError,
      );
    }

    const attachment = inquiry as Pick<
      IPartnershipInquiry,
      | 'attachment_name'
      | 'attachment_size'
      | 'attachment_type'
      | 'attachment_url'
      | 'id'
    >;

    if (!isStoragePath(attachment.attachment_url)) {
      return jsonError('Attachment file is not available.', 404);
    }

    const { data: file, error: downloadError } = await supabaseAdmin.storage
      .from(ATTACHMENT_BUCKET)
      .download(attachment.attachment_url);

    if (downloadError || !file) {
      return jsonError(
        'Failed to download attachment file.',
        502,
        downloadError,
      );
    }

    const fileName = attachment.attachment_name || 'attachment';
    const headers = new Headers({
      'Cache-Control': 'private, max-age=0, no-store',
      'Content-Disposition': encodeContentDispositionFilename(fileName),
      'Content-Type':
        attachment.attachment_type ||
        file.type ||
        'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    });

    return new NextResponse(file, { headers });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
