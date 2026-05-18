import { createClient } from '@supabase/supabase-js';
import type {
  AiProvider,
  ContactRow,
  FaqRow,
  NoticeRow,
  QnaRow,
  SearchRequest,
  SearchResponse,
  WorkRow,
} from '@visionflow/shared';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublicKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const openaiModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const defaultProvider =
  normalizeProvider(process.env.AI_PROVIDER) ?? 'gemini';
const supabaseKey = supabasePublicKey ?? supabaseServiceRoleKey;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

type WorkSearchRow = WorkRow & {
  description: string;
  tags: string[];
};

const WORK_SEARCH_INDEX: WorkSearchRow[] = [
  {
    id: 0,
    category: '웹 3D',
    industry: '커머스',
    roles: ['프론트엔드 개발', 'UI/UX'],
    size: 'tall',
    title: 'Nordic Furniture 3D Configurator',
    description:
      '북유럽 가구 브랜드의 온라인 3D 컨피규레이터 사례입니다. Figma 디자인과 Three.js 프로토타입을 함께 진행했고, 회전, 줌, 재질 변경 인터랙션을 검증했습니다. Next.js 14, Three.js, draco 압축을 사용했습니다.',
    tags: [
      '웹 3D',
      'Three.js',
      'react-three-fiber',
      'Draco',
      'WebXR',
    ],
    image: null,
    link_url: '/work/detail',
    link_label: '자세히 보기',
    created_at: '',
  },
  {
    id: 1,
    category: '웹 3D',
    industry: '커머스',
    roles: ['프론트엔드 개발', 'UI/UX'],
    size: 'short',
    title: 'Furniro 3D 컨피규레이터 - 인테리어 미리보기',
    description:
      '가구와 인테리어를 브라우저에서 미리 확인하는 웹 3D 컨피규레이터 작업 사례입니다.',
    tags: ['웹 3D', '컨피규레이터', '가상 쇼룸', 'AR 미리보기'],
    image: null,
    link_url: '/work/detail',
    link_label: '자세히 보기',
    created_at: '',
  },
  {
    id: 2,
    category: '웹 3D',
    industry: '커머스',
    roles: ['프론트엔드 개발', 'UI/UX'],
    size: 'tall',
    title: 'Web 3D 서비스',
    description:
      '제품을 360도로 보여주고 공간을 인터랙티브하게 탐색할 수 있는 웹 브라우저 기반 3D 경험을 설계합니다.',
    tags: ['Three.js', '컨피규레이터', '가상 쇼룸', 'AR 미리보기'],
    image: null,
    link_url: '/work/detail',
    link_label: '자세히 보기',
    created_at: '',
  },
];

const CONTACT_SEARCH_INDEX: ContactRow[] = [
  {
    id: 'general',
    title: '일반 문의 / Q&A',
    content:
      '서비스 관련 질문, 기존 사이트 부분 리뉴얼, 유지보수, 일반 상담은 Q&A 게시판 또는 빠른 문의로 남길 수 있습니다.',
  },
  {
    id: 'partnership',
    title: '제휴 문의',
    content:
      '콘텐츠, 기술, 리셀러, 외주 협업 등 파트너십 제안을 접수합니다.',
  },
  {
    id: 'contact',
    title: 'Contact',
    content:
      '견적 문의, 일반 문의, 제휴 문의 등 VisionFlow 상담 채널을 안내합니다.',
  },
];

