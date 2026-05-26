# File Attachment Workflow

## 목적

이 문서는 파일 첨부 기능을 실무에서 어떤 구조로 설계하고 개발하는지 정리한다.

현재 프로젝트의 제휴 문의 첨부 기능을 기준으로, 업로드부터 관리자 다운로드까지의 흐름, 이번 문제의 원인, 해결 방식, 앞으로 개발할 때 유념할 점을 함께 설명한다.

핵심 문장:

```txt
파일은 Storage에,
파일 정보는 DB에,
다운로드 권한은 서버에서,
저장은 브라우저가.
```

## 실무 기본 구조

파일 첨부 기능은 보통 "파일 자체"와 "파일 정보"를 분리해서 다룬다.

```txt
사용자 파일 선택
-> 프론트에서 FormData로 전송
-> 서버/API에서 파일 검증
-> Object Storage에 업로드
-> DB에는 파일 경로와 메타데이터 저장
-> 관리자 화면에서 다운로드 API 호출
-> 서버가 권한 확인 후 Storage 파일을 내려줌
-> 브라우저가 로컬 Downloads 폴더에 저장
```

실무에서는 파일 원본을 DB에 직접 넣지 않는다.

일반적으로 DB에는 아래 정보만 저장한다.

```txt
attachment_url   = Storage 내부 경로
attachment_name  = 원본 파일명
attachment_type  = MIME type
attachment_size  = 파일 크기
```

예:

```txt
attachment_url = partnership-inquiries/2026-05-25/uuid.pdf
```

파일 원본은 Supabase Storage, AWS S3, Cloudflare R2, GCS 같은 Object Storage에 저장한다.

## 현재 프로젝트의 최종 흐름

### 업로드

제휴 문의 작성 화면에서 파일을 선택하면 프론트는 `FormData`로 서버에 전송한다.

```tsx
const body = new FormData();
body.set('company_name', form.companyName);

if (selectedFile) {
  body.set('attachment', selectedFile);
}

await fetch('/api/partnership-inquiries', {
  method: 'POST',
  body,
});
```

서버는 파일을 받아 Supabase Storage에 저장한다.

```ts
const storagePath = `partnership-inquiries/${today}/${randomUUID()}${ext}`;

await supabaseAdmin.storage
  .from('partnership-attachments')
  .upload(storagePath, fileBuffer, {
    contentType: file.type || 'application/octet-stream',
  });
```

DB에는 실제 공개 URL이나 signed URL이 아니라 storage path를 저장한다.

```ts
attachment_url: storagePath
```

### 다운로드

관리자 상세 화면에서는 Storage path를 직접 열지 않는다.

대신 내부 다운로드 API를 호출한다.

```tsx
<a
  href={`/api/partnership-inquiries/${inquiry.id}/attachment`}
  download={inquiry.attachment_name || true}
>
  다운로드
</a>
```

다운로드 API는 다음 일을 한다.

```txt
1. 관리자 로그인 확인
2. DB에서 문의 조회
3. attachment_url storage path 확인
4. Supabase Storage에서 파일 다운로드
5. Content-Disposition: attachment 헤더로 응답
6. 브라우저가 사용자 PC 다운로드 폴더에 저장
```

다운로드 응답의 핵심 헤더:

```txt
Content-Disposition: attachment; filename="proposal.pdf"
Content-Type: application/pdf
X-Content-Type-Options: nosniff
```

한글 파일명을 고려하면 `filename*`도 함께 넣는다.

```txt
Content-Disposition:
attachment; filename="proposal.pdf"; filename*=UTF-8''%ED%8C%8C%EC%9D%BC.pdf
```

## 이번 문제의 원인

### 1. 파일 본문이 서버로 전송되지 않음

초기 구현은 파일명, 파일 크기, MIME type만 JSON으로 보내고 있었다.

```ts
attachment_name: selectedFile?.name
attachment_size: selectedFile?.size
attachment_type: selectedFile?.type
```

이 방식은 파일 정보를 DB에 남길 수는 있지만, 실제 파일 원본은 서버나 Storage에 존재하지 않는다.

그래서 관리자 상세에서 파일명이 보여도 다운로드할 원본이 없었다.

해결:

```txt
JSON 전송 -> FormData 전송
파일 메타데이터만 저장 -> 실제 파일을 Storage에 업로드
```

### 2. attachment_url의 의미가 섞임

중간에 `attachment_url`에 signed URL을 넣는 방식과 storage path를 넣는 방식이 섞였다.

이 둘은 역할이 다르다.

```txt
storage path = DB에 저장하는 영구 참조값
signed URL   = 짧은 시간만 유효한 임시 접근 URL
```

실무 권장 방식:

```txt
DB attachment_url = storage path
화면 href = 내부 다운로드 API
signed URL = 필요할 때 서버에서만 임시 생성
```

현재 프로젝트는 `attachment_url`을 storage path로 사용한다.

### 3. a 태그의 download 속성만으로는 부족할 수 있음

브라우저의 `<a download>`는 같은 origin 파일이나 단순 파일 URL에서는 잘 동작한다.

하지만 외부 signed URL, 다른 origin URL, 인증이 필요한 URL에서는 브라우저 정책에 따라 무시될 수 있다.

그래서 실무에서는 내부 API에서 아래 헤더를 명확히 내려준다.

```txt
Content-Disposition: attachment
```

즉, 다운로드 여부는 프론트의 `download` 속성만이 아니라 서버 응답 헤더가 결정한다.

### 4. 기존 데이터에는 실제 파일이 없을 수 있음

과거에 접수된 문의는 `attachment_name`만 있고 Storage에 파일이 없을 수 있다.

이 경우 다운로드는 불가능하다.

