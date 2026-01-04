# AI Agent Business Builder - 종합 프로젝트 레퍼런스

---

## 1. 프로젝트 정의

### 1.1 비즈니스 목적

한국 시장을 타겟으로 하는 SaaS 플랫폼. 사용자가 실제 시장 문제를 발견하고, AI 기반 비즈니스 아이디어를 생성하며, 개발 가능한 기술 명세서를 얻을 수 있다.

### 1.2 서비스 흐름

```
Stage A (무료)          Stage B (₩1,200)         Stage C (₩2,500)
문제 발견               아이디어 생성             기술 명세 생성
───────────────────────────────────────────────────────────────────
  │                         │                         │
  ▼                         ▼                         ▼
부동산 포럼에서         선택한 문제에 대해        선택한 아이디어에 대해
수집된 시장 문제를      AI가 3-5개               AI가 PRD, 아키텍처,
카드 형태로 탐색        비즈니스 아이디어 생성    로드맵, 기술 스택 생성
```

### 1.3 핵심 원칙

- **Data-First**: 모든 아이디어는 실제 시장 데이터(RAG)에 기반
- **Multi-Agent**: 각 Agent는 단일 책임 (수집/아이디어/명세)
- **한국 시장**: 모든 금액은 원화(KRW), 인터페이스는 한국어

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              클라이언트                                   │
│                        (React/Next.js 브라우저)                           │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          Vercel (서버리스)                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                    Next.js API Routes                              │  │
│  │  /api/auth/*      /api/discovery/*    /api/ideas/*                 │  │
│  │  /api/payment/*   /api/specifications/*                            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                         ▼
┌───────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Supabase    │       │    OpenAI API   │       │  Toss Payments  │
│  PostgreSQL   │       │    GPT-4o       │       │                 │
│  + pgvector   │       │    GPT-4o-mini  │       │                 │
└───────────────┘       └─────────────────┘       └─────────────────┘
```

### 2.2 백엔드 구조 (Python)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          FastAPI (Python)                                 │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                         API Routers                                │  │
│  │  /auth    /discovery    /ideas    /payment    /users              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                  │                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                          Services                                  │  │
│  │  rag_service    ai_agent    payment_service    pipeline           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                  │                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                          Storage                                   │  │
│  │  rdb_store    vector_store    user_store    idea_store            │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                  │                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                     Agent 1 (Data Analyst)                         │  │
│  │  scraper    cleaner    embedder    scheduler                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 기술 스택

| 레이어 | 기술 | 용도 |
|--------|------|------|
| 프론트엔드 | Next.js 14+ (App Router) | SSR, API Routes |
| UI | React 18, TailwindCSS | 컴포넌트, 스타일링 |
| 백엔드 | FastAPI (Python 3.11+) | REST API |
| 데이터베이스 | Supabase PostgreSQL | 관계형 데이터 |
| 벡터 검색 | ChromaDB / pgvector | RAG용 임베딩 검색 |
| LLM | OpenAI GPT-4o, GPT-4o-mini | 아이디어/명세 생성 |
| 결제 | Toss Payments | 한국 결제 |
| 인증 | JWT, Google OAuth | 사용자 인증 |

---

## 3. 데이터 모델

### 3.1 엔티티 관계도

```
┌─────────────┐      ┌─────────────────┐      ┌──────────────────┐
│    users    │      │ auth_identities │      │document_summaries│
├─────────────┤      ├─────────────────┤      ├──────────────────┤
│ id (PK)     │◀─────│ user_id (FK)    │      │ id (PK)          │
│ email       │      │ provider        │      │ title            │
│ password    │      │ provider_user_id│      │ keywords[]       │
│ nickname    │      └─────────────────┘      │ domain_tag       │
│ status      │                               │ trend            │
└──────┬──────┘                               │ sentiment        │
       │                                      └────────┬─────────┘
       │                                               │
       ▼                                               ▼
┌──────────────────┐                          ┌──────────────────┐
│generation_sessions│                         │document_relations│
├──────────────────┤                          ├──────────────────┤
│ id (PK)          │                          │ source_id (FK)   │
│ user_id (FK)     │                          │ target_id (FK)   │
│ problem_id (FK)  │──────────────────────────│ similarity_score │
│ status           │                          └──────────────────┘
│ rag_context      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  generated_ideas │
├──────────────────┤
│ id (PK)          │
│ session_id (FK)  │
│ title            │
│ description      │
│ target_audience  │
│ differentiators[]│
│ market_signals   │
│ confidence_score │
│ is_bookmarked    │
└────────┬─────────┘
         │
         ▼
┌────────────────────────┐      ┌─────────────────────┐
│technical_specifications│      │ regeneration_quotas │
├────────────────────────┤      ├─────────────────────┤
│ id (PK)                │      │ user_id (FK)        │
│ user_id (FK)           │      │ idea_id (FK)        │
│ idea_id (FK)           │◀─────│ used_count          │
│ version_number         │      │ max_count (=3)      │
│ constraints_snapshot   │      │ version (locking)   │
│ prd_content            │      └─────────────────────┘
│ architecture_content   │
│ roadmap_content        │
│ techstack_content      │
│ status                 │
└────────────────────────┘
```

### 3.2 주요 엔티티 정의

#### users
사용자 계정. status는 PENDING(온보딩 미완료) 또는 ACTIVE.

#### auth_identities
인증 제공자 연결. provider(google/email) + provider_user_id로 식별. 이메일 기반 자동 병합 금지.

#### document_summaries
Agent 1이 수집/정제한 시장 문제. Stage A 카드 표시용.

#### generation_sessions
Stage B 아이디어 생성 세션. 문제당 1회만 생성 가능.

#### generated_ideas
생성된 비즈니스 아이디어. RAG 기반 market_signals 포함.

#### technical_specifications
Stage C 기술 명세서. 아이디어당 최대 4개 버전 (초기 + 재생성 3회).

#### regeneration_quotas
재생성 횟수 추적. Optimistic Locking으로 동시성 제어.

---

## 4. Stage A: Discovery (문제 발견)

### 4.1 비즈니스 요구사항

- 비로그인 사용자도 문제 카드 탐색 가능 (무료)
- 문제 선택 및 Stage B 진행은 로그인 필요
- 모바일: 무한 스크롤 / 데스크톱: 페이지네이션

### 4.2 기능 요구사항

| ID | 요구사항 |
|----|----------|
| FR-001 | 001-data-pipeline에서 수집된 문제를 카드 형태로 표시 |
| FR-002 | 카드에 title, keywords(최대 5개), trend, sentiment 표시 |
| FR-003 | 카드 클릭 시 상세 미리보기 표시 |
| FR-004 | domain, trend, sentiment, keyword로 필터링 |
| FR-006 | 모바일에서 무한 스크롤 (배치당 20개) |
| FR-007 | 데스크톱에서 페이지네이션 (페이지당 12개) |

### 4.3 동작 방식

```
1. 사용자가 / 페이지 접근
2. GET /api/discovery/problems 호출 (페이지/스크롤 파라미터)
3. document_summaries 테이블에서 조회
4. 카드 그리드 렌더링
5. 카드 클릭 → GET /api/discovery/problems/:id → 미리보기 모달
6. "아이디어 생성" 클릭
   - 로그인 상태: Stage B로 이동
   - 비로그인: AuthModal 표시 → 로그인 후 Stage B
```

### 4.4 구현 위치

```
frontend/src/components/discovery/
├── ProblemCard.tsx         # 문제 카드
├── FilterBar.tsx           # 필터 바
├── ProblemPreview.tsx      # 상세 미리보기 모달
├── InfiniteScroll.tsx      # 모바일 무한 스크롤
└── Pagination.tsx          # 데스크톱 페이지네이션

frontend/src/app/api/discovery/
├── problems/route.ts       # GET: 문제 목록
├── problems/[id]/route.ts  # GET: 문제 상세
└── domains/route.ts        # GET: 도메인 목록
```

---

## 5. Stage B: Idea Generation (아이디어 생성)

### 5.1 비즈니스 요구사항

- 선택한 문제에 대해 AI가 3-5개 아이디어 생성
- 문제당 1회만 생성 가능 (재생성 없음)
- 생성된 아이디어는 영구 저장 (유료 콘텐츠)
- RAG 기반으로 실제 시장 데이터에 근거

### 5.2 기능 요구사항

| ID | 요구사항 |
|----|----------|
| FR-001 | Stage A에서 선택한 문제 컨텍스트를 AI에 전달 |
| FR-002 | 생성 중 로딩 상태 표시 |
| FR-003 | 3-5개 아이디어를 구조화된 형태로 표시 |
| FR-004 | 각 아이디어에 title, description, target_audience, differentiators, market_signals, confidence_score 포함 |
| FR-006 | 생성된 아이디어 자동 저장 |
| FR-010 | 북마크 기능 |

### 5.3 RAG 파이프라인

```
1. 선택된 문제의 title + keywords로 쿼리 생성
2. ChromaDB에서 유사 문제 5-10개 검색 (cosine similarity > 0.7)
3. 도메인 필터링 + RISING 트렌드 가중치
4. 검색 결과를 프롬프트 컨텍스트로 포맷팅
5. Agent 2 (GPT-4o-mini)에 전달
6. 아이디어 생성 시 market_signals는 반드시 RAG 데이터 인용
```

### 5.4 Agent 2 입출력

**입력**:
```json
{
  "problem_title": "반려동물 친화 주거 수요 증가",
  "keywords": ["펫", "주거", "임대", "정책"],
  "domain": "real-estate",
  "trend": "RISING",
  "sentiment": "NEGATIVE",
  "rag_context": [/* 유사 문제 5-10개 */]
}
```

**출력**:
```json
{
  "ideas": [
    {
      "title": "펫프렌들리 부동산 매칭 플랫폼",
      "description": "...(200-500단어)...",
      "target_audience": "반려동물을 키우는 2030 1인가구",
      "differentiators": ["...", "...", "..."],
      "market_opportunity": "...",
      "implementation_hints": "...",
      "market_signals": ["RAG 데이터 기반 근거1", "..."],
      "confidence_score": 0.85
    }
  ]
}
```

### 5.5 구현 위치

```
frontend/src/components/stage-b/
├── GenerateButton.tsx      # 생성 버튼 + 로딩
├── IdeaCard.tsx            # 아이디어 카드 (축소)
├── IdeaDetail.tsx          # 아이디어 상세 (확장)
└── ErrorState.tsx          # 에러 표시

