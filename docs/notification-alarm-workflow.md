# Notification And Alarm Workflow

## 목적

이 문서는 현재 프로젝트에서 알림 설정과 알람이 어떤 원리로 동작하는지, 어떤 상황에서 어떤 방식으로 작성하고 사용하는지 정리한다.

현재 프로젝트에는 완성된 "알림 센터" 테이블은 아직 없다. 대신 아래 세 가지 알림 계층이 섞여 있다.

```txt
1. 화면 피드백 알림
   사용자가 버튼을 눌렀을 때 성공/실패를 즉시 알려주는 UI 알림

2. 업무 처리 알림
   고객에게 답변 메일을 보내거나 관리자가 사용자를 초대하는 이메일 알림

3. 운영 알람
   SLA 마감, 미답변 문의, 권한 오류처럼 운영자가 확인해야 하는 상태 알람
```

핵심 문장:

```txt
알림 설정은 "누가 무엇을 받을지" 정하고,
알림 이벤트는 "무슨 일이 발생했는지" 기록하고,
알람 발송은 "어떤 채널로 전달할지" 실행한다.
```

## 알림과 알람의 차이

실무에서는 "알림"과 "알람"을 비슷하게 쓰지만, 설계할 때는 구분하면 이해하기 쉽다.

```txt
알림 notification
= 사용자에게 알려야 하는 메시지 전체
= 예: 답변 메일 발송 완료, 접근 권한 없음, 새 문의 접수

알람 alert
= 주의가 필요한 상태를 강조하는 알림
= 예: SLA 초과, 메일 발송 실패, 미답변 문의 누적

알림 설정 notification preference
= 사용자가 어떤 종류의 알림을 어떤 채널로 받을지 정하는 규칙
= 예: 제휴 문의는 이메일로 받기, 시스템 오류는 Slack으로 받기
```

즉, 알람은 알림의 한 종류다.

```txt
notification
├─ info: 단순 정보
├─ success: 작업 성공
├─ warning: 확인 필요
└─ alert/error: 즉시 조치 필요
```

## 현재 프로젝트의 알림 구성

### 1. 화면 피드백 알림

사용자가 관리자 화면에서 작업했을 때 즉시 보이는 알림이다.

현재 프로젝트에서는 두 방식이 보인다.

```txt
Ant Design message
컴포넌트 내부 notice state
```

예: 권한 없는 페이지 접근

```tsx
message.error('접근 권한이 없습니다.');
router.replace(fallbackPath);
```

예: 제휴 문의 답신 성공/실패

```tsx
setCurrentNotice({
  message: '제휴 문의 답신 메일을 발송했습니다.',
  tone: 'success',
});
```

이런 알림은 DB에 저장하지 않는다. 사용자의 현재 화면에서만 필요한 짧은 피드백이기 때문이다.

사용 상황:

```txt
저장 성공
수정 실패
권한 없음
메일 발송 완료
입력값 누락
클립보드 복사 성공/실패
```

### 2. 이메일 알림

현재 프로젝트에서 실제 외부 발송이 구현된 알림은 이메일이다.

대표 흐름:

```txt
관리자 사용자 초대
-> Supabase Auth invite link 생성
-> Resend API로 초대 메일 발송

일반 문의 답변
-> 관리자 답변 작성
-> Resend API로 고객에게 답변 메일 발송
-> quick_inquiries 상태를 completed로 변경

제휴 문의 답신
-> 관리자 답신 작성
-> Resend API로 고객에게 답신 메일 발송
-> partnership_inquiries 상태를 reviewing 등으로 변경
```

현재 메일 발송에 필요한 환경 변수:

```txt
RESEND_API_KEY
RESEND_FROM_EMAIL
```

`RESEND_FROM_EMAIL`이 없으면 기본값으로 `VisionFlow Admin <onboarding@resend.dev>`를 사용한다.

### 3. 관리자 상단 알림 버튼

관리자 레이아웃 상단에는 알림 버튼이 있다.

```tsx
<button aria-label="알림" className={styles.notifButton} type="button">
  <Bell aria-hidden="true" size={18} strokeWidth={1.8} />
  <span aria-hidden="true" className={styles.notifDot} />
</button>
```

