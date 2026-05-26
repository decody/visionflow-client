# CRUD Workflow

## 목적

이 문서는 현재 프로젝트에서 CRUD가 어떤 구조로 동작하는지 정리한다.

`docs/file-attachment-workflow.md`, `docs/auth-workflow.md`와 같은 방식으로, 실제 코드 흐름을 기준으로 "어디에서 무엇을 담당하는지"와 "왜 그렇게 나누었는지"를 설명한다.

특히 다음을 함께 이해하는 것이 목표다.

```txt
Create = 새 데이터를 만든다.
Read   = 데이터를 조회한다.
Update = 기존 데이터를 수정한다.
Delete = 기존 데이터를 삭제한다.

React Query는 서버 데이터를 가져오고, 캐싱하고, 갱신하는 일을 도와준다.
커스텀 hook은 화면 컴포넌트에서 데이터 로직을 분리하는 방법이다.
API route는 권한 확인, 검증, 서버 전용 key 사용이 필요할 때 중간 서버 역할을 한다.
Supabase REST는 공개 가능한 범위의 테이블 CRUD를 빠르게 처리할 때 사용한다.
```

핵심 문장:

```txt
화면은 hook을 호출한다.
hook은 query 또는 mutation을 실행한다.
query는 조회(Read)를 담당한다.
mutation은 생성/수정/삭제(Create/Update/Delete)를 담당한다.
서버 API는 권한 확인과 DB 작업을 담당한다.
성공 후에는 React Query cache를 갱신하거나 무효화한다.
```

## 현재 CRUD 기본 구조

현재 프로젝트의 CRUD는 한 가지 방식만 쓰지 않는다.

크게 두 구조가 있다.

```txt
구조 A. 클라이언트 -> apiClient -> Supabase REST
구조 B. 클라이언트 -> Next.js API route -> supabaseAdmin -> DB
```

### 구조 A: Supabase REST 직접 호출

대표 예시는 Work 포트폴리오다.

```txt
WorkPortfolioListPage
-> useWorkListQuery
-> apiClient.get('works')
-> Supabase REST
-> works 테이블 조회
-> React Query cache 저장
-> 화면 렌더링
```

생성/수정/삭제도 비슷하다.

```txt
Work 작성 화면
-> useCreateWorkMutation
-> apiClient.post('works', payload)
-> Supabase REST
-> works insert
-> cache 업데이트
-> 목록 query 무효화
```

이 방식은 빠르고 단순하다.

다만 클라이언트에서 Supabase public key를 사용하므로, 실제 권한은 Supabase RLS 정책에 의존한다.

즉, 공개 가능한 조회나 RLS로 충분히 보호되는 CRUD에 적합하다.

### 구조 B: Next.js API route 경유

대표 예시는 관리자 공지사항이다.

```txt
NoticeWritePage
-> useCreateNoticeMutation
-> fetch('/api/admin/notices', { method: 'POST' })
-> apps/app/api/admin/notices/route.ts
-> auth()로 로그인 세션 확인
-> canManageContent로 권한 확인
-> supabaseAdmin.from('notices').insert(...)
-> 생성된 row 반환
-> cache 업데이트 및 무효화
```

수정도 같은 구조다.

```txt
NoticeEditPage
-> useUpdateNoticeMutation
-> fetch('/api/admin/notices/:id', { method: 'PATCH' })
-> API route에서 auth/role 검증
-> supabaseAdmin.from('notices').update(...).eq('id', id)
-> 수정된 row 반환
-> 목록/detail cache 갱신
```

이 방식은 서버에서 권한 확인과 검증을 강하게 할 수 있다.

`SUPABASE_SERVICE_ROLE_KEY`처럼 클라이언트에 노출되면 안 되는 key도 서버에서만 사용할 수 있다.

## 주요 파일

```txt
apps/src/components/query-provider.tsx
React Query QueryClientProvider 설정. staleTime, refetchOnWindowFocus 같은 기본 옵션 관리.

packages/shared/src/utils/api.ts
Supabase REST용 공통 apiClient. get/post/patch/delete/rpc/invoke 제공.

apps/src/hooks/works/useWorkQuery.ts
Work 목록/상세 조회 hook.

apps/src/hooks/works/useCreateWorkMutation.ts
Work 생성 mutation hook.

apps/src/hooks/works/useUpdateWorkMutation.ts
Work 수정 mutation hook.

apps/src/hooks/works/useDeleteWorkMutation.ts
Work 삭제 mutation hook.

apps/src/hooks/admin/notices/useNoticeQuery.ts
관리자 공지사항 목록/상세 조회 hook.

apps/src/hooks/admin/notices/useCreateNoticeMutation.ts
관리자 공지사항 생성 mutation hook.

apps/src/hooks/admin/notices/useUpdateNoticeMutation.ts
관리자 공지사항 수정 mutation hook.

apps/app/api/admin/notices/route.ts
공지사항 생성 API route. auth, role, validation, insert 담당.

apps/app/api/admin/notices/[id]/route.ts
공지사항 수정 API route. auth, role, validation, update 담당.

apps/src/features/admin/notices/notice-list-page.tsx
공지사항 목록 화면. query 결과를 테이블로 렌더링.

apps/src/features/admin/notices/notice-write-page.tsx
공지사항 작성 화면. mutation으로 저장.

apps/src/features/admin/work-portfolio/work-portfolio-list-page.tsx
Work 목록 화면. query 조회와 delete mutation 사용.
```