frontend/src/app/api/ideas/
├── generate/route.ts       # POST: 아이디어 생성
├── sessions/route.ts       # GET: 세션 목록
├── sessions/[id]/route.ts  # GET: 세션 상세
├── [ideaId]/bookmark/route.ts  # POST: 북마크 토글
└── saved/route.ts          # GET: 저장된 아이디어

src/services/
├── rag_service.py          # RAG 검색
└── ai_agent.py             # Agent 2 호출
```

---

## 6. Stage C: Technical Execution (기술 명세)

### 6.1 비즈니스 요구사항

- 선택한 아이디어에 대해 개발 가능한 기술 명세 생성
- 사용자 제약조건(예산, 팀, 타임라인) 반영
- 초기 생성 + 최대 3회 재생성 (총 4버전)
- PDF/Markdown 내보내기

### 6.2 기능 요구사항

| ID | 요구사항 |
|----|----------|
| FR-001 | 예산 입력: 범위 선택 또는 구체적 금액 |
| FR-002 | 팀 구성 입력: 총 인원 + 레벨별 분배 |
| FR-003 | 타임라인 입력: MVP 출시 기간 |
| FR-004 | 기술 선호도 입력 (선택): 언어, 프레임워크, 플랫폼 |
| FR-007 | 제약조건 + 아이디어 컨텍스트를 Agent 3에 전달 |
| FR-012 | PRD 생성: 요구사항, 사용자 스토리, 수용 기준 |
| FR-013 | 아키텍처 다이어그램 생성 (Mermaid) |
| FR-014 | MVP 로드맵 생성: 페이즈, 마일스톤, 산출물 |
| FR-015 | 기술 스택 추천: 각 선택에 대한 근거 포함 |
| FR-021 | PDF 내보내기 |
| FR-022 | Markdown ZIP 내보내기 |
| FR-024 | 최대 3회 재생성 허용 |
| FR-027 | 남은 재생성 횟수 표시 |

### 6.3 제약조건 입력 값

**예산 범위**:
| 코드 | 한국어 | 아키텍처 추천 |
|------|--------|---------------|
| UNDER_10M | 1,000만원 미만 | 서버리스, 무료/오픈소스 |
| 10M_TO_50M | 1,000만원~5,000만원 | 관리형 서비스 |
| 50M_TO_200M | 5,000만원~2억원 | 엔터프라이즈 도구 |
| OVER_200M | 2억원 이상 | 풀 엔터프라이즈 |

**타임라인**:
| 코드 | 한국어 |
|------|--------|
| 1_TO_3_MONTHS | 1~3개월 |
| 3_TO_6_MONTHS | 3~6개월 |
| 6_TO_12_MONTHS | 6~12개월 |
| OVER_12_MONTHS | 12개월 이상 |

**팀 규모별 아키텍처**:
| 인원 | 추천 |
|------|------|
| 1-2명 | 모놀리식 |
| 3-5명 | 모듈러 |
| 6명+ | 마이크로서비스 |

### 6.4 Agent 3 입출력

**입력**:
```json
{
  "idea": {
    "title": "펫프렌들리 부동산 매칭 플랫폼",
    "description": "...",
    "targetAudience": "...",
    "differentiators": ["...", "..."],
    "marketOpportunity": "..."
  },
  "problem": {
    "title": "반려동물 친화 주거 수요 증가",
    "domain": "real-estate"
  },
  "constraints": {
    "budget": { "range": "10M_TO_50M", "specificAmount": 30000000 },
    "team": { "size": 3, "composition": { "junior": 1, "middle": 1, "senior": 1 } },
    "timeline": "3_TO_6_MONTHS",
    "techPreferences": { "languages": ["TypeScript"], "platforms": ["web"] }
  }
}
```

**출력**:
```json
{
  "prd": {
    "productOverview": "...",
    "userStories": [{ "actor": "...", "action": "...", "benefit": "..." }],
    "functionalRequirements": [{ "id": "FR-001", "description": "..." }],
    "nonFunctionalRequirements": [{ "id": "NFR-001", "description": "..." }]
  },
  "architecture": {
    "systemDiagram": "graph TD\n  A[Client] --> B[API]\n  ...",
    "components": [{ "name": "...", "responsibility": "...", "technology": "..." }],
    "dataFlow": "..."
  },
  "roadmap": {
    "phases": [
      {
        "name": "Phase 1: MVP",
        "duration": "6주",
        "milestones": ["...", "..."],
        "deliverables": ["...", "..."]
      }
    ]
  },
  "techStack": {
    "frontend": { "choice": "Next.js", "rationale": "예산 내 빠른 개발..." },
    "backend": { "choice": "Node.js", "rationale": "..." },
    "database": { "choice": "PostgreSQL", "rationale": "..." },
    "infrastructure": { "choice": "Vercel + Supabase", "rationale": "..." },
    "constraintAlignment": "예산 3천만원, 3인 팀, 3-6개월 타임라인에 최적화..."
  }
}
```

### 6.5 재생성 쿼터 시스템

```
초기 상태: used_count=0, max_count=3
  │
  ▼