현재 이 버튼은 UI만 있고, 실제 알림 목록 API나 알림 테이블과 연결되어 있지는 않다.

즉, 지금은 다음 상태다.

```txt
알림 아이콘 UI 있음
읽지 않은 알림 dot UI 있음
알림 목록 조회 없음
읽음 처리 없음
알림 설정 저장 없음
```

앞으로 알림 센터를 만들려면 이 버튼을 `notifications` 테이블과 연결하면 된다.

### 4. 사용자 알림 설정 탭

사용자 상세 화면에는 `알림 설정` 탭 라벨이 있다.

```tsx
{ key: 'notification', label: '알림 설정' }
```

하지만 현재 화면은 실제 탭 전환 로직과 저장 API가 연결된 설정 화면까지 구현되어 있지는 않다.

실무적으로는 이 탭에서 아래 설정을 관리하게 된다.

```txt
이메일 알림 수신 여부
인앱 알림 수신 여부
문의/제휴/보안/시스템 이벤트별 수신 여부
즉시 발송 또는 일간 요약
SLA 알람 기준
```

## 실무 기본 구조

알림 기능은 보통 네 부분으로 나눈다.

```txt
이벤트 발생
-> 알림 생성
-> 수신자/설정 확인
-> 채널별 발송
```

조금 더 풀면 다음 흐름이다.

```txt
1. 사용자가 문의를 등록하거나 관리자가 작업을 수행한다.
2. 서버/API가 핵심 비즈니스 작업을 처리한다.
3. 작업 성공 후 notification event를 만든다.
4. 수신 대상자를 찾는다.
5. 대상자의 알림 설정을 확인한다.
6. 인앱 알림은 DB에 저장한다.
7. 이메일/Slack/push는 외부 provider로 발송한다.
8. 발송 성공/실패 로그를 남긴다.
9. 프론트는 알림 목록과 unread count를 조회한다.
10. 사용자가 열람하면 read_at을 저장한다.
```

중요한 원칙:

```txt
비즈니스 작업과 알림 발송은 분리한다.
알림 발송 실패가 핵심 작업 성공을 무조건 취소하면 안 된다.
단, 초대 메일처럼 발송 자체가 핵심 작업인 경우는 실패를 사용자에게 알려야 한다.
```

## 현재 프로젝트 기준 이메일 답변 흐름

### 일반 문의 답변

```txt
GeneralInquiryDetailPage
-> useSendQuickReplyMutation
-> POST /api/admin/quick-inquiries/reply
-> auth 확인
-> 역할 확인 SuperAdmin/admin
-> quick_inquiries에서 문의 조회
-> Resend API로 답변 메일 발송
-> quick_inquiries 상태 completed로 변경
-> React Query 캐시 갱신
-> 화면에 성공/실패 notice 표시
```

프론트 훅:

```ts
await fetch('/api/admin/quick-inquiries/reply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    inquiryId,
    replyContent,
  }),
});
```

서버에서 하는 일:

```ts
const emailResponse = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    html: toHtml(replyContent),
    subject,
    text: replyContent,
    to,
  }),
});
```

메일 발송 성공 후 DB 업데이트:

```ts
await supabaseAdmin
  .from('quick_inquiries')
  .update({
    replied_at: now,
    replied_by: repliedBy,
    reply_content: replyContent,
    status: 'completed',
    updated_at: now,
  })
  .eq('id', inquiryId);
```

### 제휴 문의 답신

```txt
PartnershipDetailPage
-> useSendPartnershipReplyMutation
-> POST /api/admin/partnership-inquiries/reply
-> auth 확인
-> 역할 확인 SuperAdmin/admin
-> partnership_inquiries에서 문의 조회
-> Resend API로 답신 메일 발송
-> 상태가 pending이면 reviewing으로 변경
-> React Query 캐시 갱신
-> 화면에 성공/실패 notice 표시
```

차이점:

```txt
일반 문의는 답변 후 completed가 된다.
제휴 문의는 답신 후에도 검토가 계속될 수 있으므로 pending -> reviewing 정도로만 바뀐다.
```

## 현재 프로젝트 기준 사용자 초대 알림 흐름

관리자가 사용자를 초대하면 이메일 알림이 발송된다.

