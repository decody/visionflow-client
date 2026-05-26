# Contact Inquiry And Quote Workflow

## 목적

이 문서는 현재 VisionFlow 프로젝트를 기준으로 문의하기와 견적문의가 어떤 원리로 동작하는지, 어떤 상황에서 어떤 문의 채널을 써야 하는지, 프론트/서버/DB/관리자 화면이 어떻게 이어지는지 정리한다.

`docs/file-attachment-workflow.md`가 파일 첨부를 중심으로 설명했다면, 이 문서는 문의 도메인 전체를 다룬다.

핵심 문장:

```txt
문의는 고객의 의도를 구조화해서 저장하고,
관리자는 저장된 문의를 분류하고 답변하며,
견적은 프로젝트 조건을 가격과 일정으로 바꾸는 업무 흐름이다.
```

## 용어 정리

현재 프로젝트에서는 "문의하기"라는 큰 입구 안에 여러 채널이 있다.

```txt
Contact
= 문의 채널 선택 페이지
= /contact

일반 문의
= 서비스 질문, 기술 질문, 절차 질문, NDA 등 자유 문의
= /contact/general
= quick_inquiries 테이블

제휴 문의
= 외주 협력, 리셀러, 기술 파트너, 콘텐츠 파트너 제안
= /contact/partnership
= partnership_inquiries 테이블

견적 문의
= 프로젝트 비용, 일정, 범위 산정을 위한 요청
= /contact/quote 로 계획되어 있음
= 관리자 화면은 /settings/quote-request 에 목업 형태로 구현되어 있음
```

문의는 단순히 "메시지 보내기"가 아니다.

실무적으로는 아래 정보를 모으는 일이다.

```txt
누가 문의했는가?
무엇을 원하는가?
어떤 채널로 답해야 하는가?
얼마나 빨리 처리해야 하는가?
첨부 자료가 있는가?
관리자가 어떤 상태로 처리하고 있는가?
```

## 현재 프로젝트의 문의 채널

### 1. Contact 메인 페이지

`/contact`는 실제 문의를 저장하지 않는다.

사용자에게 어떤 채널로 이동할지 선택하게 하는 안내 페이지다.

```txt
ContactPage
-> 견적 문의 카드
-> 제휴 문의 카드
-> 일반 문의 카드
-> FAQ
-> 회사 정보와 SLA 안내
```

코드 기준:

```txt
apps/src/features/web/contact/contact-page.tsx
```

여기서 중요한 점은 `/contact`가 "작성 폼"이 아니라 "분기 페이지"라는 것이다.

사용자가 어떤 목적을 가지고 있는지에 따라 다른 화면으로 보내야 한다.

```txt
프로젝트 비용이 궁금함       -> 견적 문의
서비스 사용/절차가 궁금함    -> 일반 문의
협력/파트너십 제안          -> 제휴 문의
빠른 실시간 상담            -> 카카오톡
```

### 2. 일반 문의

일반 문의는 가장 가벼운 문의 채널이다.

사용자가 이름, 이메일, 제목, 내용을 입력하면 `quick_inquiries`에 저장된다.

```txt
ContactGeneralFormPage
-> useCreateQuickMutation
-> POST /api/quick-inquiries
-> request.json()
-> quick_inquiries insert
-> 201 Created
-> 화면에 "문의가 접수되었습니다." 표시
```

사용 상황:

```txt
서비스 이용 방법 질문
견적 전 간단한 가능 여부 질문
기존 사이트 일부 개선 문의
기술 스택이나 진행 방식 질문
NDA, 계약, 유지보수 관련 일반 질문
```

일반 문의는 구조화된 견적 데이터가 아니라 자유 텍스트에 가깝다.

그래서 필수값도 단순하다.

```txt
name     = 이름
email    = 답변받을 이메일
content  = 문의 내용
subject  = 제목, 선택값
```

### 3. 제휴 문의

제휴 문의는 일반 문의보다 업무 성격이 강하다.

회사 정보, 담당자 정보, 제휴 유형, 제안 내용을 구조화해서 받는다.

```txt
ContactPartnershipPage
-> FormData 생성
-> POST /api/partnership-inquiries
-> request.formData()
-> 첨부 파일이 있으면 Storage 업로드
-> partnership_inquiries insert
-> 201 Created
-> 화면에 접수 성공 표시
```