1차 생성 (무료): version_number=1
  │
  ▼ 재생성 요청
쿼터 소비: used_count=1 → version_number=2
  │
  ▼ 재생성 요청
쿼터 소비: used_count=2 → version_number=3
  │
  ▼ 재생성 요청
쿼터 소비: used_count=3 → version_number=4
  │
  ▼ 재생성 요청
거부: "재생성 횟수를 모두 사용했습니다"
```

**동시성 제어 (Optimistic Locking)**:
```sql
UPDATE regeneration_quotas
SET used_count = used_count + 1, version = version + 1
WHERE user_id = ? AND idea_id = ? AND version = ?
-- 영향받은 행이 0이면 동시성 충돌 → 재시도
```

### 6.6 구현 위치

```
frontend/src/types/stage-c.ts              # 타입 정의

frontend/src/lib/
├── constraint-validator.ts   # 제약조건 검증
├── document-exporter.ts      # PDF/MD 내보내기
├── regeneration-quota.ts     # 쿼터 관리
└── tech-architect-agent.ts   # Agent 3 호출

frontend/src/components/stage-c/
├── BudgetSelector.tsx        # 예산 선택
├── TeamCompositionInput.tsx  # 팀 구성
├── TimelineSelector.tsx      # 타임라인
├── TechPreferencesInput.tsx  # 기술 선호도
├── ConstraintsForm.tsx       # 4단계 폼
├── GenerateSpecButton.tsx    # 생성 버튼
├── SpecGenerationProgress.tsx # 진행 표시 (6단계)
├── DocumentTabs.tsx          # 탭 네비게이션
├── PRDViewer.tsx             # PRD 렌더링
├── ArchitectureViewer.tsx    # Mermaid 다이어그램
├── RoadmapViewer.tsx         # 로드맵 렌더링
├── TechStackViewer.tsx       # 기술 스택 렌더링
├── ExportButton.tsx          # PDF/MD 내보내기
├── RegenerateButton.tsx      # 재생성 버튼
├── QuotaDisplay.tsx          # 쿼터 표시 (X/3)
├── VersionHistoryList.tsx    # 버전 히스토리
├── VersionBadge.tsx          # 버전 뱃지
└── StageCPage.tsx            # 메인 페이지