## CRUD 전체 흐름

### Read 흐름

Read는 데이터를 조회하는 작업이다.

React Query에서는 보통 `useQuery`로 만든다.

현재 Work 목록 조회:

```ts
export const useWorkListQuery = () => {
  return useQuery<WorkRow[]>({
    queryKey: ['works-list'],
    queryFn: fetchWorkList,
  });
};
```

`fetchWorkList`는 실제 서버 요청을 담당한다.

```ts
const fetchWorkList = async (): Promise<WorkRow[]> => {
  const { data } = await apiClient.get<WorkRow[] | null>('works');

  return (data ?? []).map(normalizeWork);
};
```

전체 흐름:

```txt
화면 렌더링
-> useWorkListQuery 호출
-> React Query가 queryKey ['works-list'] 확인
-> cache에 신선한 데이터가 있으면 cache 반환
-> 없거나 stale이면 queryFn 실행
-> apiClient.get('works')
-> Supabase REST 요청
-> 응답 데이터를 normalize
-> React Query cache 저장
-> data, isLoading, isError 등을 화면에 전달
```

화면에서는 이렇게 쓴다.

```tsx
const {
  data: works = [],
  error: worksError,
  isError: isWorksError,
  isLoading,
} = useWorkListQuery();
```

중요한 점:

```txt
화면은 fetch 세부 구현을 모른다.
화면은 data, isLoading, isError만 보고 렌더링한다.
서버 데이터 가져오기 로직은 hook 안에 숨긴다.
```

### Create 흐름

Create는 새 데이터를 만드는 작업이다.

React Query에서는 보통 `useMutation`으로 만든다.

공지사항 생성 흐름:

```txt
사용자가 공지 작성 폼 입력
-> 저장 버튼 클릭
-> Form onFinish 실행
-> useCreateNoticeMutation().mutateAsync(payload)
-> POST /api/admin/notices
-> API route에서 auth() 확인
-> canManageContent(role) 확인
-> payload 검증
-> supabaseAdmin.from('notices').insert(...)
-> 생성된 notice 반환
-> onSuccess에서 cache 업데이트/무효화
-> 상세 페이지로 이동
```

화면 코드의 역할:

```tsx
const createNoticeMutation = useCreateNoticeMutation();

const result = await createNoticeMutation.mutateAsync(payload);

if (result?.id) {
  router.push(ROUTES.ADMIN.NOTICE.DETAIL(result.id));
}
```

hook의 역할:

```ts
return useMutation({
  mutationFn: async (values: ICreateNoticeRequest) => {
    const response = await fetch('/api/admin/notices', {
      body: JSON.stringify(values),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('공지사항 등록 중 오류가 발생했습니다.');
    }

    return data as INotice;
  },
  onSuccess: async (createdNotice) => {
    queryClient.setQueryData(['admin', 'notices-list'], ...);
    await queryClient.invalidateQueries({
      queryKey: ['admin', 'notices-list'],
    });
  },
});
```

API route의 역할:

```ts
const session = await auth();

if (!session) {
  return jsonError('Unauthorized', 401);
}

if (!canManageContent(session.user?.role)) {
  return jsonError('Forbidden', 403);
}

const { data, error } = await supabaseAdmin
  .from('notices')
  .insert(...)
  .select('*')
  .single();
```

즉, Create는 세 층으로 나뉜다.

```txt
화면 = 입력값 수집, 버튼 상태, 성공 후 이동
hook = 요청 실행, 에러 처리, cache 갱신
API route = 권한 확인, 검증, DB insert
```

### Update 흐름

Update는 기존 데이터를 수정하는 작업이다.

공지사항 수정 흐름:

```txt
사용자가 수정 폼 입력
-> 저장 버튼 클릭
-> useUpdateNoticeMutation().mutateAsync({ noticeId, values })
-> PATCH /api/admin/notices/:id
-> API route에서 auth/role 확인
-> title, description, contentHtml 검증
-> supabaseAdmin.from('notices').update(...).eq('id', id)
-> 수정된 notice 반환
-> 목록 cache와 상세 cache 갱신
```

hook에서 중요한 부분:

```ts
queryClient.setQueryData<INotice[]>(
  ['admin', 'notices-list'],
  (oldNotices = []) => upsertNotice(oldNotices, normalizedNotice),
);

queryClient.setQueryData<INotice>(
  ['notice', noticeId],
  normalizedNotice,
);

await queryClient.invalidateQueries({
  queryKey: ['notice', noticeId],
});
```