사용 상황:

```txt
외주 협력사가 함께 프로젝트를 수행하고 싶을 때
리셀러가 VisionFlow 서비스를 판매하고 싶을 때
기술 파트너가 API/인프라/AI 모델을 결합하고 싶을 때
콘텐츠 파트너가 데이터, 룰셋, IP, 제작 역량을 제공하고 싶을 때
기타 사업 협력 제안을 하고 싶을 때
```

제휴 문의는 제안서나 회사소개서가 함께 올 수 있으므로 파일 첨부를 지원한다.

```txt
파일 원본       -> Supabase Storage partnership-attachments bucket
파일 메타데이터 -> partnership_inquiries attachment_* 컬럼
```

### 4. 견적 문의

견적 문의는 프로젝트 상담을 실제 비용과 일정으로 바꾸기 위한 채널이다.

현재 라우트 정의에는 아래 경로가 있다.

```txt
ROUTES.CONTACT.QUOTE = /contact/quote
ROUTES.ADMIN.QUOTE_REQUEST.ROOT = /settings/quote-request
```

다만 현재 코드 기준으로는 공개 사용자용 `/contact/quote` 작성 페이지와 견적 문의 생성 API가 아직 구현되어 있지 않다.

관리자 쪽에는 `/settings/quote-request` 목록과 상세 화면이 구현되어 있지만, 현재는 실제 DB 연동보다는 고정 샘플 데이터 기반의 화면 목업에 가깝다.

```txt
QuoteRequestListPage
-> 샘플 ROWS 배열 렌더링
-> 상태 탭, 검색, CSV 버튼 UI
-> 상세 링크 /settings/quote-request/:id

QuoteRequestDetailPage
-> 요청 본문 샘플
-> 견적서 작성 UI
-> 라인 아이템, 합계, PDF 미리보기 버튼 UI
-> 견적서 발송 버튼 UI
```

즉, 실무 개념으로는 견적 문의가 중요하지만 현재 프로젝트 구현 상태는 아래처럼 이해하면 된다.

```txt
개념/라우트        있음
관리자 화면 UI     있음
공개 작성 폼       아직 없음
생성 API           아직 없음
quote_requests DB  현재 코드에서 확인되지 않음
```

## 문의 작성법

### 일반 문의 작성법

일반 문의는 JSON 요청으로 보낸다.

프론트 입력:

```tsx
const name = form.name.trim();
const email = form.email.trim();
const subject = form.subject.trim();
const content = form.content.trim();

await createQuickMutation.mutateAsync({
  name,
  email,
  subject: subject || null,
  content,
});
```

React Query mutation:

```tsx
await fetch('/api/quick-inquiries', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name,
    email,
    subject,
    content,
  }),
});
```

서버 API:

```txt
POST /api/quick-inquiries
-> request.json()
-> normalizePayload()
-> supabaseAdmin.from('quick_inquiries').insert(payload)
-> NextResponse.json(inquiry, { status: 201 })
```

필수 검증:

```txt
name    필수, 100자 이하
email   필수, 이메일 형식, 254자 이하
content 필수, 5000자 이하
subject 선택, 200자 이하
```

DB에 저장되는 기본 상태:

```txt
status = pending
created_at = 현재 시간
updated_at = 현재 시간
```

### 제휴 문의 작성법

제휴 문의는 파일 첨부가 가능하므로 `FormData`로 보낸다.

프론트 입력:

```tsx
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

await fetch('/api/partnership-inquiries', {
  method: 'POST',
  body,
});
```

주의할 점:

```txt
FormData를 보낼 때 Content-Type을 직접 지정하지 않는다.
브라우저가 multipart boundary를 자동으로 붙여야 한다.
```

서버 API:

```txt
POST /api/partnership-inquiries
-> content-type 확인
-> multipart/form-data면 request.formData()
-> 파일이 있으면 Supabase Storage 업로드
-> normalizePayload()
-> partnership_inquiries insert
-> NextResponse.json(inquiry, { status: 201 })
```

필수 검증:

```txt
company_name      필수, 200자 이하
company_size      필수, 1 | 2-10 | 11-50 | 50+
contact_name      필수, 200자 이하
contact_email     필수, 이메일 형식, 254자 이하
contact_position  필수, 200자 이하
partnership_type  필수, outsourcing | reseller | tech_partner | content_partner | etc
proposal_content  필수, 5000자 이하
attachment         선택, 20MB 이하
```