다운로드 기능은 반드시 아래 조건을 만족해야 한다.

```txt
DB attachment_url에 storage path가 있음
Storage bucket에 실제 파일이 존재함
관리자 권한으로 다운로드 API 접근 가능
```

## 실무 개발 체크리스트

### 업로드 체크리스트

```txt
FormData로 전송하는가?
파일 크기 제한이 있는가?
허용 확장자 또는 MIME type 제한이 있는가?
Storage path가 예측 불가능한가?
원본 파일명을 storage path에 직접 쓰지 않는가?
업로드 실패 시 DB insert를 하지 않는가?
DB insert 실패 시 업로드된 파일을 정리하는가?
```

### DB 체크리스트

```txt
파일 원본을 DB에 저장하지 않는가?
storage path와 display name을 분리했는가?
파일 크기와 타입을 함께 저장하는가?
nullable 컬럼을 고려했는가?
기존 데이터 마이그레이션이 필요한가?
```

### 다운로드 체크리스트

```txt
다운로드 API에서 로그인 확인을 하는가?
관리자 권한 확인을 하는가?
사용자가 요청한 파일에 접근 권한이 있는가?
Storage path가 유효한가?
Content-Disposition: attachment를 내려주는가?
한글 파일명을 처리하는가?
Content-Type을 올바르게 내려주는가?
```

### 보안 체크리스트

```txt
파일 경로 조작을 막는가?
파일명을 그대로 path에 쓰지 않는가?
비공개 파일을 public URL로 노출하지 않는가?
권한 없는 사용자가 다운로드 API를 호출할 수 없는가?
민감정보 파일의 보관 기간을 정했는가?
```

## Storage path 설계

좋은 방식:

```txt
partnership-inquiries/2026-05-25/550e8400-e29b-41d4-a716-446655440000.pdf
```

피해야 할 방식:

```txt
회사소개서.pdf
홍길동/../../secret.pdf
사용자가_올린_파일명_그대로.pdf
```

권장 구조:

```txt
도메인/날짜/uuid.ext
```

예:

```txt
partnership-inquiries/2026-05-25/uuid.pdf
general-inquiries/2026-05-25/uuid.zip
quote-requests/2026-05-25/uuid.png
```

## 원리 이해

### multipart/form-data

일반 JSON 요청은 텍스트 데이터 전송에 적합하다.

파일을 보내려면 `multipart/form-data`를 사용한다.

브라우저에서 `FormData`를 쓰면 자동으로 multipart 요청이 만들어진다.

```tsx
const formData = new FormData();
formData.append('attachment', file);
```

주의할 점:

```txt
FormData를 보낼 때 Content-Type을 직접 지정하지 않는다.
브라우저가 boundary를 포함한 Content-Type을 자동으로 만든다.
```

잘못된 예:

```tsx
fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'multipart/form-data' },
  body: formData,
});
```

좋은 예:

```tsx
fetch('/api/upload', {
  method: 'POST',
  body: formData,
});
```

### Object Storage

Object Storage는 파일을 key-value처럼 저장한다.

```txt
bucket = partnership-attachments
key    = partnership-inquiries/2026-05-25/uuid.pdf
value  = 파일 본문
```

DB는 파일 본문을 몰라도 된다.

DB는 이 key만 기억하면 된다.

### Content-Disposition

브라우저는 서버 응답 헤더를 보고 파일을 열지 저장할지 판단한다.

미리보기 가능성이 있는 응답:

```txt
Content-Type: application/pdf
```

다운로드를 유도하는 응답:

```txt
Content-Disposition: attachment; filename="proposal.pdf"
```

그래서 파일 다운로드 API는 보통 `Content-Disposition`을 명시한다.

## 전문가처럼 만들려면 더 공부할 것

이 문서의 흐름을 이해하면 일반적인 파일 첨부 기능은 실무 수준으로 만들 수 있다.

다만 전문가답게 하려면 장애 상황과 운영까지 고려해야 한다.

추가로 공부할 주제:

```txt
Object Storage
Signed URL
Presigned upload
multipart/form-data
Content-Disposition
MIME type
RBAC 권한 설계
업로드/DB insert 트랜잭션 보정
고아 파일 정리
바이러스 검사
이미지 리사이징
CDN 캐싱
개인정보/민감정보 보관 정책
```

특히 중요한 질문:

```txt
업로드는 성공했는데 DB 저장이 실패하면?
DB 저장은 성공했는데 Storage 업로드가 실패하면?
관리자가 아닌 사용자가 다운로드 URL을 알게 되면?
파일명이 한글이면?
파일이 너무 크면?
같은 파일명을 여러 명이 올리면?
나중에 문의를 삭제하면 Storage 파일도 지울 것인가?
```

이 질문에 답할 수 있으면 파일 첨부 기능을 꽤 실무적으로 다룰 수 있다.

## 현재 프로젝트 기준 요약

```txt
업로드:
ContactPartnershipPage
-> /api/partnership-inquiries
-> Supabase Storage partnership-attachments
-> partnership_inquiries.attachment_url에 storage path 저장

다운로드:
PartnershipDetailPage
-> /api/partnership-inquiries/:id/attachment
-> auth 확인
-> DB attachment_url 조회
-> Supabase Storage download
-> Content-Disposition: attachment 응답
-> 브라우저 Downloads 폴더 저장
```

최종적으로 기억할 것:

```txt
파일은 서버 프로젝트 폴더에 저장하지 않는다.
파일은 DB에 직접 저장하지 않는다.
파일 원본은 Storage에 둔다.
DB에는 storage path와 메타데이터만 둔다.
다운로드는 권한 확인이 가능한 서버 API를 통한다.
```