여기서 하는 일:

```txt
1. 관리자 목록 cache에서 해당 notice를 교체한다.
2. 상세 cache ['notice', noticeId]도 새 데이터로 교체한다.
3. 이후 invalidateQueries로 서버와 다시 동기화한다.
```

왜 둘 다 할까?

```txt
setQueryData = 화면을 즉시 최신처럼 보이게 한다.
invalidateQueries = 서버와 최종 상태를 다시 맞춘다.
```

### Delete 흐름

Delete는 기존 데이터를 삭제하는 작업이다.

현재 명확한 삭제 예시는 Work 포트폴리오다.

```ts
export const useDeleteWorkMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workId: string) => {
      await apiClient.delete<WorkRow>(`works/${workId}`);

      return workId;
    },
    onSuccess: async (workId) => {
      queryClient.setQueryData<WorkRow[]>(['works-list'], (oldWorks = []) =>
        oldWorks.filter((work) => String(work.id) !== String(workId)),
      );

      queryClient.removeQueries({ queryKey: ['work', String(workId)] });

      await queryClient.invalidateQueries({ queryKey: ['works-list'] });
    },
  });
};
```

전체 흐름:

```txt
사용자가 삭제 버튼 클릭
-> confirm modal 표시
-> 확인 클릭
-> deleteWorkMutation.mutateAsync(work.id)
-> apiClient.delete('works/:id')
-> Supabase REST DELETE
-> 성공 시 목록 cache에서 해당 row 제거
-> 상세 cache 제거
-> 목록 query 무효화
```

삭제에서 특히 중요한 것:

```txt
삭제 전 확인 UI가 있는가?
삭제 권한이 있는 사용자에게만 버튼이 보이는가?
서버나 RLS에서도 삭제 권한이 막혀 있는가?
성공 후 목록 cache에서 제거하는가?
상세 페이지 cache를 제거하는가?
```

## React Query 설정

React Query는 `apps/src/components/query-provider.tsx`에서 전체 앱에 연결된다.

```tsx
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          staleTime: 30_000,
        },
      },
    }),
);
```

현재 설정의 의미:

```txt
QueryClientProvider
= 앱 전체에서 useQuery/useMutation을 쓸 수 있게 한다.

staleTime: 30_000
= 조회한 데이터는 30초 동안 fresh로 본다.

refetchOnWindowFocus: false
= 브라우저 탭을 다시 클릭할 때 자동 refetch하지 않는다.

ReactQueryDevtools
= 개발 중 query cache 상태를 볼 수 있게 한다.
```

중요한 개념:

```txt
fresh = 아직 신선한 데이터. 다시 요청하지 않아도 된다고 판단.
stale = 낡았을 수 있는 데이터. 필요하면 다시 요청.
cache = 이전에 받아온 서버 데이터 저장소.
invalidate = 이 query는 낡았다고 표시하고 다시 가져오게 함.
```

## queryKey 설계

React Query에서 `queryKey`는 cache 주소다.

현재 프로젝트 예시:

```txt
['works-list']
Work 목록

['work', workId]
Work 상세

['admin', 'notices-list']
관리자 공지사항 목록

['notices-list']
웹 공개 공지사항 목록

['notice', noticeId]
공지사항 상세
```

queryKey를 잘못 설계하면 생기는 문제:

```txt
목록을 수정했는데 상세가 옛날 데이터로 남는다.
관리자 목록과 사용자 목록이 섞인다.
필터가 다른 목록인데 같은 cache를 공유한다.
삭제한 데이터가 화면에 계속 보인다.
```

권장 방식:

```txt
목록과 상세는 queryKey를 분리한다.
필터/페이지/검색어가 있으면 queryKey에 포함한다.
관리자용 데이터와 공개용 데이터는 queryKey를 분리한다.
mutation 성공 후 영향받는 queryKey를 정확히 갱신한다.
```

예시:

```ts
queryKey: ['admin', 'notices-list']
queryKey: ['notice', noticeId]
queryKey: ['works-list', { category, keyword, page }]
```

## hook을 작성하는 법

CRUD hook은 보통 다음 순서로 만든다.

```txt
1. 화면에서 필요한 데이터 모양을 정한다.
2. 실제 요청 함수 fetchXxx 또는 mutationFn을 만든다.
3. useQuery 또는 useMutation으로 감싼다.
4. queryKey를 정한다.
5. 성공 후 cache를 어떻게 바꿀지 정한다.
6. 화면에서는 hook이 주는 data/status/function만 사용한다.
```

### 조회 hook 작성 기본형

```ts
const fetchItems = async (): Promise<Item[]> => {
  const response = await fetch('/api/items');

  if (!response.ok) {
    throw new Error('목록을 불러오지 못했습니다.');
  }

  return response.json();
};

export const useItemListQuery = () => {
  return useQuery<Item[]>({
    queryKey: ['items-list'],
    queryFn: fetchItems,
  });
};
```