DB에 저장되는 기본 상태:

```txt
status = pending
admin_memo = null
created_at = 현재 시간
updated_at = 현재 시간
```

첨부 파일이 있으면 추가로 저장된다.

```txt
attachment_url   = Storage 내부 path
attachment_name  = 원본 파일명
attachment_type  = MIME type
attachment_size  = 파일 크기
```

예:

```txt
attachment_url = partnership-inquiries/2026-05-25/uuid.pdf
```

### 견적 문의 작성법

현재 공개 견적 작성 폼은 아직 구현되어 있지 않다.

앞으로 구현한다면 일반 문의와 제휴 문의의 중간 구조가 된다.

견적 문의는 자유 텍스트만 받으면 나중에 관리자가 다시 물어볼 일이 많다.

그래서 처음부터 프로젝트 산정에 필요한 값을 구조화하는 편이 좋다.

권장 필드:

```txt
company_name      회사명
contact_name      담당자명
contact_email     이메일
contact_phone     연락처
service_type      서비스 유형
project_summary   프로젝트 한 줄 설명
requirements      주요 요구사항
budget_range      예산 범위
desired_timeline  희망 일정
launch_date       목표 오픈일
reference_url     참고 URL
attachment        RFP, 브랜드 가이드, 제품 사진 등
privacy_consent   개인정보 동의
```

서비스 유형 예:

```txt
web-3d
ad-visuals
web-app
data-dashboard
```

견적 문의 생성 흐름은 이렇게 설계할 수 있다.

```txt
ContactQuotePage
-> FormData 또는 JSON 생성
-> POST /api/quote-requests
-> quote_requests insert
-> 첨부 파일이 있으면 Storage 업로드
-> 관리자 quote request inbox에 표시
-> 24시간 SLA 시작
```

파일 첨부가 없다면 JSON으로 충분하다.

```tsx
await fetch('/api/quote-requests', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

파일 첨부가 있다면 제휴 문의처럼 `FormData`를 사용한다.

```tsx
const body = new FormData();
body.set('company_name', companyName);
body.set('service_type', serviceType);
body.set('requirements', requirements);

if (attachment) {
  body.set('attachment', attachment);
}
```

## 관리자 처리 흐름

문의는 사용자가 제출한다고 끝나는 기능이 아니다.

관리자가 보고, 상태를 바꾸고, 답변하고, 필요하면 내부 메모를 남겨야 한다.

### 일반 문의 관리자 흐름

```txt
GeneralInquiryListPage
-> useQuickListQuery
-> GET /api/quick-inquiries
-> auth 확인
-> quick_inquiries 목록 조회
-> 목록 렌더링
```

상세 화면:

```txt
GeneralInquiryDetailPage
-> 문의 내용 확인
-> SLA 48시간 계산
-> 답변 작성 탭
-> POST /api/admin/quick-inquiries/reply
-> Resend로 답변 메일 발송
-> quick_inquiries 상태 completed로 변경
```

상태 의미:

```txt
pending    = 미답변
processing = 확인 중
completed  = 답변 완료
```

일반 문의는 보통 답변을 보내면 업무가 끝난다.

그래서 답변 메일 발송 성공 후 `completed`가 자연스럽다.

### 제휴 문의 관리자 흐름

```txt
PartnershipListPage
-> usePartnershipListQuery
-> GET /api/partnership-inquiries
-> auth 확인
-> partnership_inquiries 목록 조회
-> 목록 렌더링
```

상세 화면:

```txt
PartnershipDetailPage
-> 회사/담당자/제안 내용 확인
-> 첨부 파일 다운로드
-> SLA 72시간 계산
-> 관리자 메모 작성
-> 상태 변경 PATCH /api/partnership-inquiries
-> 답신 메일 POST /api/admin/partnership-inquiries/reply
```

상태 의미:

```txt
pending   = 신규 접수
reviewing = 검토 중
approved  = 승인, 협업 가능
rejected  = 거절, 진행 안 함
```

제휴 문의는 한 번 답신했다고 끝나지 않을 수 있다.

사업 검토, 미팅, 계약 논의가 이어질 수 있으므로 답신 후에도 `reviewing` 상태가 적절하다.

### 견적 문의 관리자 흐름

현재 관리자 견적 화면은 견적 업무가 어떻게 생길지 보여주는 UI다.

목록 화면에서 다루는 개념:

```txt
상태 탭
서비스 유형 필터
회사/담당자 검색
예산 범위
희망 일정
담당자 배정
24시간 SLA
CSV 내보내기
```

상세 화면에서 다루는 개념:

```txt
요청 본문 확인
제공 자료와 첨부 확인
견적서 라인 아이템 작성
수량, 단가, 합계 계산
유효 기간, VAT, 결제 조건 작성
PDF 미리보기
견적서 발송
히스토리와 내부 메모 관리
```

실제 DB/API로 연결한다면 흐름은 이렇게 된다.

```txt
QuoteRequestListPage
-> useQuoteRequestListQuery
-> GET /api/quote-requests
-> quote_requests 목록 조회