```txt
UsersInvitePage
-> POST /api/admin/users/invite
-> auth 확인
-> SuperAdmin 권한 확인
-> Supabase Auth invite link 생성
-> profiles/user_roles upsert
-> Resend API로 초대 메일 발송
-> 성공/실패 결과 반환
```

초대 메일은 단순 알림이라기보다 가입 흐름의 핵심이다.

그래서 실패하면 `207 Multi-Status` 또는 오류 응답으로 어떤 이메일이 실패했는지 알려준다.

```txt
일부 성공, 일부 실패
-> sent 배열과 failed 배열을 함께 반환

전체 성공
-> Invitations sent.
```

## SLA 알람의 현재 방식

현재 프로젝트에는 별도 스케줄러가 SLA 알람을 보내지는 않는다.

대신 상세 화면에서 접수 시간을 기준으로 남은 시간을 계산한다.

일반 문의:

```txt
48시간 SLA
created_at + 48시간
현재 시간이 넘으면 "SLA 응답 기한 초과"
```

제휴 문의:

```txt
72시간 SLA
created_at + 72시간
현재 시간이 넘으면 "SLA 1차 응답 기한 초과"
```

예:

```ts
const dueAt = createdAt + 48 * 60 * 60 * 1000;
const diffHours = Math.ceil((dueAt - Date.now()) / 3600000);

if (diffHours <= 0) {
  return {
    title: 'SLA 응답 기한 초과',
    meta: '48시간 응답 기준을 초과했습니다.',
  };
}
```

이 방식은 "화면을 열었을 때 보이는 알람"이다.

아직 다음 기능은 없다.

```txt
SLA 초과 시 자동 이메일 발송
SLA 초과 시 Slack 알림
SLA 초과 알림 DB 저장
미처리 문의 unread count 증가
```

## 알림 설정은 무엇을 저장해야 하는가

알림 설정은 "사용자별 수신 규칙"이다.

추천 데이터 구조:

```txt
notification_preferences
id
user_id
event_type
channel
enabled
frequency
quiet_hours_start
quiet_hours_end
created_at
updated_at
```

예:

```txt
user_id    = 관리자 ID
event_type = inquiry.created
channel    = email
enabled    = true
frequency  = instant
```

event_type 예시:

```txt
inquiry.created
inquiry.replied
inquiry.sla_warning
inquiry.sla_overdue
partnership.created
partnership.replied
user.invited
auth.login_failed
system.email_failed
```

channel 예시:

```txt
in_app
email
slack
push
```

frequency 예시:

```txt
instant
hourly_digest
daily_digest
off
```

## 알림 목록은 무엇을 저장해야 하는가

인앱 알림 센터를 만들려면 실제 알림 레코드가 필요하다.

추천 데이터 구조:

```txt
notifications
id
recipient_user_id
event_type
title
body
entity_type
entity_id
severity
channel
read_at
created_at
metadata
```

예:

```txt
recipient_user_id = admin user id
event_type        = partnership.created
title             = 새 제휴 문의가 접수되었습니다.
body              = ABC Corp · 기술 파트너
entity_type       = partnership_inquiry
entity_id         = inquiry id
severity          = info
channel           = in_app
read_at           = null
```

읽지 않은 알림 수:

```sql
select count(*)
from notifications
where recipient_user_id = :user_id
  and read_at is null;
```

상단 Bell dot은 이 unread count가 1 이상일 때 표시하면 된다.

## 알림 발송 로그는 왜 필요한가

이메일 같은 외부 발송은 실패할 수 있다.

예:

```txt
RESEND_API_KEY 누락
발신 도메인 미인증
수신자 이메일 없음
provider 장애
요청 제한 rate limit
```

그래서 실무에서는 발송 로그를 남긴다.

추천 데이터 구조:

```txt
notification_deliveries
id
notification_id
channel
provider
to_address
status
provider_message_id
error_message
sent_at
created_at
```

상태 예시:

```txt
queued
sent
failed
skipped
```

이 테이블이 있으면 다음 질문에 답할 수 있다.

```txt
메일이 실제로 발송됐는가?
어떤 provider 오류가 있었는가?
재시도해야 하는가?
사용자가 메일을 못 받았다고 할 때 추적할 수 있는가?
```

## 알림 작성법

### 1. 화면 피드백 알림 작성

사용자가 지금 누른 버튼의 결과를 알려줄 때 사용한다.