화면에서는 이렇게 쓴다.

```tsx
const { data: items = [], isLoading, isError } = useItemListQuery();

if (isLoading) return <Loading />;
if (isError) return <ErrorView />;

return <ItemTable rows={items} />;
```

### 상세 조회 hook 작성 기본형

```ts
export const useItemViewQuery = (itemId: string) => {
  return useQuery<Item | null>({
    enabled: Boolean(itemId),
    queryKey: ['item', itemId],
    queryFn: () => fetchItem(itemId),
  });
};
```

`enabled`의 의미:

```txt
itemId가 없으면 요청하지 않는다.
동적 route param이 아직 준비되지 않은 경우 불필요한 요청을 막는다.
```

### 생성 hook 작성 기본형

```ts
export const useCreateItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateItemRequest) => {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('등록 중 오류가 발생했습니다.');
      }

      return response.json() as Promise<Item>;
    },
    onSuccess: async (createdItem) => {
      queryClient.setQueryData<Item[]>(['items-list'], (oldItems = []) => [
        createdItem,
        ...oldItems,
      ]);

      await queryClient.invalidateQueries({ queryKey: ['items-list'] });
    },
  });
};
```

### 수정 hook 작성 기본형

```ts
export const useUpdateItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      values,
    }: {
      itemId: string;
      values: UpdateItemRequest;
    }) => {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error('수정 중 오류가 발생했습니다.');
      }

      return response.json() as Promise<Item>;
    },
    onSuccess: async (updatedItem, { itemId }) => {
      queryClient.setQueryData<Item[]>(['items-list'], (oldItems = []) =>
        oldItems.map((item) =>
          String(item.id) === String(itemId) ? updatedItem : item,
        ),
      );

      queryClient.setQueryData<Item>(['item', itemId], updatedItem);

      await queryClient.invalidateQueries({ queryKey: ['items-list'] });
      await queryClient.invalidateQueries({ queryKey: ['item', itemId] });
    },
  });
};
```

### 삭제 hook 작성 기본형

```ts
export const useDeleteItemMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제 중 오류가 발생했습니다.');
      }

      return itemId;
    },
    onSuccess: async (itemId) => {
      queryClient.setQueryData<Item[]>(['items-list'], (oldItems = []) =>
        oldItems.filter((item) => String(item.id) !== String(itemId)),
      );

      queryClient.removeQueries({ queryKey: ['item', itemId] });

      await queryClient.invalidateQueries({ queryKey: ['items-list'] });
    },
  });
};
```

## 그냥 fetch/useEffect로 했을 때

React Query 없이 직접 만들면 보통 이런 구조가 된다.

```tsx
function ItemListPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadItems() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/items');

        if (!response.ok) {
          throw new Error('목록을 불러오지 못했습니다.');
        }

        const data = await response.json();

        if (!ignore) {
          setItems(data);
        }
      } catch (error) {
        if (!ignore) {
          setError(error instanceof Error ? error : new Error('Unknown error'));
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      ignore = true;
    };
  }, []);
}
```

이 방식의 장점:

```txt
작은 예제에서는 이해하기 쉽다.
외부 라이브러리 개념을 몰라도 된다.
요청 흐름을 직접 통제할 수 있다.
```

이 방식의 단점:

```txt
loading/error/data 상태를 매번 직접 만든다.
목록 cache가 없어서 페이지를 이동했다 돌아오면 다시 요청한다.
같은 데이터를 여러 컴포넌트가 각각 요청할 수 있다.
생성/수정/삭제 후 어떤 화면을 다시 불러올지 직접 관리해야 한다.
race condition 방지를 직접 처리해야 한다.
재시도, stale 처리, background refetch 같은 기능을 직접 만들어야 한다.
```

Create 후 목록을 갱신하려면 직접 다시 호출해야 한다.

```tsx
async function handleCreate(values: CreateItemRequest) {
  await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });

  const response = await fetch('/api/items');
  const nextItems = await response.json();
  setItems(nextItems);
}
```

규모가 커질수록 이런 코드가 여러 화면에 반복된다.

## React Query를 이용했을 때

React Query를 쓰면 서버 상태를 직접 관리하지 않고, query cache를 중심으로 다룬다.

```tsx
function ItemListPage() {
  const { data: items = [], isLoading, isError } = useItemListQuery();
  const createItemMutation = useCreateItemMutation();

  const handleCreate = async (values: CreateItemRequest) => {
    await createItemMutation.mutateAsync(values);
  };
}
```

장점:

```txt
loading/error/data 상태가 자동으로 제공된다.
같은 queryKey를 쓰는 컴포넌트는 cache를 공유한다.
staleTime 동안 불필요한 재요청을 줄인다.
mutation 성공 후 invalidateQueries로 관련 데이터를 다시 가져올 수 있다.
setQueryData로 화면을 즉시 갱신할 수 있다.
Devtools로 cache 상태를 확인할 수 있다.
```

