import type { IQuoteInquiry } from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

type QuoteInquiryPayload = {
  attached_files?: string[];
  company_name?: string;
  contact_name?: string;
  email?: string;
  marketing_agreed?: boolean;
  phone?: string | null;
  position?: string | null;
  preferred_contact_methods?: string[];
  preferred_start_date?: string;
  privacy_agreed?: boolean;
  project_description?: string;
  project_scale?: string;
  reference_urls?: string[];
  service_categories?: string[];
};

const MAX_SHORT_TEXT_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_LONG_TEXT_LENGTH = 10000;
const MAX_URL_LENGTH = 500;
const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_BUCKET = 'quote-attachments';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SERVICE_CATEGORY_VALUES = [
  '3d',
  'ad_image',
  'dashboard',
  'web_app',
  'web_dev',
];
const PROJECT_SCALE_VALUES = ['small', 'medium', 'large'];
const START_DATE_VALUES = ['asap', '1month', '3months', 'open'];
const CONTACT_METHOD_VALUES = ['email', 'phone', 'kakao', 'meeting'];

const jsonError = (
  message: string,
  status: number,
  details?: unknown,
) => NextResponse.json({ details, message }, { status });

const normalizeOptionalText = (value?: string | null) => {
  const trimmed = value?.trim();

  return trimmed || null;
};

const parseBoolean = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') {
    return false;
  }

  return value === 'true' || value === '1' || value === 'on';
};

const parseStringArray = (value: FormDataEntryValue | null) => {
  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
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
  const storagePath = `quote-inquiries/${today}/${randomUUID()}${getFileExtension(
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
    attached_files: [`${file.name} (${storagePath})`],
  };
};

const toPayloadFromFormData = async (
  formData: FormData,
): Promise<
  QuoteInquiryPayload | {
    error: string;
  }
> => {
  const getText = (key: string) => {
    const value = formData.get(key);

    return typeof value === 'string' ? value : undefined;
  };
  const attachment = formData.get('attachment');
  const uploaded =
    attachment instanceof File && attachment.size > 0
      ? await uploadAttachment(attachment)
      : { attached_files: [] };

  if ('error' in uploaded) {
    return uploaded;
  }

  return {
    attached_files: uploaded.attached_files,
    company_name: getText('company_name'),
    contact_name: getText('contact_name'),
    email: getText('email'),
    marketing_agreed: parseBoolean(formData.get('marketing_agreed')),
    phone: getText('phone') ?? null,
    position: getText('position') ?? null,
    preferred_contact_methods: parseStringArray(
      formData.get('preferred_contact_methods'),
    ),
    preferred_start_date: getText('preferred_start_date'),
    privacy_agreed: parseBoolean(formData.get('privacy_agreed')),
    project_description: getText('project_description'),
    project_scale: getText('project_scale'),
    reference_urls: parseStringArray(formData.get('reference_urls')),
    service_categories: parseStringArray(formData.get('service_categories')),
  };
};

const normalizePayload = (
  payload: QuoteInquiryPayload,
):
  | Omit<IQuoteInquiry, 'id'>
  | {
      error: string;
    } => {
  const companyName = payload.company_name?.trim();
  const contactName = payload.contact_name?.trim();
  const email = payload.email?.trim();
  const projectDescription = payload.project_description?.trim();
  const projectScale = payload.project_scale?.trim();
  const preferredStartDate = payload.preferred_start_date?.trim();
  const serviceCategories = payload.service_categories ?? [];
  const preferredContactMethods = payload.preferred_contact_methods ?? [];
  const referenceUrls = payload.reference_urls ?? [];

  if (
    !companyName ||
    !contactName ||
    !email ||
    !projectDescription ||
    !projectScale ||
    !preferredStartDate ||
    serviceCategories.length === 0 ||
    preferredContactMethods.length === 0
  ) {
    return {
      error:
        'company_name, contact_name, email, project_description, project_scale, preferred_start_date, service_categories, and preferred_contact_methods are required.',
    };
  }

  if (!payload.privacy_agreed) {
    return { error: 'privacy_agreed is required.' };
  }

  if (
    !serviceCategories.every((value) =>
      SERVICE_CATEGORY_VALUES.includes(value),
    )
  ) {
    return { error: 'service_categories is invalid.' };
  }

  if (!PROJECT_SCALE_VALUES.includes(projectScale)) {
    return { error: 'project_scale is invalid.' };
  }

  if (!START_DATE_VALUES.includes(preferredStartDate)) {
    return { error: 'preferred_start_date is invalid.' };
  }

  if (
    !preferredContactMethods.every((value) =>
      CONTACT_METHOD_VALUES.includes(value),
    )
  ) {
    return { error: 'preferred_contact_methods is invalid.' };
  }

  if (
    companyName.length > MAX_SHORT_TEXT_LENGTH ||
    contactName.length > MAX_SHORT_TEXT_LENGTH ||
    (payload.position?.length ?? 0) > MAX_SHORT_TEXT_LENGTH
  ) {
    return {
      error:
        'company_name, contact_name, and position must be 200 characters or fewer.',
    };
  }

  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return { error: 'email must be a valid email address.' };
  }

  if (projectDescription.length > MAX_LONG_TEXT_LENGTH) {
    return {
      error: `project_description must be ${MAX_LONG_TEXT_LENGTH} characters or fewer.`,
    };
  }

  if (referenceUrls.some((url) => url.length > MAX_URL_LENGTH)) {
    return {
      error: `reference_urls must each be ${MAX_URL_LENGTH} characters or fewer.`,
    };
  }

  const now = new Date().toISOString();
  const marketingAgreed = Boolean(payload.marketing_agreed);

  return {
    admin_memo: null,
    assigned_admin_id: null,
    attached_files: payload.attached_files ?? [],
    company_name: companyName,
    completed_at: null,
    contact_name: contactName,
    contacted_at: null,
    created_at: now,
    email,
    ip_address: null,
    marketing_agreed: marketingAgreed,
    marketing_agreed_at: marketingAgreed ? now : null,
    phone: normalizeOptionalText(payload.phone),
    position: normalizeOptionalText(payload.position),
    preferred_contact_methods: preferredContactMethods,
    preferred_start_date: preferredStartDate,
    privacy_agreed: true,
    privacy_agreed_at: now,
    project_description: projectDescription,
    project_scale: projectScale,
    reference_urls: referenceUrls,
    service_categories: serviceCategories,
    status: 'pending',
    updated_at: now,
    user_agent: null,
  };
};

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    const rawPayload =
      contentType.includes('multipart/form-data')
        ? await toPayloadFromFormData(await request.formData())
        : ((await request.json()) as QuoteInquiryPayload);

    if ('error' in rawPayload) {
      return jsonError(rawPayload.error, 400);
    }

    const payload = normalizePayload(rawPayload);

    if ('error' in payload) {
      return jsonError(payload.error, 400);
    }

    const { data: inquiry, error } = await supabaseAdmin
      .from('quote_inquiries')
      .insert({
        ...payload,
        ip_address:
          request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          null,
        user_agent: request.headers.get('user-agent'),
      })
      .select('*')
      .single();

    if (error) {
      return jsonError('Failed to create quote inquiry.', 502, error);
    }

    return NextResponse.json(inquiry as IQuoteInquiry, {
      status: 201,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : 'Unexpected error',
      500,
    );
  }
}