QuoteRequestDetailPage
-> GET /api/quote-requests/:id
-> quote_request 상세 조회
-> quote_items 조회
-> 견적서 작성
-> POST /api/quote-requests/:id/quotes
-> PDF 생성 또는 첨부
-> 고객 이메일 발송
-> quote_request 상태 sent로 변경
```

상태는 아래처럼 잡을 수 있다.

```txt
new         = 신규 접수
review      = 검토 중
sent        = 견적 전달
negotiating = 협상 중
won         = 수주
rejected    = 거절
```

## 어떤 상황에 어떤 문의를 쓰는가

### 일반 문의를 쓰는 상황

일반 문의는 질문의 목적이 아직 작거나 불명확할 때 적합하다.

```txt
"이 기능이 가능한가요?"
"진행 방식이 궁금합니다."
"기존 홈페이지 일부만 고칠 수 있나요?"
"NDA 체결 후 자료를 공유할 수 있나요?"
"유지보수만 맡길 수 있나요?"
```

이때는 상세한 예산이나 일정이 없어도 된다.

관리자는 내용을 보고 짧은 답변을 보내거나, 필요하면 견적 문의로 유도한다.

### 견적 문의를 쓰는 상황

견적 문의는 프로젝트를 실제로 맡길 가능성이 있고 비용/일정 산정이 필요할 때 적합하다.

```txt
"제품 광고 이미지 30컷을 만들고 싶습니다."
"3D 제품 페이지를 제작하려고 합니다."
"사내 운영 대시보드를 구축하고 싶습니다."
"웹앱 MVP 개발 비용이 궁금합니다."
"6월 런칭 일정에 맞춰 가능한지 알고 싶습니다."
```

견적 문의에는 산정에 필요한 정보가 많을수록 좋다.

좋은 견적 문의:

```txt
서비스 유형이 명확하다.
요구사항이 항목별로 정리되어 있다.
예산 범위가 있다.
희망 일정과 목표일이 있다.
참고 URL 또는 첨부 자료가 있다.
의사결정자와 연락 가능한 담당자가 명확하다.
```

나쁜 견적 문의:

```txt
"홈페이지 얼마예요?"
"AI 이미지 만들어주세요."
"대시보드 하나 필요합니다."
"최대한 빨리요."
```

이런 문의는 관리자가 다시 질문해야 하므로 처리 시간이 길어진다.

### 제휴 문의를 쓰는 상황

제휴 문의는 고객 프로젝트 견적이 아니라 사업 협력 제안일 때 사용한다.

```txt
"우리 회사 고객에게 VisionFlow 서비스를 리셀링하고 싶습니다."
"우리가 가진 3D 제작 역량으로 함께 프로젝트를 수행하고 싶습니다."
"AI 모델/API를 VisionFlow와 연동하고 싶습니다."
"콘텐츠 데이터셋을 제공하고 수익을 공유하고 싶습니다."
```

제휴 문의는 바로 가격을 산정하는 흐름이 아니다.

먼저 사업 적합성을 검토하고, 협업 구조를 논의한 뒤 계약으로 이어진다.

## API 설계 원리

### 공개 POST와 관리자 GET/PATCH를 분리한다

문의 등록은 공개 사용자도 할 수 있어야 한다.

하지만 목록 조회, 상태 변경, 답변 발송은 관리자만 가능해야 한다.

현재 프로젝트도 이 원칙을 따른다.

```txt
POST /api/quick-inquiries
= 공개 문의 생성
= auth 없음