주의점:

```txt
queryKey 설계를 대충 하면 cache가 꼬인다.
mutation 성공 후 어떤 query를 갱신할지 명확히 알아야 한다.
서버 상태와 클라이언트 UI 상태를 구분해야 한다.
React Query가 권한 검증을 대신해주지는 않는다.
```

비교 요약:

```txt
직접 fetch/useEffect
= 작은 화면에는 단순하지만, CRUD가 늘수록 loading/error/cache/refetch 관리가 반복된다.

React Query
= 처음에는 queryKey/cache 개념이 필요하지만, CRUD가 늘수록 서버 상태 관리가 일관된다.
```

## 서버 상태와 클라이언트 상태 구분

CRUD를 배울 때 가장 헷갈리는 부분은 "상태"가 하나가 아니라는 점이다.

```txt
서버 상태
= DB나 API에서 오는 데이터
= notices, works, users, inquiries
= React Query가 잘 다룬다.

클라이언트 상태
= 화면에서만 필요한 임시 상태
= 검색어, 필터, 모달 열림 여부, 선택된 탭
= useState/useMemo/Zustand 등이 다룬다.
```

현재 Work 목록 화면 예시:

```txt
서버 상태:
works = useWorkListQuery()로 가져온 데이터

클라이언트 상태:
sizeFilter
categoryFilter
searchText
delete confirm modal
```

이 구조가 좋은 이유:

```txt
서버에서 온 원본 목록은 query cache에 둔다.
필터링/검색/정렬은 화면에서 계산한다.
삭제 성공 시 서버 상태 cache만 갱신한다.
검색어를 바꾼다고 서버 데이터를 매번 다시 받을 필요는 없다.
```

## apiClient 원리

`packages/shared/src/utils/api.ts`의 `apiClient`는 Supabase REST 호출을 감싸는 작은 클라이언트다.

제공하는 메서드:

```txt
apiClient.get(path, query)
apiClient.post(path, payload)
apiClient.patch(path, payload)
apiClient.delete(path)
apiClient.rpc(functionName, payload)
apiClient.invoke(functionName, payload)
```

예시:

```ts
apiClient.get<WorkRow[] | null>('works');
apiClient.get<WorkRow | null>(`works/${workId}`);
apiClient.post<WorkRow>('works', payload);
apiClient.patch<WorkRow>(`works/${workId}`, payload);
apiClient.delete<WorkRow>(`works/${workId}`);
```

내부에서 하는 일:

```txt
1. NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_REST_URL로 REST base URL 생성
2. table 또는 table/id path 파싱
3. id가 있으면 id=eq.{id}, limit=1 쿼리 추가
4. camelCase payload를 snake_case로 변환해서 요청
5. Supabase 응답 snake_case를 camelCase로 변환해서 반환
6. fetch는 HTTP 에러에서 throw하지 않으므로 response.ok를 직접 검사
```

왜 camelCase/snake_case 변환이 필요할까?

```txt
DB column은 보통 snake_case:
created_at, is_published, content_html

프론트 타입은 보통 camelCase:
createdAt, isPublished, contentHtml

apiClient가 중간에서 변환하면 화면 코드는 camelCase만 쓰면 된다.
```

주의점:

```txt
apiClient는 클라이언트에서 실행될 수 있으므로 public key만 사용한다.
service role key가 필요한 작업에는 사용하면 안 된다.
권한 검사는 Supabase RLS 또는 별도 API route에서 해야 한다.
```

## API route 원리

API route는 브라우저와 DB 사이의 서버 계층이다.

관리자 공지사항 생성 API는 다음 순서로 동작한다.

```txt
POST /api/admin/notices
-> auth()로 NextAuth 세션 확인
-> 세션이 없으면 401
-> canManageContent(session.user.role) 확인
-> 권한이 없으면 403
-> request.json()으로 payload 파싱
-> title, description, contentHtml 필수값 검증
-> supabaseAdmin.from('notices').insert(...)
-> DB 에러가 있으면 500
-> 성공하면 201과 생성된 notice 반환
```

API route가 필요한 상황:

```txt
관리자 권한 검사가 필요하다.
service role key를 써야 한다.
입력값을 서버에서 반드시 검증해야 한다.
외부 API key를 사용해야 한다.
파일 업로드, 메일 발송, 감사 로그처럼 서버 책임이 필요하다.
여러 DB 작업을 하나의 업무 트랜잭션처럼 묶어야 한다.
```

API route 없이 apiClient로 충분한 상황:

```txt
RLS로 권한이 충분히 통제된다.
public key로 가능한 단순 조회/저장이다.
서버 전용 secret이 필요 없다.
업무 규칙이 단순하다.
```

## 권한 확인

CRUD에서 권한은 버튼을 숨기는 것만으로 끝나면 안 된다.

현재 프로젝트는 두 층에서 권한을 다룬다.

