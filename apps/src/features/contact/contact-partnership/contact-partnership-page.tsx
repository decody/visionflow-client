import { ROUTES } from '@visionflow/routes';
import Link from 'next/link';

import { Container } from '@/components/common/container';

import styles from './contact-partnership-page.module.css';

const types = [
  {
    icon: '🏢',
    title: '외주 협력사',
    desc: '프리랜서·전문 스튜디오와 함께 프로젝트를 협업합니다. 디자이너·개발자·3D 아티스트 환영.',
    tag: '프로젝트별 협업',
  },
  {
    icon: '🔁',
    title: '리셀러',
    desc: 'VisionFlow의 서비스를 자사 고객에게 재판매하실 분. 마진·교육 프로그램 제공.',
    tag: '정기 수익 모델',
  },
  {
    icon: '⚙️',
    title: '기술 파트너',
    desc: 'AI 모델·SaaS·인프라 등 기술 통합 파트너. API 연동·공동 개발 제안.',
    tag: '장기 협업',
  },
  {
    icon: '📚',
    title: '콘텐츠 파트너',
    desc: '카테고리 전문 콘텐츠·교육·미디어 협력. AI/3D 관련 분야 전문성 우선.',
    tag: 'IP 공유',
  },
] as const;

const companySizeOptions = [
  { label: '1인', active: false },
  { label: '2~10명', active: true },
  { label: '11~50명', active: false },
  { label: '50명 이상', active: false },
] as const;

const partnershipTypeOptions = [
  '외주 협력사',
  '리셀러',
  '기술 파트너',
  '콘텐츠 파트너',
  '기타',
] as const;

const processSteps = [
  {
    no: '01',
    title: '제안서 접수',
    desc: '이메일 자동 회신으로 접수 완료를 즉시 알려드립니다.',
    time: '⏱ 당일',
  },
  {
    no: '02',
    title: '사업총괄 검토',
    desc: '제안 내용을 사업총괄이 직접 검토합니다. 추가 자료 요청이 있을 수 있습니다.',
    time: '⏱ 1~2일',
  },
  {
    no: '03',
    title: '1차 답변',
    desc: '협업 가능성과 다음 단계를 이메일로 회신 드립니다.',
    time: '⏱ 1~3일',
  },
  {
    no: '04',
    title: '미팅·계약',
    desc: '협업이 결정되면 화상회의 또는 대면 미팅 후 계약 체결.',
    time: '⏱ 협의',
  },
] as const;

