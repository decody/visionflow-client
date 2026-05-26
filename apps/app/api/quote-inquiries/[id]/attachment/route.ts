import type { IQuoteInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ATTACHMENT_BUCKET = 'quote-attachments';

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

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

const parseStoredAttachment = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const match = value.match(/^(?<name>.+) \((?<path>quote-inquiries\/.+)\)$/);

  if (!match?.groups?.path) {
    return null;
  }

  return {
    name: match.groups.name?.trim() || 'attachment',
    path: match.groups.path,
  };
};

export async function GET(
  request: NextRequest,
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
      .from('quote_inquiries')
      .select('id, attached_files')
      .eq('id', id)
      .single();

    if (inquiryError) {
      return jsonError('Failed to load quote inquiry attachment.', 502, inquiryError);
    }

    const index = Number(request.nextUrl.searchParams.get('index') ?? '0');
    const attachmentValue = (
      (inquiry as Pick<IQuoteInquiry, 'attached_files'>).attached_files ?? []
    )[Number.isInteger(index) && index >= 0 ? index : 0];
    const attachment = parseStoredAttachment(attachmentValue);

    if (!attachment) {
      return jsonError('Attachment file is not available.', 404);
    }

    const { data: file, error: downloadError } = await supabaseAdmin.storage
      .from(ATTACHMENT_BUCKET)
      .download(attachment.path);

    if (downloadError || !file) {
      return jsonError('Failed to download attachment file.', 502, downloadError);
    }

    const headers = new Headers({
      'Cache-Control': 'private, max-age=0, no-store',
      'Content-Disposition': encodeContentDispositionFilename(attachment.name),
      'Content-Type': file.type || 'application/octet-stream',
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