frontend/src/app/api/specifications/
├── route.ts                  # POST (생성), GET (목록)
├── [specId]/route.ts         # GET (상세), DELETE
├── quota/route.ts            # GET (쿼터 조회)
└── validate/route.ts         # POST (제약조건 검증)
```

---

## 7. 인증 시스템

### 7.1 지원 방식

| 방식 | 설명 |
|------|------|
| 이메일/비밀번호 | 기본 회원가입/로그인 |
| Google OAuth | 소셜 로그인 (Continue with Google) |
| 계정 연결 | 기존 계정에 Google 연결 |

### 7.2 핵심 원칙

- **AuthIdentity 기반 식별**: (provider, provider_user_id)로 사용자 식별
- **이메일 기반 자동 병합 금지**: 보안상 이메일만으로 계정 병합하지 않음
- **온보딩 필수**: Google 신규 사용자는 닉네임 입력 후 계정 생성

### 7.3 인증 흐름

**Google 신규 가입**:
```
1. "Continue with Google" 클릭
2. Google OAuth 팝업 → id_token 획득
3. 서버에서 id_token 검증 (signature, iss, aud, exp, email_verified)
4. AuthIdentity 조회 (provider=google, provider_user_id=sub)
5. 없음 → 온보딩 화면 (닉네임 입력)
6. 닉네임 입력 → users(status=ACTIVE) + auth_identities 생성
7. JWT 발급
```

**Google 재로그인**:
```
1. "Continue with Google" 클릭
2. id_token 획득 및 검증
3. AuthIdentity 조회 → 있음
4. 즉시 JWT 발급 (온보딩 스킵)
```

**계정 연결**:
```
1. 이메일 계정으로 로그인된 상태
2. "Google 연결" 클릭 → Google OAuth
3. 기존 계정에 auth_identities 추가
4. 이후 Google로도 동일 계정 접근 가능
```

### 7.4 구현 위치

```
frontend/src/components/auth/
└── AuthModal.tsx             # 인증 모달