GET /api/quick-inquiries
= 관리자 목록 조회
= auth 필요

POST /api/admin/quick-inquiries/reply
= 관리자 답변 발송
= auth + role 필요
```

제휴 문의도 같다.

```txt
POST /api/partnership-inquiries
= 공개 제휴 문의 생성
= auth 없음

GET /api/partnership-inquiries
= 관리자 목록 조회
= auth 필요

PATCH /api/partnership-inquiries
= 관리자 상태/메모 수정
= auth 필요

POST /api/admin/partnership-inquiries/reply
= 관리자 답신 메일 발송
= auth + role 필요
```

중요한 원칙:

```txt
고객이 만드는 API와 관리자가 처리하는 API는 권한 기준이 다르다.
공개 POST는 스팸/검증/속도 제한이 중요하다.
관리자 API는 auth, role, audit log가 중요하다.
```

### body 형식은 데이터 성격에 따라 정한다

텍스트만 있으면 JSON이 단순하다.

```txt
일반 문의
-> JSON
-> Content-Type: application/json
-> request.json()
```

파일이 있으면 `FormData`가 필요하다.

```txt
제휴 문의
-> multipart/form-data
-> request.formData()
-> 파일은 Storage
-> 나머지 값은 DB
```

견적 문의는 선택지가 있다.

```txt
첨부 없는 간단 견적 폼
-> JSON

RFP, 브랜드 가이드, 제품 사진 첨부 가능
-> FormData
```

### 서버에서 normalizePayload를 둔다

프론트에서 `required`, `maxLength`, `type="email"`을 넣어도 서버 검증은 반드시 필요하다.

브라우저 검증은 사용자가 우회할 수 있기 때문이다.

현재 프로젝트는 API route에서 `normalizePayload()`로 아래 일을 한다.

```txt
trim
필수값 확인
문자 수 제한
이메일 형식 확인
enum 값 확인
nullable 값 정리
created_at, updated_at 생성
status 기본값 지정
```

이 함수가 중요한 이유:

```txt
DB에 이상한 값이 들어가는 것을 막는다.
프론트가 바뀌어도 서버 규칙은 유지된다.
API 테스트와 유지보수가 쉬워진다.
```

## DB 설계 원리

### 일반 문의 테이블

현재 타입 기준:

```txt
quick_inquiries

id
name
email
subject
content
status
created_at
updated_at
replied_at
replied_by
reply_content
```

역할:

```txt
고객 문의 원문 저장
처리 상태 저장
답변 내용과 답변자 저장
SLA 계산 기준 제공
```

### 제휴 문의 테이블

현재 타입 기준:

```txt
partnership_inquiries

id
company_name
company_size
company_url
contact_name
contact_position
contact_email
contact_phone
partnership_type
proposal_content
attachment_url
attachment_name
attachment_type
attachment_size
status
admin_memo
created_at
updated_at
```

역할:

```txt
회사와 담당자 정보 저장
제휴 유형과 제안 내용 저장
첨부 파일 메타데이터 저장
검토 상태 저장
관리자 메모 저장
```

### 견적 문의 테이블 권장 구조

아직 구현되어 있지 않지만, 구현한다면 최소한 아래 구조가 필요하다.

```txt
quote_requests

id
company_name
company_url
contact_name
contact_position
contact_email
contact_phone
service_type
project_summary
requirements
budget_min
budget_max
budget_note
desired_timeline
launch_date
reference_url
source
status
assignee_id
admin_memo
created_at
updated_at
```

첨부가 필요하면 별도 테이블이 더 좋다.

```txt
quote_request_attachments

id
quote_request_id
storage_path
file_name
file_type
file_size
created_at
```

견적서 자체도 별도로 분리하는 것이 좋다.

```txt
quotes

id
quote_request_id
quote_number
currency
subtotal
discount_amount
vat_amount
total_amount
valid_until
notes
status
sent_at
created_by
created_at
updated_at
```

라인 아이템:

```txt
quote_items