export function ContactPartnershipPage() {
  return (
    <>
      <section className={styles.hero}>
        <Container>
          <div className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}>Partnership</span>
            <h1 className={styles.heroTitle}>
              VisionFlow와 함께
              <br />
              성장하실 파트너를 찾고 있습니다
            </h1>
            <p className={styles.heroSub}>
              외주 협력사·리셀러·기술 파트너·콘텐츠 파트너 — 사업 협력을 함께할 동료를 찾습니다.
              <br />
              1~3 영업일 내에 사업총괄이 직접 검토 후 답변 드립니다.
            </p>
          </div>
        </Container>
      </section>

      <section className={styles.types}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowOnWhite}`}>Partnership Types</span>
            <h2 className={styles.sectionTitle}>4가지 파트너십을 제안합니다</h2>
            <p className={styles.sectionSub}>
              귀사의 사업 단계와 목적에 맞는 협력 방식을 선택해주세요.
            </p>
          </header>
          <ul className={styles.typeGrid}>
            {types.map((t) => (
              <li className={styles.typeItem} key={t.title}>
                <article className={styles.typeCard}>
                  <span aria-hidden="true" className={styles.typeIconBox}>
                    {t.icon}
                  </span>
                  <h3 className={styles.typeTitle}>{t.title}</h3>
                  <p className={styles.typeDesc}>{t.desc}</p>
                  <span className={styles.typeTag}>{t.tag}</span>
                </article>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className={styles.form} id="form">
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowOnSurface}`}>Form</span>
            <h2 className={styles.sectionTitle}>제휴 제안서 보내기</h2>
            <p className={styles.sectionSub}>
              필수 항목만 작성해도 충분합니다. 첨부 자료가 있으면 검토 속도가 빨라집니다.
            </p>
          </header>
          <form className={styles.formCard}>
            <h3 className={styles.formGroupTitle}>회사 정보</h3>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="pf-company">
                회사명 <span className={styles.formRequired}>*</span>
              </label>
              <input
                className={styles.formInput}
                id="pf-company"
                name="company"
                placeholder="예) VisionFlow 주식회사"
                required
                type="text"
              />
            </div>
            <fieldset className={styles.formField}>
              <legend className={styles.formLabel}>
                회사 규모 <span className={styles.formOptional}>(선택)</span>
              </legend>
              <div className={styles.chipGroup}>
                {companySizeOptions.map((o) => (
                  <button
                    className={`${styles.chip} ${o.active ? styles.chipActive : ''}`}
                    key={o.label}
                    type="button"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>

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
                  name="name"
                  placeholder="담당자 이름"
                  required
                  type="text"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="pf-role">
                  직책 <span className={styles.formRequired}>*</span>
                </label>
                <input
                  className={styles.formInput}
                  id="pf-role"
                  name="role"
                  placeholder="예) 사업개발 매니저"
                  required
                  type="text"
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
                  name="email"
                  placeholder="contact@yourcompany.com"
                  required
                  type="email"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor="pf-phone">
                  연락처 <span className={styles.formOptional}>(선택)</span>
                </label>
                <input
                  className={styles.formInput}
                  id="pf-phone"
                  name="phone"
                  placeholder="010-0000-0000"
                  type="tel"
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
                {partnershipTypeOptions.map((label) => (
                  <button className={styles.chip} key={label} type="button">
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="pf-message">
                제휴 제안 내용 <span className={styles.formRequired}>*</span>
              </label>
              <textarea
                className={styles.formTextarea}
                id="pf-message"
                name="message"
                placeholder={
                  '귀사의 사업 영역과 어떤 형태의 협력을 제안하시는지 구체적으로 작성해주세요.\n예) 보유 고객·시장·기술·콘텐츠와 우리의 어떤 서비스를 결합할 때 어떤 가치가 만들어지는지.'
                }
                required
              />
              <p className={styles.formHint}>500자 이상 권장. 구체적일수록 검토가 빠릅니다.</p>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="pf-url">
                회사 소개 자료 URL <span className={styles.formOptional}>(선택)</span>
              </label>
              <input
                className={styles.formInput}
                id="pf-url"
                name="url"
                placeholder="https://yourcompany.com 또는 IR 자료 링크"
                type="url"
              />
            </div>

            <div className={styles.formField}>
              <span className={styles.formLabel}>
                첨부 파일 <span className={styles.formOptional}>(선택)</span>
              </span>
              <label className={styles.dropZone} htmlFor="pf-files">
                <span aria-hidden="true" className={styles.dropZoneIcon}>
                  📎
                </span>
                <span className={styles.dropZoneText}>파일을 드래그하거나 클릭해서 업로드</span>
                <span className={styles.dropZoneMeta}>PDF, ZIP, 이미지 — 최대 5개, 50MB</span>
                <input
                  accept=".pdf,.zip,image/*"
                  className={styles.dropZoneInput}
                  id="pf-files"
                  multiple
                  name="files"
                  type="file"
                />
              </label>
            </div>

            <hr className={styles.divider} />

            <div className={styles.consentRow}>
              <label className={styles.consent} htmlFor="pf-consent">
                <input
                  className={styles.consentInput}
                  defaultChecked
                  id="pf-consent"
                  name="consent"
                  required
                  type="checkbox"
                />
                <span aria-hidden="true" className={styles.consentBox}>
                  ✓
                </span>
                <span className={styles.consentLabel}>
                  개인정보 수집 및 이용에 동의합니다
                  <span className={styles.formRequired}>*</span>
                </span>
              </label>
              <Link className={styles.consentTerms} href={ROUTES.PRIVACY}>
                약관 보기
              </Link>
            </div>

            <div className={styles.formActions}>
              <button className={`${styles.formButton} ${styles.formButtonGhost}`} type="reset">
                취소
              </button>
              <button className={`${styles.formButton} ${styles.formButtonPrimary}`} type="submit">
                제휴 제안 보내기
              </button>
            </div>
          </form>
        </Container>
      </section>

      <section className={styles.process}>
        <Container>
          <header className={styles.sectionHead}>
            <span className={`${styles.eyebrow} ${styles.eyebrowOnWhite}`}>Process</span>
            <h2 className={styles.sectionTitle}>제출 후 진행 절차</h2>
            <p className={styles.sectionSub}>
              1~3 영업일 내에 사업총괄이 직접 검토 후 답변 드립니다.
            </p>
          </header>
          <ol className={styles.processGrid}>
            {processSteps.map((s) => (
              <li className={styles.processItem} key={s.no}>
                <article className={styles.processCard}>
                  <span className={styles.processNo}>{s.no}</span>
                  <h3 className={styles.processTitle}>{s.title}</h3>
                  <p className={styles.processDesc}>{s.desc}</p>
                  <span className={styles.processTime}>{s.time}</span>
                </article>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className={styles.cta}>
        <Container>
          <div className={styles.ctaInner}>
            <h2 className={styles.ctaTitle}>제휴가 아닌 다른 문의이신가요?</h2>
            <p className={styles.ctaSub}>프로젝트 견적이나 일반 문의는 다른 채널이 더 빠릅니다.</p>
            <div className={styles.ctaActions}>
              <Link
                className={`${styles.ctaButton} ${styles.ctaButtonOnPrimary}`}
                href={`${ROUTES.CONTACT.ROOT}#quote`}
              >
                견적 문의 →
              </Link>
              <Link
                className={`${styles.ctaButton} ${styles.ctaButtonGhost}`}
                href={`${ROUTES.CONTACT.ROOT}/general`}
              >
                일반 문의 →
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