frontend/src/app/api/auth/
├── register/route.ts         # 이메일 회원가입
├── login/route.ts            # 이메일 로그인
├── google/route.ts           # Google OAuth 콜백
├── refresh/route.ts          # JWT 갱신
├── logout/route.ts           # 로그아웃
├── forgot-password/route.ts  # 비밀번호 재설정 요청
└── reset-password/route.ts   # 비밀번호 재설정 확인

src/auth/
├── jwt.py                    # JWT 생성/검증
├── password.py               # bcrypt 해싱
├── oauth.py                  # Google OAuth 처리
└── email.py                  # 이메일 발송
```

---

## 8. 결제 시스템

### 8.1 상품

| 상품 | 가격 | 설명 |
|------|------|------|
| Stage B 아이디어 생성 | ₩1,200 | 문제당 1회 |
| Stage C 기술 명세 | ₩2,500 | 초기 + 재생성 3회 포함 |

### 8.2 결제 흐름

```
1. 사용자가 Stage B/C 진행 버튼 클릭
2. /payment/checkout으로 이동
3. Toss Payments SDK requestPayment() 호출
4. Toss 결제 화면에서 결제 완료
5. 콜백: /payment/success 또는 /payment/failure
6. POST /api/payment/confirm으로 결제 검증
7. 검증 성공 → Stage B/C 진행 허용
```

### 8.3 구현 위치

```
frontend/src/components/payment/
├── PaymentButton.tsx         # 결제 버튼
└── PaymentStatus.tsx         # 결제 상태 표시