id
quote_id
title
description
quantity
unit
unit_price
total_price
sort_order
```

이렇게 분리하면 견적 요청과 견적서 작성 이력이 섞이지 않는다.

```txt
quote_request = 고객이 요청한 원문
quote         = 관리자가 작성한 견적서
quote_items   = 견적서의 세부 항목
```

## 상태와 SLA

문의 업무에서는 상태와 SLA가 중요하다.

상태는 "지금 이 문의가 어디까지 처리되었는지"를 나타낸다.

SLA는 "언제까지 첫 응답을 해야 하는지"를 나타낸다.

현재 프로젝트 기준:

```txt
일반 문의 SLA = 48시간
제휴 문의 SLA = 72시간
견적 문의 SLA = 관리자 UI 기준 24시간
```

상태 설계 예:

```txt
일반 문의:
pending -> processing -> completed

제휴 문의:
pending -> reviewing -> approved
pending -> reviewing -> rejected

견적 문의:
new -> review -> sent -> negotiating -> won
new -> review -> rejected
```

중요한 점:

```txt
상태는 화면 배지용 텍스트가 아니라 업무 규칙이다.
상태가 바뀌면 updated_at도 함께 바뀌어야 한다.
답변 발송, 견적 발송, 거절 처리 같은 이벤트는 히스토리로 남기는 것이 좋다.
```

## 답변과 메일 발송

문의 답변은 두 단계로 나뉜다.

```txt
1. 고객에게 메일을 보낸다.
2. DB에 답변 처리 결과를 저장한다.
```

현재 일반 문의 답변 흐름:

```txt
GeneralInquiryDetailPage
-> useSendQuickReplyMutation
-> POST /api/admin/quick-inquiries/reply
-> auth 확인
-> role 확인
-> quick_inquiries 조회
-> Resend API 메일 발송
-> quick_inquiries status completed 업데이트
-> React Query cache 갱신
```

현재 제휴 문의 답신 흐름:

```txt
PartnershipDetailPage
-> useSendPartnershipReplyMutation
-> POST /api/admin/partnership-inquiries/reply
-> auth 확인
-> role 확인
-> partnership_inquiries 조회
-> Resend API 메일 발송
-> pending이면 reviewing으로 변경
-> React Query cache 갱신
```

메일 발송 실패를 고려해야 한다.

```txt
메일 발송 실패
-> DB 상태를 완료로 바꾸면 안 됨
-> 관리자에게 실패 메시지 표시

메일 발송 성공, DB 업데이트 실패
-> 고객은 이미 메일을 받음
-> 관리자에게 부분 실패를 알려야 함
-> 재처리 또는 수동 보정 필요
```

## 파일 첨부와 문의의 관계

일반 문의는 현재 파일 첨부가 없다.

제휴 문의는 첨부 파일을 지원한다.

견적 문의도 실무적으로는 첨부 파일이 필요할 가능성이 높다.

첨부 파일이 필요한 예:

```txt
RFP
회사소개서
브랜드 가이드라인
제품 사진
기존 사이트 IA
레퍼런스 이미지
데이터 샘플
```

첨부 파일 원칙:

```txt
파일 원본은 Storage에 저장한다.
DB에는 storage path와 메타데이터만 저장한다.
다운로드는 관리자 권한 확인이 가능한 API를 통한다.
```

자세한 파일 흐름은 `docs/file-attachment-workflow.md`를 기준으로 보면 된다.

## React Query와 문의 화면

문의 목록은 서버 데이터다.

서버 데이터를 화면에서 다룰 때 React Query를 사용한다.

### 조회 query

```txt
useQuickListQuery
-> queryKey ['quick-list']
-> GET /api/quick-inquiries
-> 목록 cache

