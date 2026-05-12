import { ROUTES } from '@visionflow/routes';
import { Container } from '@/components/common/container';
import styles from './contact-general-detail-secret-page.module.css';
const boardRows = [
    { no: 124, title: 'Three.js로 만든 3D 컨피규레이터 견적은 어느 정도일까요?' },
    { no: 123, title: 'AI 광고 이미지 100컷 작업 평균 기간이 어떻게 되나요?' },
    { no: 122, title: '🔒 내부 시스템 연동 프로젝트 NDA 검토 요청드립니다', highlight: true },
    { no: 121, title: '대시보드 작업에서 데이터 소스는 어떤 것까지 지원하나요?' },
];
const ndaSteps = [
    { label: '양식 접수 및 1차 검토', status: 'done' },
    {
        label: '법무 의견 검토 (제5조 손해배상 한도, 제8조 분쟁 관할)',
        status: 'progress',
    },
    { label: '양사 합의안 협의', status: 'pending' },
    { label: '서명 완료 → RFP 공유', status: 'pending' },
];
const ndaStatusLabel = {
    done: '완료',
    progress: '진행중',
    pending: '대기',
};
function StateLabel({ icon, text }) {
    return (<div className={styles.stateLabel}>
      <span aria-hidden="true">{icon}</span> {text}
    </div>);
}
function BoardMock() {
    return (<div aria-hidden="true" className={styles.boardMock}>
      <div className={styles.boardMockHeader}>번호 제목 작성자 날짜 조회 답변</div>
      {boardRows.map((r) => (<div className={`${styles.boardMockRow} ${r.highlight ? styles.boardMockRowHighlight : ''}`} key={r.no}>
          <span className={styles.boardMockNo}>{r.no}</span>
          <span className={styles.boardMockTitle}>{r.title}</span>
        </div>))}
    </div>);
}
function ModalScene({ children }) {
    return (<div className={styles.modalScene}>
      <BoardMock />
      <div aria-hidden="true" className={styles.overlay}/>
      <div className={styles.modalSlot}>{children}</div>
    </div>);
}
function PasswordModal({ variant }) {
    const isError = variant === 'error';
    return (<div className={styles.modal} role="dialog">
      <div className={styles.modalHeader}>
        <button aria-label="닫기" className={styles.modalClose} type="button">
          ×
        </button>
      </div>
      <div className={styles.modalBody}>
        <div aria-hidden="true" className={`${styles.modalIcon} ${isError ? styles.modalIconError : ''}`}>
          🔒
        </div>
        <div className={styles.modalText}>
          <h2 className={styles.modalTitle}>
            {isError ? '비밀번호가 일치하지 않습니다' : '비밀글입니다'}
          </h2>
          <p className={styles.modalSub}>
            {isError ? ('다시 시도해 주세요. 비밀번호는 작성 시 본인이 설정한 값입니다.') : (<>
                이 게시글은 작성자와 운영팀만 볼 수 있습니다.
                <br />
                작성 시 설정한 비밀번호를 입력해 주세요.
              </>)}
          </p>
        </div>
        <div className={styles.modalPostRef}>
          <span aria-hidden="true">🔒</span>
          <span className={styles.modalPostNo}>#122</span>
          <span className={styles.modalPostTitle}>
            내부 시스템 연동 프로젝트 NDA 검토 요청드립니다
          </span>
        </div>
        <div className={styles.modalField}>
          <label className={styles.modalLabel} htmlFor={`pw-${variant}`}>
            비밀번호 <span className={styles.modalRequired}>*</span>
          </label>
          <div className={`${styles.modalInputWrap} ${isError ? styles.modalInputWrapError : styles.modalInputWrapFocus}`}>
            {isError ? (<input className={styles.modalInput} id={`pw-${variant}`} placeholder="비밀번호를 다시 입력해 주세요" type="password"/>) : (<span aria-hidden="true" className={styles.modalDots}>
                {Array.from({ length: 6 }).map((_, i) => (<span className={styles.modalDot} key={i}/>))}
                <span className={styles.modalCaret}/>
              </span>)}
            <button aria-label="비밀번호 보기" className={`${styles.modalEyeBtn} ${isError ? styles.modalEyeBtnError : ''}`} type="button">
              {isError ? '⚠️' : '👁'}
            </button>
          </div>
          {isError ? (<div className={styles.modalErrorRow}>
              <span className={styles.modalErrorText}>비밀번호가 일치하지 않습니다.</span>
              <span className={styles.modalAttemptChip}>5회 중 2회 실패</span>
            </div>) : (<div className={styles.modalHint}>
              <span aria-hidden="true">💡</span>
              <span>작성 시 설정한 비밀번호 · 운영팀은 비밀번호 없이 조회 가능</span>
            </div>)}
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={`${styles.modalBtn} ${styles.modalBtnGhost}`} type="button">
          취소
        </button>
        <button className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} type="button">
          <span aria-hidden="true">🔓</span> {isError ? '다시 시도' : '비밀글 보기'}
        </button>
      </div>
    </div>);
}
function LockoutModal() {
    return (<div className={`${styles.modal} ${styles.modalLockout}`} role="dialog">
      <div aria-hidden="true" className={styles.modalDangerBar}/>
      <div className={styles.lockoutBody}>
        <div aria-hidden="true" className={styles.lockoutIcon}>
          🚫
        </div>
        <h2 className={styles.lockoutTitle}>일시적으로 잠겼습니다</h2>
        <p className={styles.lockoutSub}>
          비밀번호를 5회 연속 잘못 입력하셨습니다.
          <br />
          보안을 위해 일시적으로 인증이 차단되었습니다.
        </p>
        <div className={styles.countdownBox}>
          <span className={styles.countdownLabel}>재시도 가능까지</span>
          <div aria-live="polite" className={styles.countdownTime}>
            <span>04</span>
            <span className={styles.countdownColon}>:</span>
            <span>38</span>
          </div>
          <span className={styles.countdownUnit}>분 : 초</span>
          <div className={styles.countdownBar}>
            <div className={styles.countdownProgress}/>
          </div>
        </div>
        <div className={styles.lockoutAttempt}>
          <span aria-hidden="true">⚠️</span>
          <span>5/5 시도 실패 · IP 기반 차단</span>
        </div>
        <hr className={styles.lockoutDivider}/>
        <p className={styles.lockoutHelpTitle}>비밀번호를 잊으셨나요?</p>
        <p className={styles.lockoutHelpSub}>
          운영팀에 직접 연락하시면 본인 확인 후 비밀글을 다시 열어드립니다.
        </p>
        <div className={styles.lockoutChannels}>
          <a className={styles.lockoutChannel} href={ROUTES.KAKAO}>
            <span aria-hidden="true" className={styles.lockoutChannelIconKakao}>
              💬
            </span>
            <span className={styles.lockoutChannelText}>
              <strong>카카오톡</strong>
              <span>운영시간 내 즉시 응답</span>
            </span>
          </a>
          <a className={styles.lockoutChannel} href="mailto:contact@visionflow.kr">
            <span aria-hidden="true" className={styles.lockoutChannelIcon}>
              ✉️
            </span>
            <span className={styles.lockoutChannelText}>
              <strong>이메일</strong>
              <span>contact@visionflow.kr</span>
            </span>
          </a>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={`${styles.modalBtn} ${styles.modalBtnGhost}`} type="button">
          ← 게시판으로 돌아가기
        </button>
      </div>
    </div>);
}
function SecretPostView() {
    return (<div className={styles.secretView}>
      <div className={styles.privacyBanner}>
        <div className={styles.privacyBannerLeft}>
          <span aria-hidden="true" className={styles.privacyBannerIcon}>
            🔒
          </span>
          <div className={styles.privacyBannerText}>
            <p className={styles.privacyBannerTitle}>
              🔓 비공개 게시글입니다 · 비밀번호 인증 완료
            </p>
            <p className={styles.privacyBannerSub}>
              이 게시글의 본문과 댓글은 작성자와 운영팀만 볼 수 있습니다. 30분 후 재인증이
              필요합니다.
            </p>
          </div>
        </div>
        <span className={styles.privacyBannerTimer}>
          <span aria-hidden="true">⏱</span> 29:34 후 만료
        </span>
      </div>

      <article className={styles.postCard}>
        <header className={styles.postHeader}>
          <div className={styles.postBadgeRow}>
            <span className={`${styles.statusBadge} ${styles.statusProgress}`}>
              <span aria-hidden="true" className={styles.statusDot}/> NDA 검토 진행중
            </span>
            <span className={styles.secretBadge}>
              <span aria-hidden="true">🔒</span> 비밀글
            </span>
            <span className={styles.categoryBadge}>기술</span>
            <span className={styles.postNo}># 122</span>
          </div>
          <h1 className={styles.postTitle}>내부 시스템 연동 프로젝트 NDA 검토 요청드립니다</h1>
          <div className={styles.postMeta}>
            <div className={styles.postAuthor}>
              <span aria-hidden="true" className={styles.avatar}>
                이
              </span>
              <div className={styles.authorText}>
                <div className={styles.authorNameRow}>
                  <span className={styles.authorName}>이*수</span>
                  <span className={styles.anonChip}>익명 처리됨</span>
                </div>
                <span className={styles.authorDate}>2025.04.30 16:22</span>
              </div>
            </div>
            <div className={styles.postStats}>
              <span className={styles.stat}>
                <span aria-hidden="true">👁</span>
                <strong>8</strong>
                <span className={styles.statLabel}>조회</span>
              </span>
              <span className={styles.stat}>
                <span aria-hidden="true">💬</span>
                <strong>1</strong>
                <span className={styles.statLabel}>댓글</span>
              </span>
            </div>
          </div>
        </header>
        <hr className={styles.divider}/>
        <div className={styles.postBody}>
          <p className={styles.bodyParagraph}>
            안녕하세요. 자사 내부 운영 시스템과 외부 파트너 시스템을 연동하는 프로젝트의 견적을
            받고 싶어 비밀글로 작성합니다.
          </p>
          <p className={styles.bodyParagraph}>
            {`연동 대상 시스템:\n· 내부 ERP (SAP S/4HANA — 일부 커스터마이징 모듈)\n· 외부 파트너 API (계약 후 제공)\n· 자사 데이터 웨어하우스 (Snowflake)`}
          </p>
          <p className={styles.bodyParagraph}>
            핵심 요건은 실시간 양방향 동기화 + 변경 이력 추적 + 장애 시 자동 복구입니다. 보안
            요건이 매우 까다로워 대외 공개가 어려운 상황이므로 사전에 NDA 체결 후 상세 논의를
            부탁드립니다.
          </p>
          <p className={styles.bodyParagraph}>
            저희 쪽 NDA 양식 첨부합니다. 검토 부탁드립니다. 양식 합의 후 상세 RFP 공유드리겠습니다.
          </p>
          <p className={styles.attachLabel}>첨부 자료 (비공개)</p>
          <div className={`${styles.attachItem} ${styles.attachItemSecret}`}>
            <span aria-hidden="true" className={styles.attachIconBox}>
              🔒
            </span>
            <div className={styles.attachText}>
              <span className={styles.attachName}>NDA_template_2025_v3_internal-only.pdf</span>
              <span className={styles.attachMeta}>
                142 KB · 비공개 · 작성자·운영팀만 다운로드 가능
              </span>
            </div>
            <button className={styles.attachDownload} type="button">
              🔓 다운로드
            </button>
          </div>
        </div>
      </article>

      <div className={styles.answerSection}>
        <div className={styles.answerLabel}>
          <span aria-hidden="true" className={styles.answerLabelDot}/>
          운영팀 답변 · NDA 검토 중
        </div>
        <article className={styles.answerCard}>
          <header className={styles.answerHeader}>
            <span aria-hidden="true" className={`${styles.avatar} ${styles.avatarLarge}`}>
              V
            </span>
            <div className={styles.answerHeaderText}>
              <div className={styles.answerNameRow}>
                <span className={styles.answerName}>VisionFlow 운영팀</span>
                <span className={styles.officialBadge}>
                  <span aria-hidden="true">✓</span> 공식 답변
                </span>
              </div>
              <div className={styles.answerMetaRow}>
                <span>NDA 검토 담당 · 김지현 (법무)</span>
                <span aria-hidden="true">·</span>
                <span>2025.05.01 11:08</span>
                <span aria-hidden="true">·</span>
                <span className={styles.answerResponseTime}>⏱ 응답 18시간</span>
              </div>
            </div>
          </header>
          <div className={styles.answerBody}>
            <p className={styles.answerGreeting}>이*수님, NDA 검토 요청 감사합니다.</p>
            <p className={styles.bodyParagraph}>
              첨부해 주신 NDA 양식 (v3)을 검토했고, 다음 두 가지 조항만 협의 후 진행이 가능합니다.
            </p>
            <div className={styles.ndaBox}>
              <p className={styles.ndaBoxTitle}>NDA 검토 진행 현황</p>
              {ndaSteps.map((s) => (<div className={styles.ndaRow} key={s.label}>
                  <span aria-hidden="true" className={`${styles.ndaMarker} ${s.status === 'done'
                ? styles.ndaMarkerDone
                : s.status === 'progress'
                    ? styles.ndaMarkerProgress
                    : styles.ndaMarkerPending}`}>
                    {s.status === 'done' ? '✓' : s.status === 'progress' ? '●' : ''}
                  </span>
                  <span className={styles.ndaStep}>{s.label}</span>
                  <span className={`${styles.ndaStatus} ${styles[`ndaStatus_${s.status}`] ?? ''}`}>
                    {ndaStatusLabel[s.status]}
                  </span>
                </div>))}
            </div>
            <p className={styles.bodyParagraph}>
              협의 의견은 별도 메일 (rev.law@visionflow.kr) 로 회신드렸습니다. 메일 내용 확인
              부탁드립니다.
            </p>
            <p className={styles.bodyParagraph}>
              본 게시글은 비밀글이지만, 양사 간 민감 정보(제품명·금액·기술 스택 디테일)는 게시판이
              아닌 메일로만 다루겠습니다.
            </p>
          </div>
        </article>
      </div>

      <section aria-label="비밀 댓글" className={styles.commentsCard}>
        <header className={styles.commentsHeader}>
          <span aria-hidden="true">💬</span>
          <h2 className={styles.commentsTitle}>비밀 댓글</h2>
          <span className={styles.commentsCount}>1</span>
          <span className={styles.commentsHint}>
            <span aria-hidden="true">🔒</span> 작성자·운영팀만 표시
          </span>
        </header>
        <ul className={styles.commentList}>
          <li className={styles.commentItem}>
            <span aria-hidden="true" className={`${styles.avatar} ${styles.avatarMuted}`}>
              이
            </span>
            <div className={styles.commentBody}>
              <div className={styles.commentMetaRow}>
                <span className={styles.commentAuthor}>이*수</span>
                <span className={styles.commentBadgeAuthor}>작성자</span>
                <span className={styles.commentBadgeSecret}>
                  <span aria-hidden="true">🔒</span> 비밀
                </span>
                <span aria-hidden="true" className={styles.commentDot}>
                  ·
                </span>
                <span className={styles.commentDate}>2025.05.01 14:42</span>
                <button aria-label="더보기" className={styles.commentMore} type="button">
                  ⋯
                </button>
              </div>
              <p className={styles.commentText}>
                확인했습니다. 메일로 회신드리겠습니다. 두 조항 협의 후 RFP 빠르게
                공유드리도록 하겠습니다.
              </p>
              <div className={styles.commentActions}>
                <button className={styles.commentLike} type="button">
                  <span aria-hidden="true">👍</span> 0
                </button>
                <button className={styles.commentReplyBtn} type="button">
                  답글 달기
                </button>
              </div>
            </div>
          </li>
        </ul>

        <hr className={styles.divider}/>

        <form className={styles.commentForm}>
          <div className={styles.commentFormHead}>
            <span className={styles.commentFormTitle}>🔒 비밀 댓글 작성</span>
            <span className={styles.commentFormHint}>
              비밀글에 작성하는 모든 댓글은 자동으로 비밀 처리됩니다
            </span>
          </div>
          <div className={styles.commentFormRow}>
            <input aria-label="이름" className={styles.commentInput} placeholder="이름 *" required type="text"/>
            <input aria-label="비밀번호" className={styles.commentInput} placeholder="비밀번호 (수정·삭제 시 필요)" required type="password"/>
          </div>
          <textarea aria-label="댓글 내용" className={styles.commentTextarea} maxLength={500} placeholder="답변 내용을 입력하세요. 작성자와 운영팀만 볼 수 있습니다." required/>
          <div className={styles.commentFormFooter}>
            <span className={styles.privateLocked}>
              <span aria-hidden="true" className={styles.privateLockedCheck}>
                ✓
              </span>
              <span>🔒 비밀 댓글</span>
              <span className={styles.privateLockedChip}>🔐 잠금 (변경 불가)</span>
            </span>
            <span className={styles.commentCounter}>0 / 500</span>
            <button className={`${styles.commentSubmit} ${styles.commentSubmitSecret}`} type="submit">
              <span aria-hidden="true">🔒</span> 비밀 댓글 등록
            </button>
          </div>
        </form>
      </section>
    </div>);
}
export function ContactGeneralDetailSecretPage() {
    return (<div className={styles.page}>
      <Container>
        <section className={styles.stateSection}>
          <StateLabel icon="🔒" text="STATE A · 비밀글 클릭 직후 — 비밀번호 입력 모달"/>
          <ModalScene>
            <PasswordModal variant="default"/>
          </ModalScene>
        </section>

        <section className={styles.stateSection}>
          <StateLabel icon="⚠️" text="STATE A2 · 비밀번호 오류 — input error state + 시도 횟수 안내"/>
          <ModalScene>
            <PasswordModal variant="error"/>
          </ModalScene>
        </section>

        <section className={styles.stateSection}>
          <StateLabel icon="✓" text="STATE B · 인증 후 비밀글 본문 — 비공개 banner + NDA 진행중 + 비밀 댓글 default"/>
          <SecretPostView />
        </section>

        <section className={styles.stateSection}>
          <StateLabel icon="🚫" text="STATE C · 5회 연속 실패 — 5분 lockout + 운영팀 직접 연락 권유"/>
          <ModalScene>
            <LockoutModal />
          </ModalScene>
        </section>
      </Container>
    </div>);
}
