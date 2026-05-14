type ReplyPayload = {
  inquiryId?: string;
  inquiry_id?: string;
  repliedBy?: string | null;
  replied_by?: string | null;
  replyContent?: string;
  reply_content?: string;
  subject?: string;
  to?: string;
};

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const toHtml = (value: string) =>
  escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replaceAll('\n', '<br>')}</p>`)
    .join('');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ message: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as ReplyPayload;
    const inquiryId = (payload.inquiryId ?? payload.inquiry_id)?.trim();
    const to = payload.to?.trim();
    const subject = payload.subject?.trim();
    const replyContent = (payload.replyContent ?? payload.reply_content)?.trim();

    if (!inquiryId || !to || !subject || !replyContent) {
      return json(
        {
          message:
            'inquiryId, to, subject, and replyContent are required.',
        },
        { status: 400 },
      );
    }

    const resendApiKey = requiredEnv('RESEND_API_KEY');
    const from = Deno.env.get('RESEND_FROM_EMAIL') ?? 'VisionFlow Admin <support@visionflow.kr>';

    const emailResponse = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from,
        html: toHtml(replyContent),
        subject,
        text: replyContent,
        to,
      }),
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text();

      return json(
        {
          details: detail,
          message: 'Failed to send reply email.',
        },
        { status: 502 },
      );
    }

    const supabaseUrl = requiredEnv('SUPABASE_URL').replace(/\/+$/, '');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const now = new Date().toISOString();
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/quick_inquiries?id=eq.${encodeURIComponent(inquiryId)}&select=*`,
      {
        body: JSON.stringify({
          replied_at: now,
          replied_by: payload.repliedBy ?? payload.replied_by ?? null,
          reply_content: replyContent,
          status: 'resolved',
          updated_at: now,
        }),
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        method: 'PATCH',
      },
    );

    if (!updateResponse.ok) {
      const detail = await updateResponse.text();

      return json(
        {
          details: detail,
          message: 'Reply email was sent, but inquiry update failed.',
        },
        { status: 502 },
      );
    }

    const rows = await updateResponse.json();
    const inquiry = Array.isArray(rows) ? rows[0] : rows;

    if (!inquiry) {
      return json(
        {
          message: 'Reply email was sent, but inquiry was not found.',
        },
        { status: 404 },
      );
    }

    return json(inquiry);
  } catch (error) {
    return json(
      {
        message:
          error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 },
    );
  }
});