usePartnershipListQuery
-> queryKey ['partnership-list']
-> GET /api/partnership-inquiries
-> 목록 cache
```

조회 query는 데이터를 가져오고 캐싱한다.

### 생성 mutation

```txt
useCreateQuickMutation
-> POST /api/quick-inquiries
-> 성공 시 quick-list cache 갱신
```

mutation은 서버 데이터를 바꾸는 작업이다.

문의 등록, 상태 변경, 답변 발송, 메모 저장은 모두 mutation에 가깝다.

### 수정 mutation

```txt
useUpdatePartnershipMutation
-> PATCH /api/partnership-inquiries
-> status 또는 admin_memo 수정
-> 성공 시 partnership-list cache 갱신
```

중요한 점:

```txt
목록 조회는 query
문의 생성은 mutation
상태 변경은 mutation
답변 발송도 mutation
성공 후 cache를 갱신해야 화면이 최신 상태가 된다.
```

## 보안과 운영 체크리스트

### 공개 문의 생성 체크리스트

```txt
필수값을 서버에서 검증하는가?
문자 수 제한이 있는가?
이메일 형식을 검증하는가?
enum 값이 허용 목록 안에 있는가?
파일 크기 제한이 있는가?
스팸 방지 또는 rate limit이 필요한가?
개인정보 수집 동의가 있는가?
실패 시 사용자에게 과도한 내부 오류를 노출하지 않는가?
```

### 관리자 API 체크리스트

```txt
auth 확인이 있는가?
role 확인이 있는가?
관리자만 목록을 볼 수 있는가?
상태 변경 시 updated_at이 바뀌는가?
답변 발송 권한을 확인하는가?
첨부 다운로드 권한을 확인하는가?
메일 발송 실패를 처리하는가?
```

### DB 체크리스트

```txt
created_at, updated_at이 있는가?
status 기본값이 있는가?
답변 관련 필드가 있는가?
관리자 메모와 고객 원문이 분리되어 있는가?
첨부 파일 원본을 DB에 넣지 않는가?
고객 개인정보 보관 정책이 있는가?
```

### 견적 문의 체크리스트

```txt
서비스 유형을 구조화했는가?
예산 범위와 일정 정보를 받을 수 있는가?
요구사항을 충분히 받을 수 있는가?
첨부 자료를 받을 수 있는가?
담당자 배정 필드가 있는가?
24시간 SLA를 계산할 수 있는가?
견적서와 견적 요청을 분리했는가?
견적 라인 아이템을 별도 테이블로 관리하는가?
견적서 발송 이력을 남기는가?
```

## 개발 순서 제안

견적 문의를 실제로 완성하려면 아래 순서가 좋다.

```txt
1. quote_requests 타입과 DB 테이블 설계
2. /contact/quote 작성 화면 생성
3. POST /api/quote-requests 생성
4. 관리자 목록을 샘플 데이터에서 API 데이터로 교체
5. 관리자 상세를 실제 quote_request 데이터로 연결
6. 상태 변경 PATCH API 생성
7. 견적서 quotes, quote_items 저장 구조 추가
8. 견적서 PDF 미리보기/발송 기능 추가
9. 알림/SLA/히스토리 연결
```

처음부터 PDF와 메일 발송까지 한 번에 만들기보다, 먼저 "견적 문의 접수와 관리자 조회"를 완성하는 것이 좋다.

최소 1차 목표:

```txt
사용자 견적 문의 작성
-> quote_requests 저장
-> 관리자 목록 조회
-> 관리자 상세 조회
-> 상태 변경
```

그 다음 2차 목표:

```txt
견적서 작성
-> 라인 아이템 저장
-> PDF 미리보기
-> 견적 메일 발송
-> 상태 sent 변경
```

## 현재 프로젝트 기준 요약

```txt
문의 메인:
/contact
-> ContactPage
-> 문의 채널 선택

일반 문의:
/contact/general
-> ContactGeneralFormPage
-> useCreateQuickMutation
-> POST /api/quick-inquiries
-> quick_inquiries 저장
-> 관리자 /settings/general-inquiry 에서 확인
-> 답변 메일 발송 후 completed

제휴 문의:
/contact/partnership
-> ContactPartnershipPage
-> FormData
-> POST /api/partnership-inquiries
-> 파일은 Storage
-> 내용은 partnership_inquiries 저장
-> 관리자 /settings/partnership 에서 확인
-> 답신 후 reviewing, approved, rejected 등으로 처리

견적 문의:
/contact/quote
-> 라우트 상수는 있음
-> 공개 작성 화면과 API는 아직 없음
-> 관리자 /settings/quote-request 화면은 샘플 데이터 기반 UI로 있음
-> 실제 기능화하려면 quote_requests API/DB 연결 필요
```

최종적으로 기억할 것:

```txt
문의하기는 고객 입력을 업무 가능한 데이터로 바꾸는 입구다.
일반 문의는 자유 질문이다.
제휴 문의는 사업 협력 제안이다.
견적 문의는 프로젝트 조건을 비용과 일정으로 산정하는 요청이다.
공개 제출 API와 관리자 처리 API는 권한 기준이 다르다.
텍스트만 있으면 JSON, 파일이 있으면 FormData를 쓴다.
관리자 화면은 상태, SLA, 답변, 메모, 첨부, 히스토리를 함께 관리해야 한다.
```
