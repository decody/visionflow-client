import type {
  IPartnershipInquiry,
  PartnershipInquiryCompanySize,
  PartnershipInquiryStatus,
  PartnershipInquiryType,
} from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { auth } from '../../../auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const STATUS_VALUES: PartnershipInquiryStatus[] = [
  'pending',
  'reviewing',
  'approved',
  'rejected',
];

const COMPANY_SIZE_VALUES: PartnershipInquiryCompanySize[] = [
  '1',
  '2-10',
  '11-50',
  '50+',
];

const PARTNERSHIP_TYPE_VALUES: PartnershipInquiryType[] = [
  'outsourcing',
  'reseller',
  'tech_partner',
  'content_partner',
  'etc',
];

type PartnershipInquiryPayload = {
  attachment_name?: string | null;
  attachment_size?: number | null;
  attachment_type?: string | null;
  attachment_url?: string | null;
  company_name?: string;
  company_size?: PartnershipInquiryCompanySize;
  company_url?: string | null;
  contact_email?: string;
  contact_name?: string;
  contact_phone?: string | null;
  contact_position?: string;
  partnership_type?: PartnershipInquiryType;
  proposal_content?: string;
};

const MAX_SHORT_TEXT_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_URL_LENGTH = 500;
const MAX_PROPOSAL_LENGTH = 5000;
const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_BUCKET = 'partnership-attachments';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();

  return trimmed || null;
};

const toPayloadFromFormData = (formData: FormData) => {
  const getText = (key: string) => {
    const value = formData.get(key);

    return typeof value === 'string' ? value : undefined;
  };

  return {
    attachment_name: getText('attachment_name') ?? null,
    attachment_size: Number(getText('attachment_size')) || null,
    attachment_type: getText('attachment_type') ?? null,
    attachment_url: getText('attachment_url') ?? null,
    company_name: getText('company_name'),
    company_size: getText(
      'company_size',
    ) as PartnershipInquiryCompanySize,
    company_url: getText('company_url') ?? null,
    contact_email: getText('contact_email'),
    contact_name: getText('contact_name'),
    contact_phone: getText('contact_phone') ?? null,
    contact_position: getText('contact_position'),
    partnership_type: getText(
      'partnership_type',
    ) as PartnershipInquiryType,
    proposal_content: getText('proposal_content'),
  } satisfies PartnershipInquiryPayload;
};

const ensureAttachmentBucket = async () => {
  const { error } = await supabaseAdmin.storage.getBucket(
    ATTACHMENT_BUCKET,
  );

  if (!error) {
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(
    ATTACHMENT_BUCKET,
    {
      public: false,
    },
  );

  if (createError && createError.message !== 'Bucket already exists') {
    throw createError;
  }
};

const getFileExtension = (fileName: string) => {
  const extension = fileName.match(/\.[a-z0-9]{1,12}$/i)?.[0];

  return extension?.toLowerCase() ?? '';
};

const uploadAttachment = async (file: File) => {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      error: 'attachment must be 20MB or smaller.',
    };
  }

  await ensureAttachmentBucket();

  const today = new Date().toISOString().slice(0, 10);
  const storagePath = `partnership-inquiries/${today}/${randomUUID()}${getFileExtension(
    file.name,
  )}`;
  const { error } = await supabaseAdmin.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    attachment_name: file.name,
    attachment_size: file.size,
    attachment_type: file.type || null,
    attachment_url: storagePath,
  } satisfies Pick<
    PartnershipInquiryPayload,
    | 'attachment_name'
    | 'attachment_size'
    | 'attachment_type'
    | 'attachment_url'
  >;
};

const getMultipartPayload = async (
  request: NextRequest,
): Promise<
  PartnershipInquiryPayload | {
    error: string;
  }
> => {
  const formData = await request.formData();
  const payload = toPayloadFromFormData(formData);
  const normalizedPayload = normalizePayload(payload);
  const attachment = formData.get('attachment');

  if ('error' in normalizedPayload) {
    return normalizedPayload;
  }

  if (attachment instanceof File && attachment.size > 0) {
    const uploadResult = await uploadAttachment(attachment);

    if ('error' in uploadResult) {
      return uploadResult;
    }

    return {
      ...payload,
      ...uploadResult,
    };
  }

  return payload;
};