```txt
화면:
useCurrentUserRole()
canManageContent(role)
권한이 없으면 작성/수정/삭제 버튼을 숨김

서버:
auth()
canManageContent(session.user.role)
권한이 없으면 401 또는 403 반환
```

중요한 원칙:

```txt
프론트 권한 체크 = 사용자 경험
서버 권한 체크 = 실제 보안
```

버튼을 숨겨도 사용자가 직접 API를 호출할 수 있다.

그래서 민감한 CRUD는 반드시 서버 또는 Supabase RLS에서 한 번 더 막아야 한다.

## 에러 처리

현재 mutation hook은 HTTP 에러를 `throw new Error(...)`로 바꾼다.

```ts
if (!response.ok) {
  throw new Error(
    'message' in data && data.message
      ? data.message
      : '공지사항 등록 중 오류가 발생했습니다.',
  );
}
```

화면에서는 `try/catch`로 메시지를 띄운다.

```tsx
try {
  await createNoticeMutation.mutateAsync(payload);
  message.success('공지사항이 등록되었습니다.');
} catch (error) {
  message.error(
    error instanceof Error
      ? error.message
      : '공지사항 등록 중 오류가 발생했습니다.',
  );
}
```

권장 흐름:

```txt
API route는 의미 있는 status code와 message를 반환한다.
hook은 response.ok를 검사하고 Error를 던진다.
화면은 Error message를 사용자에게 보여준다.
개발자는 console/logging/Sentry 등으로 상세 원인을 추적한다.
```

## validation 위치

검증은 한 곳에서만 하면 부족하다.

```txt
폼 검증
= 사용자가 입력 중 바로 알 수 있게 한다.
= required, maxLength, placeholder, Ant Design Form rules

hook 검증
= payload 정리, null 변환, trim 처리
= 서버로 보내기 전 최소 정리

API route 검증
= 신뢰할 수 있는 최종 검증
= title/contentHtml 필수값, 권한, id 존재 여부

DB 검증
= not null, foreign key, check constraint, RLS
```

공지사항 생성에서는 API route에서 다음을 확인한다.

```txt
title이 있는가?
description이 있는가?
contentHtml이 있는가?
로그인했는가?
콘텐츠 관리 권한이 있는가?
```

## cache 갱신 전략

mutation 성공 후 선택지는 보통 세 가지다.

```txt
1. invalidateQueries
2. setQueryData
3. removeQueries
```

### invalidateQueries

```ts
await queryClient.invalidateQueries({ queryKey: ['works-list'] });
```

의미:

```txt
이 query는 낡았다고 표시한다.
활성화된 query는 다시 fetch할 수 있다.
서버의 최종 상태와 맞추는 데 좋다.
```

장점:

```txt
구현이 단순하다.
서버 상태를 다시 가져오므로 정확하다.
```

단점:

```txt
다시 요청하므로 네트워크 비용이 든다.
즉시 화면이 바뀌지 않을 수 있다.
```

### setQueryData

```ts
queryClient.setQueryData<WorkRow[]>(['works-list'], (oldWorks = []) => [
  createdWork,
  ...oldWorks,
]);
```

의미:

```txt
cache 값을 직접 바꾼다.
화면을 즉시 갱신할 수 있다.
```

장점:

```txt
사용자가 빠르게 반응을 느낀다.
목록에서 추가/수정/삭제 결과를 즉시 반영할 수 있다.
```

단점:

```txt
직접 정렬/필터/total_count 처리를 맞춰야 한다.
서버 계산값이 있으면 틀릴 수 있다.
```

### removeQueries

```ts
queryClient.removeQueries({ queryKey: ['work', String(workId)] });
```

의미:

```txt
특정 cache를 제거한다.
삭제된 상세 데이터가 남지 않게 한다.
```

삭제 후 상세 페이지 cache 제거에 적합하다.

현재 프로젝트는 보통 이런 조합을 쓴다.

```txt
Create:
setQueryData로 목록에 추가
invalidateQueries로 서버와 재동기화

Update:
setQueryData로 목록/상세 교체
invalidateQueries로 서버와 재동기화

Delete:
setQueryData로 목록에서 제거
removeQueries로 상세 cache 제거
invalidateQueries로 서버와 재동기화
```

## 현재 프로젝트 기준 예시

### Work 포트폴리오

```txt
Read 목록:
WorkPortfolioListPage
-> useWorkListQuery
-> apiClient.get('works')
-> React Query cache ['works-list']

Read 상세:
WorkDetail/Edit Page
-> useWorkViewQuery(workId)
-> apiClient.get('works/:id')
-> React Query cache ['work', workId]

Create:
Work Create Page
-> useCreateWorkMutation
-> apiClient.post('works', payload)
-> setQueryData ['works-list']
-> invalidate ['works-list']

Update:
Work Edit Page
-> useUpdateWorkMutation
-> apiClient.patch('works/:id', payload)
-> invalidate ['works-list'], ['work', workId]

Delete:
WorkPortfolioListPage
-> confirm modal
-> useDeleteWorkMutation
-> apiClient.delete('works/:id')
-> setQueryData로 목록에서 제거
-> removeQueries ['work', workId]
-> invalidate ['works-list']
```

