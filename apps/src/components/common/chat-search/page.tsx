'use client';

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { ROUTES } from '@visionflow/routes';
import type {
  AiProvider,
  QnaRow,
  SearchResponse,
  Source,
} from '@visionflow/shared';
import {
  Compass,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import type { Group, Mesh, MeshBasicMaterial } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import styles from './page.module.css';

type PlanKey = 'web3d' | 'adVisuals' | 'webApp' | 'dashboard';
type ChatMode = 'idle' | 'recommendation';

type ChatAction = {
  label: string;
  value: string;
  href?: string;
};

type RecommendationResult = {
  href: string;
  reasons: string[];
  summary: string;
  title: string;
};

type ChatMessage = {
  actions?: ChatAction[];
  recommendation?: RecommendationResult;
  role: 'user' | 'ai';
  sources?: Source[];
  text: string;
};

type PlanOption = {
  id: string;
  keywords: string[];
  label: string;
  scores: Partial<Record<PlanKey, number>>;
};

type RecommendationQuestion = {
  id: string;
  options: PlanOption[];
  text: string;
};

type ChatbotRobotModelProps = {
  floating?: boolean;
  positionY?: number;
  rotationY?: number;
  scale?: number;
  tiltZ?: number;
};

const PROVIDER: AiProvider = 'gemini';

const INITIAL_MESSAGE: ChatMessage = {
  role: 'ai',
  text: '안녕하세요. VisionFlow에서 무엇을 찾고 계신가요? 사이트를 짧게 안내하거나, 몇 가지 질문으로 맞는 서비스 라인을 추천해드릴게요.',
  actions: [
    { label: '사이트 한 문장 요약', value: 'site-summary' },
    { label: '나에게 맞는 플랜 찾기', value: 'start-recommendation' },
  ],
};

const ONBOARDING_SOURCES: Source[] = [
  { label: '서비스 보기', href: ROUTES.WEB_3D, type: 'contact' },
  { label: '작업 사례 보기', href: ROUTES.WORK, type: 'work' },
  { label: '견적 문의하기', href: ROUTES.CONTACT.ROOT, type: 'contact' },
  { label: 'FAQ 보기', href: `${ROUTES.CONTACT.ROOT}#faq`, type: 'faq' },
];

const RECOMMENDED_PLANS: Record<PlanKey, RecommendationResult> = {
  web3d: {
    title: '웹 3D / 컨피규레이터',
    summary:
      '제품을 360도로 보여주거나 색상·재질·옵션을 직접 바꿔보는 인터랙티브 경험에 가장 잘 맞습니다.',
    reasons: [
      '제품 이해를 빠르게 만들어야 합니다.',
      '브라우저에서 바로 체험되는 시각적 설득력이 중요합니다.',
      'AR 미리보기나 3D 옵션 변경 같은 확장 여지가 있습니다.',
    ],
    href: ROUTES.WEB_3D,
  },
  adVisuals: {
    title: 'AI 광고 이미지',
    summary:
      '제품 컷, 상세페이지 이미지, 캠페인 키비주얼을 빠르게 많이 만들어야 할 때 적합합니다.',
    reasons: [
      '출시나 캠페인 일정에 맞춘 이미지 양산이 필요합니다.',
      '브랜드 톤을 유지하면서 여러 채널용 변형이 필요합니다.',
      '보유한 제품 사진이나 레퍼런스를 활용할 수 있습니다.',
    ],
    href: ROUTES.AD_VISUALS,
  },
  webApp: {
    title: '웹 / 앱 구축',
    summary:
      '랜딩페이지, 예약·구매 흐름, CMS, 모바일 앱처럼 실제 사용자 기능을 만들어야 할 때 적합합니다.',
    reasons: [
      '기획부터 배포까지 이어지는 제품 개발이 필요합니다.',
      'SEO, 관리자 화면, 회원/결제 같은 기능 확장이 가능합니다.',
      '초기 출시 후 운영과 개선을 함께 고려할 수 있습니다.',
    ],
    href: ROUTES.WEB_APP,
  },
  dashboard: {
    title: '데이터 대시보드',
    summary:
      '흩어진 데이터를 한 화면에서 보고, 운영 지표와 업무 상태를 빠르게 판단해야 할 때 적합합니다.',
    reasons: [
      '매출, 광고, 운영 데이터를 반복해서 확인해야 합니다.',
      '권한, 필터, 실시간 모니터링 같은 업무 기능이 중요합니다.',
      '내부 운영팀이 자주 쓰는 도구로 확장하기 좋습니다.',
    ],
    href: ROUTES.DASHBOARD,
  },
};

const RECOMMENDATION_QUESTIONS: RecommendationQuestion[] = [
  {
    id: 'purpose',
    text: '가장 먼저 해결하고 싶은 목적이 무엇인가요?',
    options: [
      {
        id: 'show-product',
        label: '제품을 입체적으로 보여주고 싶어요',
        keywords: [
          '3d',
          '입체',
          '제품',
          '공간',
          'ar',
          '컨피규레이터',
        ],
        scores: { web3d: 4 },
      },
      {
        id: 'make-visuals',
        label: '광고 이미지를 빠르게 만들고 싶어요',
        keywords: [
          '광고',
          '이미지',
          '상세페이지',
          '컷',
          '비주얼',
          '캠페인',
        ],
        scores: { adVisuals: 4 },
      },
      {
        id: 'build-service',
        label: '웹사이트나 앱을 만들고 싶어요',
        keywords: ['웹', '앱', '사이트', '랜딩', '서비스', '개발'],
        scores: { webApp: 4 },
      },
      {
        id: 'see-data',
        label: '데이터를 보고 의사결정하고 싶어요',
        keywords: [
          '데이터',
          '대시보드',
          '지표',
          '매출',
          '분석',
          '운영',
        ],
        scores: { dashboard: 4 },
      },
    ],
  },
  {
    id: 'deliverable',
    text: '이번 프로젝트에서 꼭 필요한 산출물은 어떤 쪽에 가까운가요?',
    options: [
      {
        id: 'interactive-viewer',
        label: '360도 뷰어 / 옵션 변경 화면',
        keywords: ['360', '뷰어', '옵션', '색상', '재질', '변경'],
        scores: { web3d: 3, webApp: 1 },
      },
      {
        id: 'image-set',
        label: '제품 컷 / 캠페인 이미지 세트',
        keywords: ['제품컷', '이미지', '세트', 'sns', '키비주얼'],
        scores: { adVisuals: 3 },
      },
      {
        id: 'site-flow',
        label: '랜딩페이지 / 예약·구매 흐름',
        keywords: ['랜딩', '예약', '구매', '폼', '회원', '결제'],
        scores: { webApp: 3 },
      },
      {
        id: 'admin-report',
        label: '관리자 화면 / 리포트',
        keywords: ['관리자', '리포트', '관리', '테이블', '권한'],
        scores: { dashboard: 3, webApp: 1 },
      },
    ],
  },
  {
    id: 'timeline',
    text: '일정은 어느 정도로 보고 계신가요?',
    options: [
      {
        id: 'urgent',
        label: '2주 안에 빠르게 필요해요',
        keywords: ['급해', '빠르게', '2주', '이번 달', '런칭'],
        scores: { adVisuals: 2, webApp: 1 },
      },
      {
        id: 'prototype',
        label: '먼저 데모나 MVP를 보고 싶어요',
        keywords: ['데모', 'mvp', '프로토타입', '검증', '시안'],
        scores: { web3d: 2, webApp: 2, dashboard: 1 },
      },
      {
        id: 'full-build',
        label: '정식 구축까지 차근차근 가고 싶어요',
        keywords: ['정식', '구축', '운영', '장기', '배포'],
        scores: { webApp: 2, dashboard: 2, web3d: 1 },
      },
    ],
  },
  {
    id: 'materials',
    text: '현재 준비된 자료는 어느 정도인가요?',
    options: [
      {
        id: 'product-assets',
        label: '제품 사진이나 3D 파일이 있어요',
        keywords: ['사진', '3d 파일', '모델링', 'glb', '제품 자료'],
        scores: { web3d: 2, adVisuals: 2 },
      },
      {
        id: 'brand-assets',
        label: '브랜드 가이드와 레퍼런스가 있어요',
        keywords: ['브랜드', '가이드', '레퍼런스', '톤', '무드'],
        scores: { adVisuals: 2, webApp: 1 },
      },
      {
        id: 'data-assets',
        label: '엑셀·DB·운영 데이터가 있어요',
        keywords: ['엑셀', 'db', '데이터', 'api', '시트'],
        scores: { dashboard: 3 },
      },
      {
        id: 'idea-only',
        label: '아직 아이디어만 있어요',
        keywords: ['아이디어', '아직', '없어요', '처음', '기획'],
        scores: { webApp: 1, web3d: 1, adVisuals: 1, dashboard: 1 },
      },
    ],
  },
];

function isAnsweredQna(qna: QnaRow) {
  return (
    Boolean(qna.answer?.trim()) ||
    qna.status === 'done' ||
    qna.status === 'resolved'
  );
}

function getQnaHref(qna: QnaRow) {
  if (!isAnsweredQna(qna)) {
    return `${ROUTES.CONTACT.ROOT}/general#board`;
  }

  return qna.isSecret
    ? `${ROUTES.CONTACT.ROOT}/general/detail/secret`
    : `${ROUTES.CONTACT.ROOT}/general/detail`;
}

function getWorkHref(workId: number) {
  return workId === 0 ? `${ROUTES.WORK}/detail` : ROUTES.WORK;
}

function buildSources(data: SearchResponse): Source[] {
  return [
    ...data.sources.notices.map((notice) => ({
      label: `공지 · ${notice.title}`,
      href: ROUTES.NOTICES.DETAIL(notice.id),
      type: 'notice' as const,
    })),
    ...data.sources.faqs.map((faq) => ({
      label: `FAQ · ${faq.question}`,
      href: `${ROUTES.CONTACT.ROOT}#faq`,
      type: 'faq' as const,
    })),
    ...data.sources.contacts.map((contact) => ({
      label: `문의 · ${contact.title}`,
      href: `${ROUTES.CONTACT.ROOT}/general#quick-form`,
      type: 'contact' as const,
    })),
    ...data.sources.qnas.map((qna) => ({
      label: `${qna.isNotice ? 'Q&A 공지' : 'Q&A'} · ${
        qna.title || qna.question
      }`,
      href: getQnaHref(qna),
      type: 'qna' as const,
    })),
    ...data.sources.works.map((work) => ({
      label: `작업 사례 · ${work.title}`,
      href: work.link_url ?? getWorkHref(work.id),
      type: 'work' as const,
    })),
  ];
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function includesAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function isOnboardingIntent(value: string) {
  const normalized = normalizeText(value);
  return includesAny(normalized, [
    '설명',
    '뭐하는',
    '무슨 사이트',
    '이 사이트',
    '한 문장',
    '소개',
    'visionflow',
    '비전플로우',
  ]);
}

function isRecommendationIntent(value: string) {
  const normalized = normalizeText(value);
  return includesAny(normalized, [
    '플랜',
    '추천',
    '견적',
    '맞는',
    '뭐가',
    '서비스',
    '제품',
    '찾아줘',
  ]);
}

function isResetIntent(value: string) {
  const normalized = normalizeText(value);
  return includesAny(normalized, [
    '처음부터',
    '취소',
    '다시 추천',
    '초기화',
    'reset',
  ]);
}

function createQuestionMessage(
  question: RecommendationQuestion,
): ChatMessage {
  return {
    role: 'ai',
    text: question.text,
    actions: question.options.map((option) => ({
      label: option.label,
      value: option.id,
    })),
  };
}

function findBestOption(
  question: RecommendationQuestion,
  input: string,
) {
  const normalized = normalizeText(input);

  return (
    question.options.find(
      (option) =>
        option.id === input ||
        normalizeText(option.label) === normalized ||
        includesAny(normalized, option.keywords),
    ) ?? question.options[0]!
  );
}

function getRecommendationResult(answers: PlanOption[]) {
  const scores: Record<PlanKey, number> = {
    web3d: 0,
    adVisuals: 0,
    webApp: 0,
    dashboard: 0,
  };

  answers.forEach((answer) => {
    Object.entries(answer.scores).forEach(([key, score]) => {
      scores[key as PlanKey] += score ?? 0;
    });
  });

  let bestKey: PlanKey = 'web3d';
  let bestScore = scores[bestKey];

  (Object.entries(scores) as Array<[PlanKey, number]>).forEach(
    ([key, score]) => {
      if (score > bestScore) {
        bestKey = key;
        bestScore = score;
      }
    },
  );

  return RECOMMENDED_PLANS[bestKey];
}

function getRecommendationQuestion(index: number) {
  return (
    RECOMMENDATION_QUESTIONS[index] ?? RECOMMENDATION_QUESTIONS[0]!
  );
}

function ChatbotRobotModel({
  floating = true,
  positionY = -0.55,
  rotationY = -0.28,
  scale = 1.45,
  tiltZ = 0,
}: ChatbotRobotModelProps) {
  const groupRef = useRef<Group>(null);
  const leftEyelidRef = useRef<Mesh>(null);
  const rightEyelidRef = useRef<Mesh>(null);
  const reducedMotionRef = useRef(false);
  const gltf = useLoader(GLTFLoader, '/models/chatbot_robot.glb');
  const targetYRef = useRef(positionY);
  const nextTargetAtRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => {
      reducedMotionRef.current = query.matches;
    };

    updateReducedMotion();
    query.addEventListener('change', updateReducedMotion);
    return () => query.removeEventListener('change', updateReducedMotion);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    const phase = (clock.elapsedTime + (floating ? 0.15 : 0.72)) % 4.2;
    const closing =
      !reducedMotionRef.current && phase >= 0.32 && phase <= 0.43;
    const blinkScale = closing ? 1 : 0.12;
    const blinkOpacity = closing ? 1 : 0;

    [leftEyelidRef.current, rightEyelidRef.current].forEach((eyelid) => {
      if (!eyelid) return;

      eyelid.scale.y += (blinkScale - eyelid.scale.y) * 0.55;
      (eyelid.material as MeshBasicMaterial).opacity = blinkOpacity;
    });

    if (!floating) {
      groupRef.current.rotation.y =
        rotationY + Math.sin(clock.elapsedTime * 0.9) * 0.04;
      groupRef.current.rotation.z =
        tiltZ + Math.sin(clock.elapsedTime * 0.8) * 0.025;
      groupRef.current.position.y =
        positionY + Math.sin(clock.elapsedTime * 1.1) * 0.025;
      return;
    }

    if (clock.elapsedTime >= nextTargetAtRef.current) {
      targetYRef.current = positionY - 0.2 + Math.random() * 0.45;
      nextTargetAtRef.current =
        clock.elapsedTime + 0.9 + Math.random() * 1.2;
    }

    groupRef.current.rotation.y =
      rotationY + Math.sin(clock.elapsedTime * 0.85) * 0.18;
    groupRef.current.rotation.z = tiltZ;
    groupRef.current.position.y +=
      (targetYRef.current - groupRef.current.position.y) * 0.035;
  });

  return (
    <group
      ref={groupRef}
      scale={scale}
      position={[0, positionY, 0]}
      rotation={[0, rotationY, tiltZ]}
    >
      <primitive object={gltf.scene} />
      <mesh
        ref={leftEyelidRef}
        position={[-0.088, 0.607, 0.266]}
        rotation={[0, 0, -0.05]}
        renderOrder={2}
      >
        <planeGeometry args={[0.078, 0.026]} />
        <meshBasicMaterial
          color="#101827"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={rightEyelidRef}
        position={[0.088, 0.607, 0.266]}
        rotation={[0, 0, 0.05]}
        renderOrder={2}
      >
        <planeGeometry args={[0.078, 0.026]} />
        <meshBasicMaterial
          color="#101827"
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default function ChatSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    INITIAL_MESSAGE,
  ]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<ChatMode>('idle');
  const [recommendationStep, setRecommendationStep] = useState(0);
  const [recommendationAnswers, setRecommendationAnswers] = useState<
    PlanOption[]
  >([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(
      () => inputRef.current?.focus(),
      120,
    );
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (open || !triggerRef.current) return;

    let animationFrame = 0;
    let nextTargetAt = 0;
    // 이 변수들은 채팅 창의 트리거(버튼)가 화면의 어느 위치에 떠 있을지 초기 위치와 타겟 위치를 의미합니다.
    let x = Math.max(window.innerWidth - 50, 24); // x: 화면 오른쪽 아래에 채팅 버튼 위치 (최소 24px 여유)
    let y = Math.max(window.innerHeight - 50, 24); // y: 화면 아래쪽에 채팅 버튼 위치 (최소 24px 여유)
    let targetX = x; // 움직일 목표 x좌표
    let targetY = y; // 움직일 목표 y좌표

    // 이 함수는 채팅 버튼이 움직일 수 있는(떠다닐 수 있는) 화면 영역의 최대, 최소 값을 계산합니다.
    const getBounds = () => {
      const margin = 116; // 여백 설정
      const maxX = Math.max(window.innerWidth - 184, margin); // 버튼이 왼쪽 끝으로 이동하지 않도록 여백 확보
      const maxY = Math.max(window.innerHeight - 184, margin); // 버튼이 위쪽 끝으로 이동하지 않도록 여백 확보

      return { margin, maxX, maxY };
    };

    const pickTarget = () => {
      const { margin, maxX, maxY } = getBounds();
      // rangeX와 rangeY는 버튼이 이동할 수 있는 X, Y축 범위(px)를 제한합니다.
      const rangeX = Math.min(105, maxX - margin); // 최대 105px 또는 허용 가능한 최대값 중 작은 값 사용
      const rangeY = Math.min(70, maxY - margin); // 최대 70px 또는 허용 가능한 최대값 중 작은 값 사용

      // centerX, centerY는 화면의 80% 위치를 기준점으로 삼아 버튼의 기본 이동 중심을 설정합니다.
      const centerX = window.innerWidth * 0.85;
      const centerY = window.innerHeight * 0.85;

      targetX = Math.min(
        maxX,
        Math.max(margin, centerX + (Math.random() - 0.5) * rangeX),
      );
      targetY = Math.min(
        maxY,
        Math.max(margin, centerY + (Math.random() - 0.5) * rangeY),
      );
      nextTargetAt = performance.now() + 4200 + Math.random() * 3200;
    };

    const animate = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const now = performance.now();
      if (now >= nextTargetAt) {
        pickTarget();
      }

      x += (targetX - x) * 0.0045;
      y += (targetY - y) * 0.0045;
      trigger.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      animationFrame = window.requestAnimationFrame(animate);
    };

    pickTarget();
    animate();

    return () => window.cancelAnimationFrame(animationFrame);
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const resetConversation = () => {
    setMode('idle');
    setRecommendationStep(0);
    setRecommendationAnswers([]);
    setMessages([INITIAL_MESSAGE]);
  };

  const showOnboarding = (userText?: string) => {
    setMode('idle');
    setRecommendationStep(0);
    setRecommendationAnswers([]);
    setMessages((prev) => [
      ...prev,
      ...(userText
        ? [{ role: 'user' as const, text: userText }]
        : []),
      {
        role: 'ai',
        text: 'VisionFlow는 웹 3D, AI 광고 이미지, 웹/앱 구축, 데이터 대시보드를 한 흐름으로 설계해 브랜드의 디지털 경험을 더 잘 팔리고 더 잘 운영되게 만드는 제작 파트너입니다.',
        sources: ONBOARDING_SOURCES,
        actions: [
          {
            label: '맞는 플랜도 찾아보기',
            value: 'start-recommendation',
          },
          { label: '처음으로', value: 'reset' },
        ],
      },
    ]);
  };

  const startRecommendation = (userText?: string) => {
    setMode('recommendation');
    setRecommendationStep(0);
    setRecommendationAnswers([]);
    setMessages((prev) => [
      ...prev,
      ...(userText
        ? [{ role: 'user' as const, text: userText }]
        : []),
      {
        role: 'ai',
        text: '좋아요. 정식 견적 전 단계로, 지금 상황에 가장 가까운 서비스 라인을 먼저 좁혀볼게요.',
      },
      createQuestionMessage(getRecommendationQuestion(0)),
    ]);
  };

  const answerRecommendation = (input: string) => {
    const question = getRecommendationQuestion(recommendationStep);
    const selectedOption = findBestOption(question, input);
    const nextAnswers = [...recommendationAnswers, selectedOption];
    const nextStep = recommendationStep + 1;

    if (nextStep < RECOMMENDATION_QUESTIONS.length) {
      setRecommendationAnswers(nextAnswers);
      setRecommendationStep(nextStep);
      setMessages((prev) => [
        ...prev,
        { role: 'user', text: selectedOption.label },
        createQuestionMessage(getRecommendationQuestion(nextStep)),
      ]);
      return;
    }

    const recommendation = getRecommendationResult(nextAnswers);
    setMode('idle');
    setRecommendationStep(0);
    setRecommendationAnswers([]);
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: selectedOption.label },
      {
        role: 'ai',
        text: `추천 결과는 “${recommendation.title}”입니다. 아래 이유를 기준으로 먼저 상담을 시작해보면 좋아요.`,
        recommendation,
        sources: [
          {
            label: `${recommendation.title} 자세히 보기`,
            href: recommendation.href,
            type: 'contact',
          },
          {
            label: '견적 문의하기',
            href: ROUTES.CONTACT.ROOT,
            type: 'contact',
          },
        ],
        actions: [
          { label: '다시 추천받기', value: 'start-recommendation' },
          { label: '처음으로', value: 'reset' },
        ],
      },
    ]);
  };

  const sendGeneralQuestion = async (q: string) => {
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, provider: PROVIDER }),
      });

      if (!res.ok) {
        throw new Error('Search request failed');
      }

      const data = (await res.json()) as SearchResponse;
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text:
            data.answer ||
            '관련 내용을 찾았어요. 아래 링크에서 이어서 확인해보세요.',
          sources: buildSources(data),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: '지금은 AI 안내를 불러오지 못했어요. 잠시 후 다시 시도해주시거나, 견적 문의로 바로 남겨주시면 빠르게 확인할게요.',
          sources: [
            {
              label: '견적 문의하기',
              href: ROUTES.CONTACT.ROOT,
              type: 'contact',
            },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!query.trim() || loading) return;

    const q = query.trim();
    setQuery('');

    if (isResetIntent(q)) {
      resetConversation();
      return;
    }

    if (mode === 'recommendation') {
      answerRecommendation(q);
      return;
    }

    if (isOnboardingIntent(q)) {
      showOnboarding(q);
      return;
    }

    if (isRecommendationIntent(q)) {
      startRecommendation(q);
      return;
    }

    await sendGeneralQuestion(q);
  };

  const handleAction = (action: ChatAction) => {
    if (loading) return;

    if (action.value === 'site-summary') {
      showOnboarding(action.label);
      return;
    }

    if (action.value === 'start-recommendation') {
      startRecommendation(action.label);
      return;
    }

    if (action.value === 'reset') {
      resetConversation();
      return;
    }

    if (mode === 'recommendation') {
      answerRecommendation(action.value);
    }
  };

  const removeQuestion = (messageIndex: number) => {
    setMessages((prev) =>
      prev.filter((message, index) => {
        if (index === messageIndex) {
          return false;
        }

        return !(index === messageIndex + 1 && message.role === 'ai');
      }),
    );
  };

  return (
    <aside className={styles.floating} aria-label="AI 안내 도우미">
      <section
        className={`${styles.panel} ${open ? styles.panelOpen : ''}`}
        aria-hidden={!open}
      >
        <header className={styles.header}>
          <div className={styles.headerIcon} aria-hidden="true">
            <Sparkles size={18} />
          </div>
          <div className={styles.headerText}>
            <strong>VisionFlow AI 가이드</strong>
            <span>
              사이트 안내부터 맞춤 서비스 추천까지 도와드려요.
            </span>
          </div>
          <button
            type="button"
            aria-label="AI 가이드 닫기"
            className={styles.iconButton}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </header>

        <div ref={bodyRef} className={styles.messages}>
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`${styles.messageRow} ${
                message.role === 'user' ? styles.messageRowUser : ''
              }`}
            >
              <div className={styles.messageContent}>
                {message.role === 'user' &&
                messages[index + 1]?.role === 'ai' ? (
                  <button
                    type="button"
                    className={styles.deleteQuestionButton}
                    aria-label="질문 삭제"
                    onClick={() => removeQuestion(index)}
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
                <div
                  className={`${styles.bubble} ${
                    message.role === 'user'
                      ? styles.userBubble
                      : styles.aiBubble
                  }`}
                >
                  {message.text}
                </div>
              </div>

              {message.recommendation ? (
                <article className={styles.recommendationCard}>
                  <div className={styles.recommendationIcon}>
                    <Compass size={18} />
                  </div>
                  <div>
                    <strong>{message.recommendation.title}</strong>
                    <p>{message.recommendation.summary}</p>
                    <ul>
                      {message.recommendation.reasons.map(
                        (reason) => (
                          <li key={reason}>{reason}</li>
                        ),
                      )}
                    </ul>
                  </div>
                </article>
              ) : null}

              {message.actions && message.actions.length > 0 ? (
                <div className={styles.actions}>
                  {message.actions.map((action) => (
                    <button
                      key={`${action.value}-${action.label}`}
                      type="button"
                      className={styles.actionChip}
                      onClick={() => handleAction(action)}
                    >
                      {action.value === 'reset' ? (
                        <RotateCcw size={14} />
                      ) : null}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}

              {message.sources && message.sources.length > 0 ? (
                <div className={styles.sources}>
                  {message.sources.map((source, sourceIndex) => (
                    <Link
                      key={`${source.href}-${sourceIndex}`}
                      href={source.href}
                      className={styles.sourceLink}
                      onClick={() => setOpen(false)}
                    >
                      {source.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {loading ? (
            <div className={styles.loading} aria-label="답변 준비 중">
              <span />
              <span />
              <span />
            </div>
          ) : null}
        </div>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            ref={inputRef}
            className={styles.input}
            placeholder={
              mode === 'recommendation'
                ? '답변을 직접 입력해도 좋아요'
                : '궁금한 점을 편하게 말해주세요'
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="submit"
            aria-label="메시지 보내기"
            disabled={loading || !query.trim()}
            className={styles.sendButton}
          >
            <Send size={18} />
          </button>
        </form>
      </section>

      {open ? (
        <div className={styles.peekRobot} aria-hidden="true">
          <Canvas camera={{ position: [0, 0.35, 5.2], fov: 40 }}>
            <ambientLight intensity={1.6} />
            <directionalLight
              position={[2.5, 3, 4]}
              intensity={2.4}
            />
            <Suspense fallback={null}>
              <ChatbotRobotModel
                floating={false}
                positionY={-0.28}
                rotationY={-0.65}
                scale={1.24}
                tiltZ={0.7}
              />
            </Suspense>
          </Canvas>
        </div>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        aria-label={open ? 'AI 가이드 닫기' : 'AI 가이드 열기'}
        aria-expanded={open}
      >
        {!open ? (
          <span className={styles.robotCanvas} aria-hidden="true">
            <Canvas camera={{ position: [0, 0.1, 5], fov: 38 }}>
              <ambientLight intensity={1.6} />
              <directionalLight
                position={[2.5, 3, 4]}
                intensity={2.4}
              />
              <Suspense fallback={null}>
                <ChatbotRobotModel />
              </Suspense>
            </Canvas>
          </span>
        ) : null}
      </button>
    </aside>
  );
}