frontend/src/app/api/payment/
├── confirm/route.ts          # 결제 확인
├── status/[orderId]/route.ts # 상태 조회
└── fail/route.ts             # 실패 처리
```

---

## 9. 데이터 파이프라인 (Agent 1)

### 9.1 목적

부동산 커뮤니티 포럼에서 시장 문제 데이터를 수집, 정제, 저장하여 Stage A 카드 및 RAG 컨텍스트 제공.

### 9.2 파이프라인 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Scraper   │────▶│   Cleaner   │────▶│  Embedder   │
│ (BeautifulSoup)   │ (노이즈 제거)│     │ (text-embedding-3-small)
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                          ┌────────────────────┴────────────────────┐
                          ▼                                         ▼
                   ┌─────────────┐                           ┌─────────────┐
                   │  ChromaDB   │                           │ PostgreSQL  │
                   │ (벡터 저장) │                           │ (요약 저장) │
                   └─────────────┘                           └─────────────┘
```

### 9.3 수집 스케줄

| 작업 | 주기 | 범위 |
|------|------|------|
| 초기 로드 | 1회 | 과거 데이터 전체 |
| 증분 수집 | 1시간 | 이전 1시간 게시글 |

### 9.4 데이터 정제

- 광고, 스팸, 무관한 게시글 필터링 (80% 정확도 목표)
- 제목, 키워드, 도메인, 트렌드, 감정 추출
- 중복 제거 (콘텐츠 해시 기반)

### 9.5 구현 위치

```
src/agents/analyst/
├── scraper.py                # 웹 스크래핑
├── cleaner.py                # 노이즈 제거, 구조화
├── embedder.py               # 임베딩 생성
└── scheduler.py              # 1시간 스케줄링

src/storage/
├── rdb_store.py              # PostgreSQL 저장
└── vector_store.py           # ChromaDB 저장

src/models/
├── raw_post.py               # 원본 게시글
├── document.py               # 정제된 문서
├── summary.py                # 요약 (카드용)
└── relationship.py           # 문서 간 관계
```

---

## 10. API 명세

### 10.1 인증 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/auth/register | 이메일 회원가입 |
| POST | /api/auth/login | 이메일 로그인 |
| POST | /api/auth/google | Google OAuth |
| POST | /api/auth/refresh | JWT 갱신 |
| POST | /api/auth/logout | 로그아웃 |
| POST | /api/auth/forgot-password | 비밀번호 재설정 요청 |
| POST | /api/auth/reset-password | 비밀번호 재설정 확인 |
| GET | /api/users/me | 현재 사용자 정보 |

### 10.2 Discovery API (Stage A)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/discovery/domains | 도메인 목록 |
| GET | /api/discovery/problems | 문제 카드 목록 (필터, 페이지네이션) |
| GET | /api/discovery/problems/:id | 문제 상세 |

### 10.3 Ideas API (Stage B)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/ideas/generate | 아이디어 생성 |
| GET | /api/ideas/sessions | 사용자 세션 목록 |
| GET | /api/ideas/sessions/:id | 세션 상세 (아이디어 포함) |
| GET | /api/ideas/saved | 저장된 아이디어 목록 |
| POST | /api/ideas/:ideaId/bookmark | 북마크 토글 |
| GET | /api/ideas/:ideaId/saved-status | 북마크 상태 |

