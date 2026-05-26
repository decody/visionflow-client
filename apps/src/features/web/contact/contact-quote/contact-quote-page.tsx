'use client';

import type { PartnershipInquiryCompanySize } from '@visionflow/shared';
import {
  BarChart3,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  ImageIcon,
  Link as LinkIcon,
  LockKeyhole,
  MonitorSmartphone,
  Send,
  ShieldCheck,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { Container } from '@/components/common/container';

import styles from './contact-quote-page.module.css';

type StepKey = 1 | 2 | 3;
type SubmitState = { message: string; tone: 'error' | 'success' } | null;
type ServiceKey = 'web3d' | 'adImage' | 'dashboard' | 'webApp';
type PriorityKey = 'budget' | 'balanced' | 'speed' | 'quality';
type BudgetKey = 'under5m' | '5m10m' | '10m30m' | 'over30m' | 'undecided';
type TimelineKey = 'asap' | '1month' | '3months' | 'open';
type ResponseChannelKey = 'email' | 'phone' | 'kakao' | 'meeting';

type ServiceOption = {
  desc: string;
  icon: LucideIcon;
  label: string;
  value: ServiceKey;
};

type PriceReference = {
  features: string[];
  icon: LucideIcon;
  label: string;
  price: string;
  tag: string;
};

const serviceOptions: ServiceOption[] = [
  {
    desc: '제품 인터랙션, 쇼룸, 3D 뷰어',
    icon: Box,
    label: '웹 3D',
    value: 'web3d',
  },
  {
    desc: 'AI 광고컷, 상세페이지, 캠페인 소재',
    icon: ImageIcon,
    label: '광고 이미지',
    value: 'adImage',
  },
  {
    desc: '운영 지표, CRM, 관리자 화면',
    icon: BarChart3,
    label: '데이터 대시보드',
    value: 'dashboard',
  },
  {
    desc: '서비스 웹, 앱, 예약/결제 시스템',
    icon: MonitorSmartphone,
    label: '웹·앱 개발',
    value: 'webApp',
  },
];

const priorityOptions: { hint: string; label: string; value: PriorityKey }[] = [
  { hint: '비용 중심', label: '소형', value: 'budget' },
  { hint: '기능 균형', label: '중형', value: 'balanced' },
  { hint: '빠른 런칭', label: '단기', value: 'speed' },
  { hint: '완성도 중심', label: '대형', value: 'quality' },
];

const timelineOptions: { label: string; value: TimelineKey }[] = [
  { label: 'ASAP', value: 'asap' },
  { label: '1개월 내', value: '1month' },
  { label: '3개월 내', value: '3months' },
  { label: '미정', value: 'open' },
];

const budgetOptions: { label: string; value: BudgetKey }[] = [
  { label: '500만원 이하', value: 'under5m' },
  { label: '500~1,000만원', value: '5m10m' },
  { label: '1,000~3,000만원', value: '10m30m' },
  { label: '3,000만원 이상', value: 'over30m' },
  { label: '미정', value: 'undecided' },
];

const responseChannelOptions: { label: string; value: ResponseChannelKey }[] = [
  { label: '이메일', value: 'email' },
  { label: '전화', value: 'phone' },
  { label: '카카오톡', value: 'kakao' },
  { label: '화상미팅', value: 'meeting' },
];

const companySizeOptions: {
  label: string;
  value: PartnershipInquiryCompanySize;
}[] = [
  { label: '1명', value: '1' },
  { label: '2~10명', value: '2-10' },
  { label: '11~50명', value: '11-50' },
  { label: '50명 이상', value: '50+' },
];

const priceReferences: PriceReference[] = [
  {
    features: ['제품 360도 뷰어', '기본 화면 연동', '모바일 최적화'],
    icon: Box,
    label: '제품 3D 뷰어',
    price: '800만 ~ 2,000만원',
    tag: '웹 3D',
  },
  {
    features: ['브랜드 톤 학습', 'AI컷 100장', '채널별 리사이징'],
    icon: ImageIcon,
    label: 'AI 이미지 100컷',
    price: '500만 ~ 1,500만원',
    tag: '광고 이미지',
  },
  {
    features: ['Next.js 14', 'CMS 연동', '검색 최적화'],
    icon: MonitorSmartphone,
    label: '랜딩페이지 풀스택',
    price: '1,500만 ~ 3,500만원',
    tag: '웹·앱',
  },
  {
    features: ['AG Grid 기반', '실시간 데이터', '권한 관리'],
    icon: BarChart3,
    label: 'BI 대시보드 10화면',
    price: '3,000만 ~ 6,000만원',
    tag: '대시보드',
  },
];

const processSteps = [
  {
    desc: '제출 즉시 담당자가 요청 내용을 확인합니다.',
    no: '01',
    time: '즉시',
    title: '접수 자동 알림',
  },
  {
    desc: '서비스와 일정에 맞는 담당자를 배정합니다.',
    no: '02',
    time: '4시간 내',
    title: '담당자 자동 할당',
  },
  {
    desc: '범위와 예산을 검토한 뒤 1차 견적서를 발송합니다.',
    no: '03',
    time: '24시간 내',
    title: '정식 견적서 발송',
  },
  {
    desc: '필요 시 세부 범위를 조율하고 계약을 진행합니다.',
    no: '04',
    time: '협의',
    title: '미팅 / 계약',
  },
] as const;

const initialForm = {
  budget: '10m30m' as BudgetKey,
  companyName: '',
  companySize: '2-10' as PartnershipInquiryCompanySize,
  contactEmail: '',
  contactName: '',
  contactPhone: '',
  contactPosition: '',
  detail: '',
  isNdaRequested: false,
  priority: 'balanced' as PriorityKey,
  references: [''],
  responseChannel: 'email' as ResponseChannelKey,
  services: ['web3d', 'webApp'] as ServiceKey[],
  timeline: '1month' as TimelineKey,
};

export function ContactQuotePage() {
  const [step, setStep] = useState<StepKey>(1);
  const [form, setForm] = useState(initialForm);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isPrivacyChecked, setIsPrivacyChecked] = useState(true);
  const [isMarketingChecked, setIsMarketingChecked] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!submitState) {
      return;
    }

    const timerId = window.setTimeout(() => setSubmitState(null), 5000);

    return () => window.clearTimeout(timerId);
  }, [submitState]);

  const updateForm = <Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitState(null);
  };

  const toggleService = (value: ServiceKey) => {
    setForm((current) => {
      const hasService = current.services.includes(value);
      const services = hasService
        ? current.services.filter((service) => service !== value)
        : [...current.services, value];

      return {
        ...current,
        services: services.length > 0 ? services : current.services,
      };
    });
    setSubmitState(null);
  };

  const updateReference = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      references: current.references.map((item, itemIndex) =>
        itemIndex === index ? value : item,
      ),
    }));
  };

  const addReference = () => {
    setForm((current) => ({
      ...current,
      references: [...current.references, ''],
    }));
  };

  const removeReference = (index: number) => {
    setForm((current) => ({
      ...current,
      references:
        current.references.length === 1
          ? ['']
          : current.references.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const canMoveNext = () => {
    if (step === 1) {
      return form.services.length > 0;
    }

    if (step === 2) {
      return form.detail.trim().length >= 20;
    }

    return (
      form.companyName.trim() &&
      form.contactName.trim() &&
      form.contactEmail.trim() &&
      isPrivacyChecked
    );
  };

  const goNext = () => {
    if (!canMoveNext()) {
      setSubmitState({
        message:
          step === 2
            ? '프로젝트 설명을 20자 이상 입력해 주세요.'
            : '필수 정보를 입력해 주세요.',
        tone: 'error',
      });
      return;
    }

    setStep((current) => Math.min(current + 1, 3) as StepKey);
    setSubmitState(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachment(event.target.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canMoveNext()) {
      setSubmitState({
        message: '필수 항목과 개인정보 수집 동의를 확인해 주세요.',
        tone: 'error',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitState(null);

      const body = new FormData();
      body.set('company_name', form.companyName);
      body.set('company_size', form.companySize);
      body.set('company_url', firstReferenceUrl(form.references));
      body.set('contact_email', form.contactEmail);
      body.set('contact_name', form.contactName);
      body.set('contact_phone', form.contactPhone);
      body.set('contact_position', form.contactPosition || '담당자');
      body.set('partnership_type', 'etc');
      body.set('proposal_content', buildProposalContent(form, attachment));

      if (attachment) {
        body.set('attachment', attachment);
      }

      const response = await fetch('/api/partnership-inquiries', {
        body,
        method: 'POST',
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        throw new Error(
          errorBody?.message ?? '견적 요청 접수에 실패했습니다.',
        );
      }

      setStep(1);
      setForm(initialForm);
      setAttachment(null);
      setIsPrivacyChecked(true);
      setIsMarketingChecked(false);
      setSubmitState({
        message:
          '견적 요청이 접수되었습니다. 담당자가 검토 후 1~3 영업일 내 연락드릴게요.',
        tone: 'success',
      });
    } catch (error) {
      setSubmitState({
        message:
          error instanceof Error
            ? error.message
            : '견적 요청 접수 중 오류가 발생했습니다.',
        tone: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>Quote Request</span>
            <h1 className={styles.heroTitle}>3분 안에 견적 요청 보내기</h1>
            <p className={styles.heroSub}>
              프로젝트 정보를 알려주시면 담당자가 기준 견적과 실행 범위를
              정리해 보내드립니다.
              <br />
              작성 중인 내용은 제출 전까지 자유롭게 수정할 수 있어요.
            </p>
            <div className={styles.heroBadges} aria-label="견적 문의 안내">
              <span>
                <Clock3 aria-hidden="true" size={14} />
                24시간 내 1차 답변
              </span>
              <span>
                <LockKeyhole aria-hidden="true" size={14} />
                NDA 사전 검토 가능
              </span>
              <span>
                <ShieldCheck aria-hidden="true" size={14} />
                입력 정보 보안
              </span>
            </div>
          </div>
        </Container>
      </section>

      <form className={styles.quoteFlow} onSubmit={handleSubmit}>
        <Container>
          <StepIndicator currentStep={step} />

          <article className={styles.formCard}>
            {step === 1 ? (
              <StepProject
                form={form}
                onPriorityChange={(value) => updateForm('priority', value)}
                onTimelineChange={(value) => updateForm('timeline', value)}
                onToggleService={toggleService}
              />
            ) : null}

            {step === 2 ? (
              <StepDetail
                attachment={attachment}
                form={form}
                onAddReference={addReference}
                onDetailChange={(value) => updateForm('detail', value)}
                onFileChange={handleFileChange}
                onNdaChange={(value) => updateForm('isNdaRequested', value)}
                onReferenceChange={updateReference}
                onRemoveAttachment={() => setAttachment(null)}
                onRemoveReference={removeReference}
              />
            ) : null}

            {step === 3 ? (
              <StepContact
                form={form}
                isMarketingChecked={isMarketingChecked}
                isPrivacyChecked={isPrivacyChecked}
                onBudgetChange={(value) => updateForm('budget', value)}
                onCompanySizeChange={(value) =>
                  updateForm('companySize', value)
                }
                onFieldChange={updateForm}
                onMarketingChange={setIsMarketingChecked}
                onPrivacyChange={setIsPrivacyChecked}
                onResponseChannelChange={(value) =>
                  updateForm('responseChannel', value)
                }
              />
            ) : null}

            {submitState ? (
              <p
                className={`${styles.formNotice} ${
                  submitState.tone === 'success'
                    ? styles.formNoticeSuccess
                    : styles.formNoticeError
                }`}
              >
                {submitState.message}
              </p>
            ) : null}

            <footer className={styles.formFooter}>
              <span className={styles.requiredHint}>
                <span aria-hidden="true" />
                자동 저장됨 · 필수 값
              </span>
              <div className={styles.formActions}>
                {step > 1 ? (
                  <button
                    className={styles.secondaryButton}
                    disabled={isSubmitting}
                    onClick={() =>
                      setStep((current) => Math.max(current - 1, 1) as StepKey)
                    }
                    type="button"
                  >
                    <ChevronLeft aria-hidden="true" size={16} />
                    이전
                  </button>
                ) : null}
                {step < 3 ? (
                  <button
                    className={styles.primaryButton}
                    onClick={goNext}
                    type="button"
                  >
                    다음 + 프로젝트 상세
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                ) : (
                  <button
                    className={styles.primaryButton}
                    disabled={isSubmitting}
                    type="submit"
                  >
                    <Send aria-hidden="true" size={16} />
                    {isSubmitting ? '접수 중' : '견적 요청 보내기'}
                  </button>
                )}
              </div>
            </footer>
          </article>
        </Container>
      </form>

      <section className={styles.referenceSection}>
        <Container>
          <SectionHead
            eyebrow="Reference"
            sub="실제 견적은 요구사항에 따라 달라집니다. 대략적인 감을 잡는 용도로 참고하세요."
            title="비슷한 프로젝트는 얼마쯤?"
          />
          <div className={styles.referenceGrid}>
            {priceReferences.map((item) => {
              const Icon = item.icon;

              return (
                <article className={styles.priceCard} key={item.label}>
                  <span className={styles.priceTag}>
                    <Icon aria-hidden="true" size={14} />
                    {item.tag}
                  </span>
                  <h3>{item.label}</h3>
                  <strong>{item.price}</strong>
                  <ul>
                    {item.features.map((feature) => (
                      <li key={feature}>
                        <Check aria-hidden="true" size={12} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className={styles.referenceNote}>
            위 가격은 일반적인 범위이며, 실제 견적은 요구사항 범위와 일정에
            따라 달라질 수 있습니다.
          </p>
        </Container>
      </section>

      <section className={styles.processSection}>
        <Container>
          <SectionHead
            eyebrow="After Submit"
            sub="견적 요청부터 미팅까지, 신속하게 진행됩니다."
            title="제출 후 어떻게 진행되나요?"
          />
          <ol className={styles.processGrid}>
            {processSteps.map((item) => (
              <li className={styles.processCard} key={item.no}>
                <span className={styles.processNo}>{item.no}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                <span className={styles.processTime}>{item.time}</span>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}

function StepIndicator({ currentStep }: { currentStep: StepKey }) {
  const steps = [
    { key: 1 as const, label: '프로젝트 유형' },
    { key: 2 as const, label: '프로젝트 상세' },
    { key: 3 as const, label: '연락처' },
  ];

  return (
    <ol className={styles.stepper} aria-label="견적 요청 단계">
      {steps.map((item, index) => {
        const isDone = currentStep > item.key;
        const isCurrent = currentStep === item.key;

        return (
          <li
            className={`${styles.stepperItem} ${
              isDone ? styles.stepperItemDone : ''
            } ${isCurrent ? styles.stepperItemCurrent : ''}`}
            key={item.key}
          >
            <span className={styles.stepCircle}>
              {isDone ? <Check aria-hidden="true" size={14} /> : item.key}
            </span>
            <span>{item.label}</span>
            {index < steps.length - 1 ? (
              <i aria-hidden="true" className={styles.stepLine} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepProject({
  form,
  onPriorityChange,
  onTimelineChange,
  onToggleService,
}: {
  form: typeof initialForm;
  onPriorityChange: (value: PriorityKey) => void;
  onTimelineChange: (value: TimelineKey) => void;
  onToggleService: (value: ServiceKey) => void;
}) {
  return (
    <div className={styles.stepPanel}>
      <span className={styles.stepLabel}>Step 1 of 3</span>
      <h2>어떤 프로젝트를 계획 중이신가요?</h2>
      <p className={styles.stepDesc}>
        카테고리와 규모를 선택해주세요. 정확하지 않아도 괜찮습니다.
      </p>

      <fieldset className={styles.fieldset}>
        <legend>
          서비스 카테고리 <span>*</span>
        </legend>
        <div className={styles.serviceGrid}>
          {serviceOptions.map((service) => {
            const Icon = service.icon;
            const isSelected = form.services.includes(service.value);

            return (
              <button
                aria-pressed={isSelected}
                className={`${styles.serviceOption} ${
                  isSelected ? styles.serviceOptionActive : ''
                }`}
                key={service.value}
                onClick={() => onToggleService(service.value)}
                type="button"
              >
                <span className={styles.serviceIcon}>
                  <Icon aria-hidden="true" size={20} />
                </span>
                <span>
                  <strong>{service.label}</strong>
                  <small>{service.desc}</small>
                </span>
                <span className={styles.optionCheck}>
                  <Check aria-hidden="true" size={13} />
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>
          프로젝트 규모 <span>*</span>
        </legend>
        <div className={styles.segmentGroup}>
          {priorityOptions.map((option) => (
            <button
              aria-pressed={form.priority === option.value}
              className={`${styles.segment} ${
                form.priority === option.value ? styles.segmentActive : ''
              }`}
              key={option.value}
              onClick={() => onPriorityChange(option.value)}
              type="button"
            >
              <strong>{option.label}</strong>
              <small>{option.hint}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>희망 시작 시기</legend>
        <div className={styles.chipGroup}>
          {timelineOptions.map((option) => (
            <button
              aria-pressed={form.timeline === option.value}
              className={`${styles.chip} ${
                form.timeline === option.value ? styles.chipActive : ''
              }`}
              key={option.value}
              onClick={() => onTimelineChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

function StepDetail({
  attachment,
  form,
  onAddReference,
  onDetailChange,
  onFileChange,
  onNdaChange,
  onReferenceChange,
  onRemoveAttachment,
  onRemoveReference,
}: {
  attachment: File | null;
  form: typeof initialForm;
  onAddReference: () => void;
  onDetailChange: (value: string) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onNdaChange: (value: boolean) => void;
  onReferenceChange: (index: number, value: string) => void;
  onRemoveAttachment: () => void;
  onRemoveReference: (index: number) => void;
}) {
  return (
    <div className={styles.stepPanel}>
      <span className={styles.stepLabel}>Step 2 of 3</span>
      <h2>프로젝트에 대해 자세히 알려주세요</h2>
      <p className={styles.stepDesc}>
        내용이 구체적일수록 범위 산정이 쉬워집니다. 200자 이상 권장.
      </p>

      <label className={styles.field}>
        <span>
          프로젝트 설명 <i>*</i>
        </span>
        <textarea
          maxLength={5000}
          onChange={(event) => onDetailChange(event.target.value)}
          placeholder="예: 자사 브랜드가 온라인에서 활용할 360도 제품 뷰어와 제품 상세페이지를 동시에 제작하고 싶습니다. 디자인 가이드는 있고 개발은 처음부터 필요합니다."
          required
          value={form.detail}
        />
        <small>{form.detail.length.toLocaleString()} / 5,000자 권장</small>
      </label>

      <div className={styles.field}>
        <span>참고 자료 URL</span>
        <div className={styles.referenceInputs}>
          {form.references.map((reference, index) => (
            <label className={styles.urlInput} key={index}>
              <LinkIcon aria-hidden="true" size={14} />
              <input
                onChange={(event) =>
                  onReferenceChange(index, event.target.value)
                }
                placeholder="https://example.com/inspiration-3d-viewer"
                type="url"
                value={reference}
              />
              <button
                aria-label="URL 삭제"
                onClick={() => onRemoveReference(index)}
                type="button"
              >
                <X aria-hidden="true" size={13} />
              </button>
            </label>
          ))}
        </div>
        <button className={styles.inlineButton} onClick={onAddReference} type="button">
          + URL 추가
        </button>
      </div>

      <div className={styles.field}>
        <span>첨부 파일</span>
        {attachment ? (
          <div className={styles.filePill}>
            <FileText aria-hidden="true" size={16} />
            <span>
              <strong>{attachment.name}</strong>
              <small>{formatFileSize(attachment.size)}</small>
            </span>
            <button
              aria-label="첨부 파일 삭제"
              onClick={onRemoveAttachment}
              type="button"
            >
              <X aria-hidden="true" size={14} />
            </button>
          </div>
        ) : null}
        <label className={styles.dropZone}>
          <Upload aria-hidden="true" size={22} />
          <strong>파일을 드래그하거나 클릭해서 추가</strong>
          <small>PDF, ZIP, 이미지 파일 · 최대 20MB</small>
          <input accept=".pdf,.zip,image/*" onChange={onFileChange} type="file" />
        </label>
      </div>

      <label className={styles.checkboxRow}>
        <input
          checked={form.isNdaRequested}
          onChange={(event) => onNdaChange(event.target.checked)}
          type="checkbox"
        />
        <span aria-hidden="true" />
        <strong>비공개 / NDA 사전 검토</strong>
        <small>기업 내부 자료 포함 시 담당자 확인 후 별도 안내합니다.</small>
      </label>
    </div>
  );
}

function StepContact({
  form,
  isMarketingChecked,
  isPrivacyChecked,
  onBudgetChange,
  onCompanySizeChange,
  onFieldChange,
  onMarketingChange,
  onPrivacyChange,
  onResponseChannelChange,
}: {
  form: typeof initialForm;
  isMarketingChecked: boolean;
  isPrivacyChecked: boolean;
  onBudgetChange: (value: BudgetKey) => void;
  onCompanySizeChange: (value: PartnershipInquiryCompanySize) => void;
  onFieldChange: <Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key],
  ) => void;
  onMarketingChange: (value: boolean) => void;
  onPrivacyChange: (value: boolean) => void;
  onResponseChannelChange: (value: ResponseChannelKey) => void;
}) {
  return (
    <div className={styles.stepPanel}>
      <span className={styles.stepLabel}>Step 3 of 3 · 연락처 입력</span>
      <h2>어디로 답변을 보내드릴까요?</h2>
      <p className={styles.stepDesc}>
        정식 견적서가 가능한 연락처를 알려주세요.
      </p>

      <label className={styles.field}>
        <span>회사명 / 단체명</span>
        <input
          maxLength={200}
          onChange={(event) => onFieldChange('companyName', event.target.value)}
          placeholder="예: Nordic Furniture Co."
          required
          type="text"
          value={form.companyName}
        />
      </label>

      <div className={styles.twoCol}>
        <label className={styles.field}>
          <span>
            담당자 이름 <i>*</i>
          </span>
          <input
            maxLength={200}
            onChange={(event) =>
              onFieldChange('contactName', event.target.value)
            }
            placeholder="홍길동"
            required
            type="text"
            value={form.contactName}
          />
        </label>
        <label className={styles.field}>
          <span>직책</span>
          <input
            maxLength={200}
            onChange={(event) =>
              onFieldChange('contactPosition', event.target.value)
            }
            placeholder="예: 마케팅 매니저"
            type="text"
            value={form.contactPosition}
          />
        </label>
      </div>

      <div className={styles.twoCol}>
        <label className={styles.field}>
          <span>
            이메일 <i>*</i>
          </span>
          <input
            maxLength={254}
            onChange={(event) =>
              onFieldChange('contactEmail', event.target.value)
            }
            placeholder="you@company.com"
            required
            type="email"
            value={form.contactEmail}
          />
        </label>
        <label className={styles.field}>
          <span>연락처</span>
          <input
            onChange={(event) =>
              onFieldChange('contactPhone', event.target.value)
            }
            placeholder="010-0000-0000"
            type="tel"
            value={form.contactPhone}
          />
        </label>
      </div>

      <fieldset className={styles.fieldset}>
        <legend>선호 응답 채널</legend>
        <div className={styles.channelGroup}>
          {responseChannelOptions.map((option) => (
            <button
              aria-pressed={form.responseChannel === option.value}
              className={
                form.responseChannel === option.value
                  ? styles.channelActive
                  : ''
              }
              key={option.value}
              onClick={() => onResponseChannelChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>회사 규모</legend>
        <div className={styles.chipGroup}>
          {companySizeOptions.map((option) => (
            <button
              aria-pressed={form.companySize === option.value}
              className={`${styles.chip} ${
                form.companySize === option.value ? styles.chipActive : ''
              }`}
              key={option.value}
              onClick={() => onCompanySizeChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>예상 예산</legend>
        <div className={styles.chipGroup}>
          {budgetOptions.map((option) => (
            <button
              aria-pressed={form.budget === option.value}
              className={`${styles.chip} ${
                form.budget === option.value ? styles.chipActive : ''
              }`}
              key={option.value}
              onClick={() => onBudgetChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className={styles.checkboxRow}>
        <input
          checked={isPrivacyChecked}
          onChange={(event) => onPrivacyChange(event.target.checked)}
          required
          type="checkbox"
        />
        <span aria-hidden="true" />
        <strong>개인정보 수집 및 이용에 동의합니다.</strong>
        <small>필수</small>
      </label>
      <label className={styles.checkboxRow}>
        <input
          checked={isMarketingChecked}
          onChange={(event) => onMarketingChange(event.target.checked)}
          type="checkbox"
        />
        <span aria-hidden="true" />
        <strong>VisionFlow 서비스 소식과 뉴스레터 수신에 동의합니다.</strong>
        <small>선택</small>
      </label>
    </div>
  );
}

function SectionHead({
  eyebrow,
  sub,
  title,
}: {
  eyebrow: string;
  sub: string;
  title: string;
}) {
  return (
    <header className={styles.sectionHead}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <h2>{title}</h2>
      <p>{sub}</p>
    </header>
  );
}

function buildProposalContent(form: typeof initialForm, attachment: File | null) {
  const serviceLabels = serviceOptions
    .filter((service) => form.services.includes(service.value))
    .map((service) => service.label)
    .join(', ');
  const references = form.references
    .map((item) => item.trim())
    .filter(Boolean)
    .join('\n');

  return [
    '[견적 요청]',
    `서비스: ${serviceLabels}`,
    `프로젝트 규모: ${labelOf(priorityOptions, form.priority)}`,
    `희망 시작 시기: ${labelOf(timelineOptions, form.timeline)}`,
    `예상 예산: ${labelOf(budgetOptions, form.budget)}`,
    `선호 응답 채널: ${labelOf(responseChannelOptions, form.responseChannel)}`,
    `NDA 사전 검토: ${form.isNdaRequested ? '요청' : '미요청'}`,
    '',
    '[프로젝트 설명]',
    form.detail.trim(),
    '',
    references ? `[참고 URL]\n${references}` : '[참고 URL]\n없음',
    '',
    `[첨부 파일]\n${attachment ? `${attachment.name} (${formatFileSize(attachment.size)})` : '없음'}`,
  ].join('\n');
}

function firstReferenceUrl(references: string[]) {
  return references.find((item) => item.trim())?.trim() ?? '';
}

function labelOf<T extends string>(
  options: ReadonlyArray<{ label: string; value: T }>,
  value: T,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '-';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}