const normalizePayload = (
  payload: PartnershipInquiryPayload,
):
  | Omit<IPartnershipInquiry, 'id'>
  | {
      error: string;
    } => {
  const companyName = payload.company_name?.trim();
  const contactName = payload.contact_name?.trim();
  const contactEmail = payload.contact_email?.trim();
  const contactPosition = payload.contact_position?.trim();
  const proposalContent = payload.proposal_content?.trim();
  const companySize = payload.company_size;
  const partnershipType = payload.partnership_type;
  const companyUrl = normalizeOptionalText(payload.company_url);

  if (
    !companyName ||
    !companySize ||
    !contactName ||
    !contactEmail ||
    !contactPosition ||
    !partnershipType ||
    !proposalContent
  ) {
    return {
      error:
        'company_name, company_size, contact_name, contact_email, contact_position, partnership_type, and proposal_content are required.',
    };
  }

  if (!COMPANY_SIZE_VALUES.includes(companySize)) {
    return { error: 'company_size is invalid.' };
  }

  if (!PARTNERSHIP_TYPE_VALUES.includes(partnershipType)) {
    return { error: 'partnership_type is invalid.' };
  }

  if (
    companyName.length > MAX_SHORT_TEXT_LENGTH ||
    contactName.length > MAX_SHORT_TEXT_LENGTH ||
    contactPosition.length > MAX_SHORT_TEXT_LENGTH
  ) {
    return {
      error: `company_name, contact_name, and contact_position must be ${MAX_SHORT_TEXT_LENGTH} characters or fewer.`,
    };
  }

  if (
    contactEmail.length > MAX_EMAIL_LENGTH ||
    !EMAIL_PATTERN.test(contactEmail)
  ) {
    return { error: 'contact_email must be a valid email address.' };
  }

  if (companyUrl && companyUrl.length > MAX_URL_LENGTH) {
    return {
      error: `company_url must be ${MAX_URL_LENGTH} characters or fewer.`,
    };
  }

  if (proposalContent.length > MAX_PROPOSAL_LENGTH) {
    return {
      error: `proposal_content must be ${MAX_PROPOSAL_LENGTH} characters or fewer.`,
    };
  }

  const now = new Date().toISOString();

  return {
    admin_memo: null,
    attachment_name: normalizeOptionalText(payload.attachment_name),
    attachment_size:
      typeof payload.attachment_size === 'number' &&
      Number.isFinite(payload.attachment_size)
        ? payload.attachment_size
        : null,
    attachment_type: normalizeOptionalText(payload.attachment_type),
    attachment_url: normalizeOptionalText(payload.attachment_url),
    company_name: companyName,
    company_size: companySize,
    company_url: companyUrl,
    contact_email: contactEmail,
    contact_name: contactName,
    contact_phone: normalizeOptionalText(payload.contact_phone),
    contact_position: contactPosition,
    created_at: now,
    partnership_type: partnershipType,
    proposal_content: proposalContent,
    status: 'pending',
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
      .from('partnership_inquiries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return jsonError(
        'Failed to load partnership inquiries.',
        502,
        error,
      );
    }

    return NextResponse.json((data ?? []) as IPartnershipInquiry[]);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const rawPayload =
      contentType.includes('multipart/form-data')
        ? await getMultipartPayload(request)
        : ((await request.json()) as PartnershipInquiryPayload);

    if ('error' in rawPayload) {
      return jsonError(rawPayload.error, 400);
    }

    const payload = normalizePayload(rawPayload);

    if ('error' in payload) {
      return jsonError(payload.error, 400);
    }

    const { data: inquiry, error } = await supabaseAdmin
      .from('partnership_inquiries')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      return jsonError(
        'Failed to create partnership inquiry.',
        502,
        error,
      );
    }

    return NextResponse.json(inquiry as IPartnershipInquiry, {
      status: 201,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const body = (await request.json()) as {
      admin_memo?: string | null;
      id?: string;
      status?: PartnershipInquiryStatus;
    };
    const id = body.id?.trim();

    if (!id) {
      return jsonError('id is required.', 400);
    }

    const updates: Partial<IPartnershipInquiry> = {
      updated_at: new Date().toISOString(),
    };

    if (body.status !== undefined) {
      if (!STATUS_VALUES.includes(body.status)) {
        return jsonError('Invalid status.', 400);
      }

      updates.status = body.status;
    }

    if (body.admin_memo !== undefined) {
      updates.admin_memo = body.admin_memo?.trim() || null;
    }

    const { data, error } = await supabaseAdmin
      .from('partnership_inquiries')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return jsonError(
        'Failed to update partnership inquiry.',
        502,
        error,
      );
    }

    return NextResponse.json(data as IPartnershipInquiry);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