특징:

```txt
Supabase REST 직접 호출 방식을 사용한다.
payload의 roles 배열은 저장 전 문자열로 변환한다.
조회 후 normalizeWork에서 roles를 배열로 다시 정리한다.
삭제는 화면에서 modal 확인 후 실행한다.
```

### 관리자 공지사항

```txt
Read 목록:
NoticeListPage
-> useNoticeListQuery
-> apiClient.get('notices', { order: ... })
-> React Query cache ['admin', 'notices-list']

Read 상세:
NoticeDetail/Edit Page
-> useNoticeViewQuery(noticeId)
-> apiClient.get('notices/:id')
-> React Query cache ['notice', noticeId]

Create:
NoticeWritePage
-> useCreateNoticeMutation
-> POST /api/admin/notices
-> API route auth/role/validation
-> supabaseAdmin insert
-> setQueryData 목록 추가
-> invalidate admin/public notice list

Update:
NoticeEditPage
-> useUpdateNoticeMutation
-> PATCH /api/admin/notices/:id
-> API route auth/role/validation
-> supabaseAdmin update
-> setQueryData 목록/상세 교체
-> invalidate 목록/상세
```

특징:

```txt
생성/수정은 API route를 경유한다.
서버에서 auth()와 canManageContent()를 확인한다.
서버에서 title, description, contentHtml을 다시 검증한다.
관리자 목록 cache와 공개 목록 cache를 함께 고려한다.
```

### 문의/답변

문의 계열은 일반 CRUD와 조금 다르다.

```txt
사용자 문의 작성
-> POST /api/quick-inquiries 또는 /api/partnership-inquiries
-> DB insert

관리자 조회
-> useQuickQuery 또는 usePartnershipQuery
-> 문의 목록 조회

관리자 답변
-> reply API route
-> 메일 발송
-> DB 상태 업데이트
-> 관련 query 무효화
```

문의는 단순히 row를 만들고 수정하는 것을 넘어서 메일 발송, 답변 상태, 첨부 파일 다운로드 권한이 함께 엮인다.

그래서 API route의 책임이 더 커진다.

## CRUD를 만들 때 추천 순서

새로운 관리자 CRUD를 만든다면 보통 이 순서가 안전하다.

```txt
1. DB table과 타입 정의
2. 목록 조회 hook 작성
3. 목록 화면에서 data/isLoading/isError 렌더링
4. 상세 조회 hook 작성
5. 생성 API 또는 apiClient mutation 작성
6. 수정 API 또는 apiClient mutation 작성
7. 삭제가 필요하면 삭제 mutation 작성
8. mutation 성공 후 cache 갱신 전략 정리
9. 화면 권한 체크 추가
10. 서버 권한 체크 또는 RLS 확인
```

질문해야 할 것:

```txt
이 데이터는 공개 조회 가능한가?
관리자만 생성/수정/삭제 가능한가?
service role key가 필요한가?
RLS로 충분한가, API route가 필요한가?
생성 후 목록으로 갈 것인가, 상세로 갈 것인가?
수정 후 어떤 query cache를 바꿔야 하는가?
삭제 후 상세 페이지 접근은 어떻게 처리할 것인가?
```

## 개발 체크리스트

### Read 체크리스트

```txt
queryKey가 명확한가?
목록과 상세 queryKey가 분리되어 있는가?
동적 id가 없을 때 enabled로 요청을 막는가?
응답 데이터가 null일 때 기본값을 처리하는가?
DB snake_case와 프론트 camelCase 변환이 필요한가?
로딩 상태와 에러 상태를 화면에서 처리하는가?
```

### Create 체크리스트

```txt
폼 validation이 있는가?
서버/API validation이 있는가?
권한이 필요한 경우 API route나 RLS에서 막는가?
POST payload에 불필요한 값이 섞이지 않는가?
생성 성공 후 목록 cache를 갱신하는가?
생성 성공 후 이동 경로가 정해져 있는가?
실패 시 사용자에게 메시지가 보이는가?
```

### Update 체크리스트

```txt
수정 대상 id가 확실한가?
PATCH payload가 전체 교체인지 부분 수정인지 명확한가?
수정 후 목록 cache와 상세 cache를 모두 갱신하는가?
공개/비공개 상태 변경처럼 다른 목록에도 영향이 있는가?
updatedAt 같은 서버/클라이언트 계산값 정책이 일관적인가?
```

### Delete 체크리스트

```txt
삭제 전 확인 UI가 있는가?
삭제 권한이 화면과 서버 양쪽에서 확인되는가?
삭제 후 목록 cache에서 제거하는가?
삭제 후 상세 cache를 제거하는가?
관련 파일/자식 데이터/외래키 정책을 확인했는가?
실패 시 이미 화면에서 제거한 데이터를 복구해야 하는가?
```