좋은 예:

```tsx
try {
  await mutation.mutateAsync(payload);
  message.success('저장되었습니다.');
} catch (error) {
  message.error(error instanceof Error ? error.message : '저장에 실패했습니다.');
}
```

사용 상황:

```txt
폼 저장
삭제
상태 변경
권한 거부
파일 다운로드 실패
메일 발송 결과
```

주의할 점:

```txt
민감한 서버 오류를 그대로 노출하지 않는다.
성공 메시지는 짧게 쓴다.
실패 메시지는 다음 행동을 알 수 있게 쓴다.
```

나쁜 예:

```txt
Error
failed
알 수 없는 오류
```

좋은 예:

```txt
수신자 이메일이 없어 답변을 발송할 수 없습니다.
답변 내용을 입력한 뒤 발송해 주세요.
Reply email sender domain is not verified in Resend.
```

### 2. 이메일 알림 작성

외부 사용자에게 전달되어야 하거나, 관리자 초대처럼 메일 자체가 업무 흐름의 일부일 때 사용한다.

기본 순서:

```txt
1. 요청자 인증/권한 확인
2. 대상 데이터 조회
3. 수신자 이메일 검증
4. 제목과 본문 생성
5. HTML escape 처리
6. Resend API 호출
7. 성공 시 DB 상태 업데이트
8. 실패 시 provider 오류 반환
```

HTML 메일을 만들 때는 사용자 입력을 반드시 escape 한다.

```ts
const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
```

이 처리가 없으면 사용자가 입력한 HTML이 메일 본문에 그대로 들어갈 수 있다.

### 3. 인앱 알림 작성

관리자 상단 Bell, 알림 목록, 읽음/안읽음 처리가 필요한 경우 사용한다.

아직 현재 프로젝트에는 구현되어 있지 않지만, 작성 흐름은 다음과 같다.

```txt
문의 등록 성공
-> 알림 대상 관리자 조회
-> notification_preferences 확인
-> notifications insert
-> 상단 Bell unread count 증가
```

예상 코드:

```ts
await supabaseAdmin.from('notifications').insert({
  recipient_user_id: adminUserId,
  event_type: 'partnership.created',
  title: '새 제휴 문의가 접수되었습니다.',
  body: `${companyName} · ${partnershipType}`,
  entity_type: 'partnership_inquiry',
  entity_id: inquiryId,
  severity: 'info',
  channel: 'in_app',
});
```

## 어떤 상황에 어떤 알림을 쓰는가

### 화면 피드백만 쓰는 경우

```txt
저장 버튼을 눌렀다.
폼 입력값이 잘못됐다.
권한이 없다.
복사 버튼이 성공했다.
현재 화면에서만 알면 된다.
```

특징:

```txt
DB 저장 필요 없음
짧고 즉시 사라짐
새로고침하면 사라져도 괜찮음
```

### 인앱 알림을 쓰는 경우

```txt
관리자가 나중에 다시 확인해야 한다.
읽음/안읽음 처리가 필요하다.
알림 목록에서 과거 이벤트를 봐야 한다.
특정 상세 페이지로 이동해야 한다.
```

예:

```txt
새 제휴 문의 접수
새 일반 문의 접수
Q&A 비밀글 등록
SLA 마감 임박
SLA 초과
메일 발송 실패
```

### 이메일 알림을 쓰는 경우

```txt
사용자가 사이트에 접속해 있지 않아도 받아야 한다.
초대, 비밀번호 설정, 답변처럼 외부 전달이 핵심이다.
고객 커뮤니케이션 이력이 중요하다.
```

예:

```txt
관리자 초대
문의 답변
제휴 문의 답신
비밀번호 재설정
중요 보안 알림
```

### 알람을 쓰는 경우

```txt
운영자가 놓치면 문제가 되는 상태다.
정해진 시간 기준이 있다.
반복 확인 또는 에스컬레이션이 필요하다.
```

예:

```txt
일반 문의 48시간 미답변
제휴 문의 72시간 미검토
메일 발송 실패 3회 이상
로그인 실패 급증
Storage 업로드 실패
```

## 채널별 특징

