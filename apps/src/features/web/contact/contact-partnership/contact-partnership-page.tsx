'use client';

import { ROUTES } from '@visionflow/routes';
import type {
  PartnershipInquiryCompanySize,
  PartnershipInquiryType,
} from '@visionflow/shared';
import {
  Check,
  Handshake,
  type LucideIcon,
  Paperclip,
  RotateCcw,
  Send,
  Store,
  Upload,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

import { Container } from '@/components/common/container';

import styles from './contact-partnership-page.module.css';

type SubmitState =
  | { message: string; tone: 'error' | 'success' }
  | null;

type PartnershipTypeOption = {
  desc: string;
  icon: LucideIcon;
  label: string;
  tag: string;
  value: PartnershipInquiryType;
};

const partnershipTypes: PartnershipTypeOption[] = [
  {
    desc: '프로덕션, 전문 스튜디오와 함께 프로젝트를 수행합니다. 디자이너, 개발자, 3D 아티스트 협업을 환영합니다.',
    icon: Handshake,
    label: '외주 협력',
    tag: '프로젝트별 협업',
    value: 'outsourcing',
  },
  {
    desc: 'VisionFlow 서비스를 자사 고객에게 재판매하고, 마진과 교육 프로그램을 함께 설계합니다.',
    icon: Store,
    label: '리셀러',
    tag: '정기 수익 모델',
    value: 'reseller',
  },
  {
    desc: 'AI 모델, SaaS, 인프라 기술을 결합하는 파트너십입니다. API 연동과 공동 개발 제안을 검토합니다.',
    icon: Workflow,
    label: '기술 파트너',
    tag: '기술 통합',
    value: 'tech_partner',
  },
  {
    desc: '카테고리 전문 콘텐츠, 룰셋, 데이터 제작 협력입니다. AI와 3D 관련 분야를 우선 검토합니다.',
    icon: Paperclip,
    label: '콘텐츠 파트너',
    tag: 'IP 공유',
    value: 'content_partner',
  },
];

const companySizeOptions: {
  label: string;
  value: PartnershipInquiryCompanySize;
}[] = [
  { label: '1명', value: '1' },
  { label: '2-10명', value: '2-10' },
  { label: '11-50명', value: '11-50' },
  { label: '50명 이상', value: '50+' },
];

const partnershipTypeOptions: {
  label: string;
  value: PartnershipInquiryType;
}[] = [
  { label: '외주 협력', value: 'outsourcing' },
  { label: '리셀러', value: 'reseller' },
  { label: '기술 파트너', value: 'tech_partner' },
  { label: '콘텐츠 파트너', value: 'content_partner' },
  { label: '기타', value: 'etc' },
];

const processSteps = [
  {
    desc: '제출 즉시 제휴 인박스에 접수되고, 담당자가 기본 정보를 확인합니다.',
    no: '01',
    time: '당일',
    title: '제안서 접수',
  },
  {
    desc: '제안 내용과 사업 적합성을 검토합니다. 필요한 경우 추가 자료를 요청할 수 있습니다.',
    no: '02',
    time: '1-2일',
    title: '사업 검토',
  },
  {
    desc: '협업 가능성과 다음 단계를 이메일로 안내드립니다.',
    no: '03',
    time: '1-3일',
    title: '1차 답신',
  },
  {
    desc: '협업이 결정되면 화상 회의 또는 대면 미팅 후 계약을 조율합니다.',
    no: '04',
    time: '협의',
    title: '미팅 및 계약',
  },
] as const;

const initialForm = {
  companyName: '',
  companySize: '2-10' as PartnershipInquiryCompanySize,
  companyUrl: '',
  contactEmail: '',
  contactName: '',
  contactPhone: '',
  contactPosition: '',
  partnershipType: 'outsourcing' as PartnershipInquiryType,
  proposalContent: '',
};

export function ContactPartnershipPage() {
  const [form, setForm] = useState(initialForm);
  const [isConsentChecked, setIsConsentChecked] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!submitState) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setSubmitState(null);
    }, 5000);

    return () => window.clearTimeout(timerId);
  }, [submitState]);

  const updateForm = <Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitState(null);
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedFile(null);
    setIsConsentChecked(true);
    setSubmitState(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isConsentChecked) {
      setSubmitState({
        message: '개인정보 수집 및 이용에 동의해 주세요.',
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
      body.set('company_url', form.companyUrl);
      body.set('contact_email', form.contactEmail);
      body.set('contact_name', form.contactName);
      body.set('contact_phone', form.contactPhone);
      body.set('contact_position', form.contactPosition);
      body.set('partnership_type', form.partnershipType);
      body.set('proposal_content', form.proposalContent);

      if (selectedFile) {
        body.set('attachment', selectedFile);
      }

      const response = await fetch('/api/partnership-inquiries', {
        body,
        method: 'POST',
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;

        throw new Error(
          body?.message ?? '제휴 제안 접수에 실패했습니다.',
        );
      }

      resetForm();
      setSubmitState({
        message:
          '제휴 제안이 접수되었습니다. 1-3 영업일 내에 이메일로 답변드리겠습니다.',
        tone: 'success',
      });
    } catch (error) {
      setSubmitState({
        message:
          error instanceof Error
            ? error.message
            : '제휴 제안 접수 중 오류가 발생했습니다.',
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
          <div className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}
            >
              Partnership
            </span>
            <h1 className={styles.heroTitle}>
              VisionFlow와 함께 성장할
              <br />
              파트너를 찾고 있습니다
            </h1>
            <p className={styles.heroSub}>
              외주 협력, 리셀러, 기술 통합, 콘텐츠 파트너십까지 사업
              협력을 함께할 동료를 찾습니다.
              <br />
              1-3 영업일 내에 담당자가 직접 검토 후 답변드립니다.
            </p>
          </div>
        </Container>
      </section>

      <section className={styles.types}>
        <Container>
          <header className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnWhite}`}
            >
              Partnership Types
            </span>
            <h2 className={styles.sectionTitle}>
              네 가지 파트너십을 제안할 수 있습니다
            </h2>
            <p className={styles.sectionSub}>
              사업 단계와 목적에 맞는 협력 방식을 선택해 주세요.
            </p>
          </header>
          <ul className={styles.typeGrid}>
            {partnershipTypes.map((type) => {
              const Icon = type.icon;

              return (
                <li className={styles.typeItem} key={type.value}>
                  <article className={styles.typeCard}>
                    <span
                      aria-hidden="true"
                      className={styles.typeIconBox}
                    >
                      <Icon aria-hidden="true" size={22} />
                    </span>
                    <h3 className={styles.typeTitle}>{type.label}</h3>
                    <p className={styles.typeDesc}>{type.desc}</p>
                    <span className={styles.typeTag}>{type.tag}</span>
                  </article>
                </li>
              );
            })}
          </ul>
        </Container>
      </section>

      <section className={styles.form} id="form">
        <Container>
          <header className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}
            >
              Form
            </span>
            <h2 className={styles.sectionTitle}>
              제휴 제안서 보내기
            </h2>
            <p className={styles.sectionSub}>
              필수 항목만 작성해도 접수할 수 있습니다. 구체적인
              제안일수록 검토가 빨라집니다.
            </p>
          </header>

          <form className={styles.formCard} onSubmit={handleSubmit}>
            <h3 className={styles.formGroupTitle}>회사 정보</h3>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="pf-company">
                회사명 <span className={styles.formRequired}>*</span>
              </label>
              <input
                className={styles.formInput}
                id="pf-company"
                maxLength={200}
                onChange={(event) =>
                  updateForm('companyName', event.target.value)
                }
                placeholder="예: VisionFlow 주식회사"
                required
                type="text"
                value={form.companyName}
              />
            </div>

            <fieldset className={styles.formField}>
              <legend className={styles.formLabel}>
                회사 규모 <span className={styles.formRequired}>*</span>
              </legend>
              <div className={styles.chipGroup}>
                {companySizeOptions.map((option) => (
                  <button
                    aria-pressed={form.companySize === option.value}
                    className={`${styles.chip} ${
                      form.companySize === option.value
                        ? styles.chipActive
                        : ''
                    }`}
                    key={option.value}
                    onClick={() =>
                      updateForm('companySize', option.value)
                    }
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="pf-url">
                회사 소개 URL{' '}
                <span className={styles.formOptional}>(선택)</span>
              </label>
              <input
                className={styles.formInput}
                id="pf-url"
                maxLength={500}
                onChange={(event) =>
                  updateForm('companyUrl', event.target.value)
                }
                placeholder="https://yourcompany.com 또는 IR 자료 링크"
                type="url"
                value={form.companyUrl}
              />
            </div>

            <hr className={styles.divider} />

            <h3 className={styles.formGroupTitle}>담당자 정보</h3>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="pf-name">
                  이름 <span className={styles.formRequired}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  id="pf-name"
                  maxLength={200}
                  onChange={(event) =>
                    updateForm('contactName', event.target.value)
                  }
                  placeholder="담당자 이름"
                  required
                  type="text"
                  value={form.contactName}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="pf-role">
                  직책 <span className={styles.formRequired}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  id="pf-role"
                  maxLength={200}
                  onChange={(event) =>
                    updateForm('contactPosition', event.target.value)
                  }
                  placeholder="예: 사업개발 매니저"
                  required
                  type="text"
                  value={form.contactPosition}
                />
              </div>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="pf-email">
                  이메일 <span className={styles.formRequired}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  id="pf-email"
                  maxLength={254}
                  onChange={(event) =>
                    updateForm('contactEmail', event.target.value)
                  }
                  placeholder="contact@yourcompany.com"
                  required
                  type="email"
                  value={form.contactEmail}
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="pf-phone">
                  연락처{' '}
                  <span className={styles.formOptional}>(선택)</span>
                </label>
                <input
                  className={styles.formInput}
                  id="pf-phone"
                  onChange={(event) =>
                    updateForm('contactPhone', event.target.value)
                  }
                  placeholder="010-0000-0000"
                  type="tel"
                  value={form.contactPhone}
                />
              </div>
            </div>

            <hr className={styles.divider} />

            <h3 className={styles.formGroupTitle}>제휴 제안 내용</h3>
            <fieldset className={styles.formField}>
              <legend className={styles.formLabel}>
                제휴 유형 <span className={styles.formRequired}>*</span>
              </legend>
              <div className={styles.chipGroup}>
                {partnershipTypeOptions.map((option) => (
                  <button
                    aria-pressed={form.partnershipType === option.value}
                    className={`${styles.chip} ${
                      form.partnershipType === option.value
                        ? styles.chipActive
                        : ''
                    }`}
                    key={option.value}
                    onClick={() =>
                      updateForm('partnershipType', option.value)
                    }
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="pf-message">
                제휴 제안 내용{' '}
                <span className={styles.formRequired}>*</span>
              </label>
              <textarea
                className={styles.formTextarea}
                id="pf-message"
                maxLength={5000}
                onChange={(event) =>
                  updateForm('proposalContent', event.target.value)
                }
                placeholder={
                  '사업 영역과 어떤 형태의 협력을 제안하시는지 구체적으로 작성해 주세요.\n예: 보유 고객, 시장, 기술, 콘텐츠와 VisionFlow 서비스가 결합했을 때 만들 수 있는 가치'
                }
                required
                value={form.proposalContent}
              />
              <p className={styles.formHint}>
                500자 이상 권장. 현재{' '}
                {form.proposalContent.length.toLocaleString()}자
              </p>
            </div>

            <div className={styles.formField}>
              <span className={styles.formLabel}>
                첨부 파일{' '}
                <span className={styles.formOptional}>
                  (선택, 20MB 이하)
                </span>
              </span>
              <label className={styles.dropZone} htmlFor="pf-files">
                <span aria-hidden="true" className={styles.dropZoneIcon}>
                  <Upload aria-hidden="true" size={24} />
                </span>
                <span className={styles.dropZoneText}>
                  파일을 선택해 제안서 정보를 함께 남기기
                </span>
                <span className={styles.dropZoneMeta}>
                  PDF, ZIP, 이미지 · 업로드한 자료는 관리자 상세에서
                  확인할 수 있습니다
                </span>
                <input
                  accept=".pdf,.zip,image/*"
                  className={styles.dropZoneInput}
                  id="pf-files"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
              </label>
              {selectedFile ? (
                <p className={styles.fileSummary}>
                  <Paperclip aria-hidden="true" size={14} />
                  {selectedFile.name} · {formatFileSize(selectedFile.size)}
                </p>
              ) : null}
            </div>

            <hr className={styles.divider} />

            <div className={styles.consentRow}>
              <label className={styles.consent} htmlFor="pf-consent">
                <input
                  checked={isConsentChecked}
                  className={styles.consentInput}
                  id="pf-consent"
                  onChange={(event) =>
                    setIsConsentChecked(event.target.checked)
                  }
                  required
                  type="checkbox"
                />
                <span aria-hidden="true" className={styles.consentBox}>
                  <Check aria-hidden="true" size={13} />
                </span>
                <span className={styles.consentLabel}>
                  개인정보 수집 및 이용에 동의합니다.
                  <span className={styles.formRequired}>*</span>
                </span>
              </label>
              <Link className={styles.consentTerms} href={ROUTES.PRIVACY}>
                약관 보기
              </Link>
            </div>

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

            <div className={styles.formActions}>
              <button
                className={`${styles.formButton} ${styles.formButtonGhost}`}
                disabled={isSubmitting}
                onClick={resetForm}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={16} />
                초기화
              </button>
              <button
                className={`${styles.formButton} ${styles.formButtonPrimary}`}
                disabled={isSubmitting}
                type="submit"
              >
                <Send aria-hidden="true" size={16} />
                {isSubmitting ? '접수 중' : '제휴 제안 보내기'}
              </button>
            </div>
          </form>
        </Container>
      </section>

      <section className={styles.process}>
        <Container>
          <header className={styles.sectionHead}>
            <span
              className={`${styles.eyebrow} ${styles.eyebrowOnWhite}`}
            >
              Process
            </span>
            <h2 className={styles.sectionTitle}>제출 후 진행 절차</h2>
            <p className={styles.sectionSub}>
              1-3 영업일 내에 담당자가 직접 검토하고 답변드립니다.
            </p>
          </header>
          <ol className={styles.processGrid}>
            {processSteps.map((step) => (
              <li className={styles.processItem} key={step.no}>
                <article className={styles.processCard}>
                  <span className={styles.processNo}>{step.no}</span>
                  <h3 className={styles.processTitle}>{step.title}</h3>
                  <p className={styles.processDesc}>{step.desc}</p>
                  <span className={styles.processTime}>
                    {step.time}
                  </span>
                </article>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.cta}>
        <Container>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>
              제휴가 아닌 다른 문의이신가요?
            </h2>
            <p className={styles.ctaSub}>
              프로젝트 견적이나 일반 문의는 다른 채널에서 더 빠르게
              안내받을 수 있습니다.
            </p>
            <div className={styles.ctaActions}>
              <Link
                className={`${styles.ctaButton} ${styles.ctaButtonOnPrimary}`}
                href={`${ROUTES.CONTACT.ROOT}#quote`}
              >
                견적 문의
              </Link>
              <Link
                className={`${styles.ctaButton} ${styles.ctaButtonGhost}`}
                href={`${ROUTES.CONTACT.ROOT}/general`}
              >
                일반 문의
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
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