### React Query 체크리스트

```txt
queryKey에 필터/페이지/검색어가 필요한가?
mutation 성공 후 invalidateQueries 대상이 정확한가?
setQueryData를 쓴다면 정렬/카운트가 깨지지 않는가?
removeQueries가 필요한 삭제 상세 cache가 있는가?
staleTime 정책이 업무에 맞는가?
Devtools에서 cache 상태를 확인했는가?
```

### 보안 체크리스트

```txt
service role key가 클라이언트에 노출되지 않는가?
관리자 API는 auth()를 확인하는가?
관리자 API는 role을 확인하는가?
Supabase REST 직접 호출 테이블은 RLS가 준비되어 있는가?
버튼 숨김에만 의존하지 않는가?
사용자 입력값을 서버에서 다시 검증하는가?
```

## 원리 이해

### CRUD

CRUD는 대부분의 관리 기능을 설명하는 기본 단위다.

```txt
Create
= 새 row insert
= POST

Read
= row 조회
= GET

Update
= 기존 row update
= PATCH 또는 PUT

Delete
= 기존 row delete
= DELETE
```

프론트 화면 기준으로 보면 이렇게 대응된다.

```txt
목록 페이지 = Read list
상세 페이지 = Read detail
작성 페이지 = Create
수정 페이지 = Update
삭제 버튼 = Delete
```

### Query

React Query에서 query는 "서버에서 읽어오는 데이터"다.

```txt
공지 목록 조회
Work 상세 조회
사용자 목록 조회
문의 목록 조회
```

query는 다음 정보를 가진다.

```txt
queryKey = cache 주소
queryFn  = 실제 fetch 함수
data     = 성공 데이터
isLoading, isError, error = 상태
```

### Mutation

mutation은 서버 데이터를 바꾸는 작업이다.

```txt
공지 생성
공지 수정
Work 삭제
문의 답변 발송
사용자 초대
```

mutation은 다음 정보를 가진다.

```txt
mutationFn = 실제 변경 요청
mutate/mutateAsync = 실행 함수
isPending = 실행 중 상태
onSuccess = 성공 후 cache 갱신
onError = 실패 후 처리
```

### Cache

cache는 서버에서 받아온 데이터를 잠시 저장하는 공간이다.

React Query cache 덕분에:

```txt
같은 목록을 다시 열 때 즉시 보여줄 수 있다.
여러 컴포넌트가 같은 데이터를 공유할 수 있다.
mutation 성공 후 화면 데이터를 일관되게 갱신할 수 있다.
```

하지만 cache는 DB가 아니다.

```txt
DB = 진짜 데이터 원본
cache = 화면에서 쓰기 위한 임시 복사본
```

그래서 mutation 성공 후에는 보통 cache를 직접 바꾸거나, query를 무효화해서 DB와 다시 맞춘다.

### Invalidation

invalidation은 "이 cache는 이제 오래되었을 수 있다"고 표시하는 것이다.

```ts
await queryClient.invalidateQueries({ queryKey: ['works-list'] });
```

예를 들어 Work를 하나 생성하면 기존 `['works-list']` cache에는 새 Work가 없다.

그래서 목록 query를 무효화한다.

```txt
새 Work 생성
-> 기존 works-list cache는 낡음
-> invalidateQueries(['works-list'])
-> 목록을 다시 가져옴
-> 새 Work가 보임
```

## 현재 프로젝트 기준 전체 요약

```txt
Read:
Page
-> useXxxQuery
-> apiClient.get 또는 fetch
-> Supabase REST/API route
-> React Query cache
-> 화면 렌더링

Create:
Page form
-> useCreateXxxMutation
-> POST 요청
-> API route 또는 Supabase REST
-> DB insert
-> setQueryData/invalidateQueries
-> 성공 메시지 또는 페이지 이동

Update:
Page form
-> useUpdateXxxMutation
-> PATCH 요청
-> API route 또는 Supabase REST
-> DB update
-> 목록/상세 cache 갱신

Delete:
Page action
-> confirm
-> useDeleteXxxMutation
-> DELETE 요청
-> DB delete
-> 목록 cache에서 제거
-> 상세 cache 제거
```

최종적으로 기억할 것:

```txt
CRUD는 화면, hook, API/DB, cache가 함께 움직이는 흐름이다.
조회는 useQuery로 만든다.
생성/수정/삭제는 useMutation으로 만든다.
hook은 화면에서 서버 데이터 로직을 분리한다.
React Query는 loading/error/cache/refetch를 일관되게 관리한다.
민감한 CRUD는 API route에서 auth와 role을 확인한다.
Supabase REST 직접 호출은 RLS와 public key 범위 안에서 사용한다.
mutation 성공 후 cache 갱신 전략이 CRUD 품질을 결정한다.
```