```txt
in_app
- 관리자 화면 안에서 확인
- 읽음/안읽음 가능
- 가장 기본이 되는 알림 저장소

email
- 외부 사용자 또는 비접속 관리자에게 전달
- 발송 실패 추적 필요
- 너무 자주 보내면 피로도가 높음

slack
- 운영팀 즉시 대응에 좋음
- 실무에서는 장애/긴급/SLA 초과에 적합

push
- 모바일 앱이 있을 때 유용
- 현재 프로젝트에는 해당 기반 없음
```

## 알림 설정 UI 설계

사용자 상세의 `알림 설정` 탭을 실제로 구현한다면 다음 구성이 적절하다.

```txt
채널 설정
- 인앱 알림 on/off
- 이메일 알림 on/off
- Slack 알림 on/off

이벤트 설정
- 새 일반 문의
- 새 제휴 문의
- Q&A 비밀글
- SLA 마감 임박
- SLA 초과
- 메일 발송 실패
- 계정/보안 이벤트

빈도 설정
- 즉시
- 1시간 요약
- 일간 요약
- 끄기

방해 금지 시간
- 시작 시간
- 종료 시간
- 긴급 알람은 예외 처리 여부
```

저장 흐름:

```txt
사용자가 알림 설정 변경
-> PATCH /api/admin/users/:id/notification-preferences
-> auth 확인
-> 본인 또는 SuperAdmin 권한 확인
-> notification_preferences upsert
-> 화면에 저장 성공 message 표시
```

## 실무 개발 체크리스트

### 이벤트 체크리스트

```txt
어떤 사건이 알림을 만들어야 하는가?
이벤트 이름이 일관적인가?
이벤트에 entity_type과 entity_id가 있는가?
중복 알림을 막아야 하는가?
알림 생성이 핵심 작업 이후에 실행되는가?
```

### 수신자 체크리스트

```txt
누가 받아야 하는가?
역할별 수신자가 다른가?
작성자 본인에게도 보내는가?
퇴사/비활성 사용자는 제외하는가?
SuperAdmin만 받아야 하는 보안 이벤트인가?
```

### 설정 체크리스트

```txt
사용자가 끈 알림은 보내지 않는가?
이메일과 인앱 설정을 분리했는가?
긴급 알람은 방해 금지 시간을 무시할 수 있는가?
기본 설정이 너무 시끄럽지 않은가?
```

### 발송 체크리스트

```txt
외부 provider 오류를 처리하는가?
발송 성공/실패 로그를 남기는가?
재시도 정책이 있는가?
rate limit을 고려했는가?
발송 실패가 핵심 업무를 망치지 않는가?
```

### 보안 체크리스트

```txt
알림 본문에 민감정보를 과하게 넣지 않는가?
메일 HTML에 사용자 입력을 escape 하는가?
알림 상세 링크 접근 권한을 다시 확인하는가?
다른 사용자의 알림을 읽을 수 없게 막는가?
service role key는 서버에서만 쓰는가?
```

## 현재 프로젝트에서 확장한다면

### 1단계: 인앱 알림 테이블 추가

```txt
notifications
notification_preferences
notification_deliveries
```

최소 구현은 `notifications` 하나만으로도 가능하다.

### 2단계: 알림 생성 유틸 추가

예:

```txt
apps/src/lib/notifications.ts
```

역할:

```txt
createNotification()
createNotificationsForRole()
getUnreadCount()
markAsRead()
```

### 3단계: 문의 생성 API에 알림 연결

```txt
POST /api/quick-inquiries
-> quick_inquiries insert
-> 관리자들에게 inquiry.created 알림 insert
```

```txt
POST /api/partnership-inquiries
-> partnership_inquiries insert
-> 관리자들에게 partnership.created 알림 insert
```

### 4단계: 관리자 Topbar 연결

```txt
AdminTopbar
-> useNotificationsQuery
-> unreadCount > 0이면 dot 표시
-> Bell 클릭 시 popover 또는 알림 페이지 이동
```

### 5단계: SLA 스케줄러 추가

Supabase Edge Function 또는 Vercel Cron으로 주기적으로 확인한다.

```txt
매 10분 또는 1시간
-> pending/reviewing 문의 조회
-> SLA 기준 초과 확인
-> 이미 알림 보낸 건 제외
-> notifications insert
-> 필요 시 email/slack 발송
```