function normalizeProvider(provider: unknown): AiProvider | null {
  return provider === 'gemini' || provider === 'openai'
    ? provider
    : null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function buildIlikePattern(query: string) {
  return `%${query.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
}

function stripHtml(value: string | null | undefined) {
  return (
    value
      ?.replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() ?? ''
  );
}

function findWorkSources(query: string) {
  const normalizedQuery = query.toLowerCase();

  return WORK_SEARCH_INDEX.filter((work) =>
    [work.title, work.description, ...work.tags]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  ).slice(0, 5);
}

function findContactSources(query: string) {
  const normalizedQuery = query.toLowerCase();

  return CONTACT_SEARCH_INDEX.filter((contact) =>
    [contact.title, contact.content]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery),
  ).slice(0, 5);
}

function getStringValue(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getBooleanValue(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'boolean') {
      return value;
    }
  }

  return null;
}

function normalizeQnaSource(row: Record<string, unknown>): QnaRow {
  const question = getStringValue(row, ['question']);
  const title =
    getStringValue(row, ['title', 'subject']) ||
    question.split('\n')[0]?.trim() ||
    'Q&A 문의';

  return {
    id: String(row.id),
    question,
    answer: getStringValue(row, ['answer']),
    category: getStringValue(row, ['category']) || null,
    isNotice: getBooleanValue(row, ['is_notice', 'isNotice']),
    isSecret: getBooleanValue(row, [
      'is_secret',
      'isSecret',
      'locked',
      'isLocked',
    ]),
    status: getStringValue(row, ['status']) || null,
    title,
  };
}

function buildPrompt(
  query: string,
  sources: SearchResponse['sources'],
) {
  const context = JSON.stringify(sources, null, 2);

  return `
다음은 VisionFlow 서비스의 검색 결과입니다.
${context}

사용자 질문: "${query}"

검색 결과에서 관련 있는 내용을 찾아 친절하게 답변해 주세요.
관련 항목이 있으면 제목과 핵심 내용을 요약하고, 없으면 솔직하게 관련 결과가 없다고 말해 주세요.
답변은 한국어로 3~5문장 이내로 간결하게 작성해 주세요.
  `.trim();
}

async function generateWithGemini(prompt: string) {
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.2,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Gemini request failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('\n')
      .trim() ?? ''
  );
}

async function generateWithOpenAI(prompt: string) {
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `OpenAI request failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function generateAnswer(provider: AiProvider, prompt: string) {
  if (provider === 'openai') {
    return generateWithOpenAI(prompt);
  }

  return generateWithGemini(prompt);
}

function buildFallbackAnswer(
  query: string,
  sources: SearchResponse['sources'],
) {
  const total =
    sources.faqs.length +
    sources.works.length +
    sources.notices.length +
    sources.contacts.length +
    sources.qnas.length;

  if (total === 0) {
    return `"${query}"와 관련된 검색 결과를 찾지 못했습니다. 다른 키워드로 다시 검색해 주세요.`;
  }

  const titles = [
    ...sources.works.map((work) => work.title),
    ...sources.faqs.map((faq) => faq.question),
    ...sources.notices.map((notice) => notice.title),
    ...sources.qnas.map((qna) => qna.title || qna.question),
    ...sources.contacts.map((contact) => contact.title),
  ].slice(0, 3);

  return `"${query}"와 관련해 ${titles.join(', ')} 항목을 찾았습니다. 아래 출처에서 자세한 내용을 확인해 주세요.`;
}

export async function POST(req: NextRequest) {
  let fallbackQuery = '';
  let fallbackProvider: AiProvider = defaultProvider;

  try {
    const body = (await req.json()) as Partial<SearchRequest>;
    const query = body.query?.trim();
    const provider =
      normalizeProvider(body.provider) ?? defaultProvider;
    fallbackProvider = provider;

    if (!query) {
      return jsonError('Query is required.', 400);
    }
    fallbackQuery = query;

    const pattern = buildIlikePattern(query);
    let faqs: FaqRow[] = [];
    let notices: NoticeRow[] = [];
    let qnas: QnaRow[] = [];

    if (supabase) {
      try {
        const [faqResult, noticeResult, qnaResult] =
          await Promise.all([
            supabase
              .from('faq')
              .select('id, question, answer')
              .or(`question.ilike.${pattern},answer.ilike.${pattern}`)
              .eq('is_visible', true)
              .limit(5),
            supabase
              .from('notices')
              .select('id, title, description, content_html')
              .or(
                `title.ilike.${pattern},description.ilike.${pattern},content_html.ilike.${pattern}`,
              )
              .eq('is_published', true)
              .limit(3),
            supabase
              .from('qna')
              .select('*')
              .or(
                `question.ilike.${pattern},answer.ilike.${pattern},category.ilike.${pattern}`,
              )
              .eq('is_visible', true)
              .limit(5),
          ]);

        if (faqResult.error) {
          console.error(faqResult.error);
        } else {
          faqs = (faqResult.data ?? []) as FaqRow[];
        }

        if (noticeResult.error) {
          console.error(noticeResult.error);
        } else {
          notices = (noticeResult.data ?? []).map((notice) => ({
            id: String(notice.id),
            title: notice.title,
            content:
              notice.description ||
              stripHtml(notice.content_html) ||
              '',
          })) as NoticeRow[];
        }

        if (qnaResult.error) {
          console.error(qnaResult.error);
        } else {
          qnas = (
            (qnaResult.data ?? []) as Record<string, unknown>[]
          ).map(normalizeQnaSource);
        }
      } catch (error) {
        console.error('Search database lookup failed', error);
      }
    } else {
      console.error('Search service is not configured.');
    }

    const sources: SearchResponse['sources'] = {
      contacts: findContactSources(query),
      faqs,
      qnas,
      works: findWorkSources(query),
      notices,
    };

    try {
      const answer =
        (await generateAnswer(
          provider,
          buildPrompt(query, sources),
        )) || '답변을 생성하지 못했습니다.';

      return NextResponse.json<SearchResponse>({
        answer,
        provider,
        sources,
      });
    } catch (error) {
      console.error(error);

      return NextResponse.json<SearchResponse>({
        answer: buildFallbackAnswer(query, sources),
        provider,
        sources,
      });
    }
  } catch (error) {
    console.error('Search route failed', error);

    const query = fallbackQuery || '검색어';
    const sources: SearchResponse['sources'] = {
      contacts: findContactSources(query),
      faqs: [],
      qnas: [],
      works: findWorkSources(query),
      notices: [],
    };

    return NextResponse.json<SearchResponse>({
      answer: buildFallbackAnswer(query, sources),
      provider: fallbackProvider,
      sources,
    });
  }
}