### 10.4 Specifications API (Stage C)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/specifications | 명세서 생성/재생성 |
| GET | /api/specifications | 아이디어별 명세서 목록 |
| GET | /api/specifications/:specId | 명세서 상세 |
| GET | /api/specifications/quota | 재생성 쿼터 조회 |
| POST | /api/specifications/validate | 제약조건 검증 |

### 10.5 Payment API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/payment/confirm | 결제 확인 |
| GET | /api/payment/status/:orderId | 결제 상태 |
| POST | /api/payment/fail | 결제 실패 처리 |

---

## 11. 데이터 흐름

### 11.1 전체 흐름

```
[부동산 포럼]
     │
     ▼ (1시간마다 스크래핑)
[Agent 1: Data Analyst]
     │
     ├──▶ [ChromaDB] ────────────────────────────────────┐
     │     (임베딩 저장)                                  │
     │                                                   │
     └──▶ [PostgreSQL: document_summaries]               │
           (요약 저장)                                    │
               │                                         │
               ▼                                         │
         [Stage A: 카드 표시]                             │
               │                                         │
               ▼ (문제 선택 + 결제)                       │
         [Stage B: 아이디어 생성]                         │
               │                                         │
               │◀───── RAG 검색 ─────────────────────────┘
               │
               ▼
         [Agent 2: Strategic Planner] ──▶ [PostgreSQL: generated_ideas]
               │
               ▼ (아이디어 선택 + 결제)
         [Stage C: 기술 명세]
               │
               ▼
         [Agent 3: Tech Architect] ──▶ [PostgreSQL: technical_specifications]
               │
               ▼
         [PDF/Markdown 내보내기]
```

### 11.2 Stage B 세부 흐름

```
Client                    API                      Services                 DB/Vector
  │                        │                          │                        │
  │ POST /ideas/generate   │                          │                        │
  │ {problemId}            │                          │                        │
  │───────────────────────▶│                          │                        │
  │                        │ getUserId()              │                        │
  │                        │─────────────────────────▶│                        │
  │                        │                          │ getProblem(id)         │
  │                        │                          │───────────────────────▶│
  │                        │                          │                        │
  │                        │                          │ ragSearch(problem)     │
  │                        │                          │───────────────────────▶│ ChromaDB
  │                        │                          │◀───────────────────────│
  │                        │                          │                        │
  │                        │                          │ agent2.generate()      │
  │                        │                          │───────────────────────▶│ OpenAI
  │                        │                          │◀───────────────────────│
  │                        │                          │                        │
  │                        │                          │ saveSession+Ideas()    │
  │                        │                          │───────────────────────▶│
  │                        │◀─────────────────────────│                        │
  │◀───────────────────────│                          │                        │
  │ {session, ideas[]}     │                          │                        │
```

---

## 12. 환경 변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenAI
OPENAI_API_KEY=sk-...

# Toss Payments
TOSS_SECRET_KEY=test_sk_...
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_ck_...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# JWT
JWT_SECRET=your-jwt-secret

# ChromaDB (백엔드)
CHROMA_HOST=localhost
CHROMA_PORT=8000
```

---

## 13. 성공 기준

### 13.1 Stage A

| ID | 기준 |
|----|------|
| SC-001 | 70%+ 신규 방문자가 최소 3개 문제 카드 조회 |
| SC-002 | 문제 카드 로드 2초 이내 |
| SC-004 | 카드 조회 사용자 중 10%+ Stage B 진행 |

### 13.2 Stage B

| ID | 기준 |
|----|------|
| SC-001 | 80%+ 생성 시작 사용자가 결과 수신 |
| SC-002 | 95% 요청이 30초 이내 완료 |
| SC-AI-002 | 할루시네이션 5% 미만 (RAG 데이터 기반) |

### 13.3 Stage C

| ID | 기준 |
|----|------|
| SC-001 | 90%+ 생성 시작 사용자가 완전한 결과 수신 |
| SC-002 | 95% 요청이 60초 이내 완료 |
| SC-003 | 80%+ 사용자가 명세서 다운로드 |
| SC-006 | 30%+ 사용자가 최소 1회 재생성 사용 |

---