## 자주 생기는 문제

### 1. 메일은 발송됐는데 DB 업데이트가 실패함

현재 답변 API에서도 고려하는 상황이다.

```txt
Resend 발송 성공
-> DB update 실패
-> 사용자에게 "메일은 발송됐지만 상태 업데이트 실패" 오류 반환
```

실무적으로는 발송 로그를 남겨서 나중에 보정할 수 있어야 한다.

### 2. DB 작업은 성공했는데 알림 발송이 실패함

예:

```txt
문의 접수는 성공
관리자 알림 메일 발송 실패
```

문의 접수 자체를 실패 처리하면 고객 경험이 나빠진다.

권장:

```txt
핵심 작업은 성공 처리
알림 발송 실패는 notification_deliveries에 failed로 기록
운영자에게 별도 시스템 알람
```

### 3. 같은 알림이 여러 번 발송됨

SLA 스케줄러에서 자주 발생한다.

방지 방법:

```txt
event_type + entity_id + recipient_user_id unique key
또는 metadata에 threshold 값을 넣고 중복 확인
```

예:

```txt
inquiry.sla_overdue + quick_inquiry:123 + admin:456
```

### 4. 알림 설정이 너무 복잡해짐

처음부터 모든 이벤트를 세분화하면 사용자가 이해하기 어렵다.

처음에는 아래 정도가 좋다.

```txt
문의 알림
제휴 알림
Q&A 알림
보안 알림
시스템 오류 알림
```

나중에 필요해질 때 세분화한다.

## 원리 이해

### Event

이벤트는 "시스템에서 일어난 일"이다.

```txt
quick_inquiry.created
partnership_inquiry.replied
user.invited
auth.login_failed
```

이벤트는 알림보다 원시적이다.

하나의 이벤트가 여러 알림을 만들 수 있다.

```txt
partnership_inquiry.created
-> sales 관리자 인앱 알림
-> SuperAdmin 이메일 알림
-> Slack #sales 채널 알람
```

### Preference

Preference는 수신자의 선택이다.

```txt
나는 제휴 문의 알림은 이메일로 받고,
일반 문의는 인앱으로만 받고,
일간 요약은 오전 9시에 받겠다.
```

알림 발송 전 반드시 preference를 확인한다.

### Delivery

Delivery는 실제 전송 결과다.

```txt
notification은 생성됐지만
email delivery는 실패할 수 있다.
```

그래서 notification과 delivery는 분리하는 편이 좋다.

```txt
notifications = 사용자에게 보여줄 알림
notification_deliveries = 채널별 발송 시도 기록
```

## 현재 프로젝트 기준 요약

```txt
화면 피드백:
RoleGuard, Notice/FAQ/문의 화면
-> Ant Design message 또는 컴포넌트 notice state
-> DB 저장 없음

사용자 초대 메일:
UsersInvitePage
-> /api/admin/users/invite
-> Supabase Auth invite link
-> Resend email

일반 문의 답변 메일:
GeneralInquiryDetailPage
-> useSendQuickReplyMutation
-> /api/admin/quick-inquiries/reply
-> Resend email
-> quick_inquiries status completed

제휴 문의 답신 메일:
PartnershipDetailPage
-> useSendPartnershipReplyMutation
-> /api/admin/partnership-inquiries/reply
-> Resend email
-> partnership_inquiries pending -> reviewing

SLA 알람:
상세 화면에서 created_at 기준으로 48시간/72시간 계산
-> 현재는 자동 발송 없이 화면 표시만 있음

알림 센터:
AdminTopbar Bell UI만 있음
-> notifications 테이블/API/읽음 처리는 아직 없음

알림 설정:
UsersDetailPage에 알림 설정 탭 라벨만 있음
-> notification_preferences 저장 로직은 아직 없음
```

최종적으로 기억할 것:

```txt
짧은 작업 결과는 화면 피드백 알림으로 처리한다.
외부 사용자에게 전달해야 하면 이메일 알림을 쓴다.
운영자가 나중에 확인해야 하면 인앱 알림을 DB에 저장한다.
놓치면 문제가 되는 상태는 알람으로 격상한다.
알림 설정은 발송 직전에 반드시 확인한다.
알림 발송 실패는 추적 가능한 로그로 남긴다.
```
