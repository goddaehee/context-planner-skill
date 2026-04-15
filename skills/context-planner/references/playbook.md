# Operational Playbook
## 운영 목적
- `New WorkFlow`의 핵심은 문서를 길게 쓰는 것이 아니라, 흩어진 컨텍스트를 `실행 가능한 패키지`로 바꾸는 것입니다.
- 따라서 운영 단위는 `요구사항 문서`가 아니라 `Plan.md + Open Questions + Issue Breakdown`입니다.
## Context-Driven Pipeline
### Step 1. Raw Context 수집 (Phase 0)
- wiki URL → 하위 페이지 자동 탐색
- 기획서 / 요구사항 문서 붙여넣기
- 텍스트 설명 → AI 인터뷰
- 레거시 화면 캡처, 디자인 링크, Slack 논의
### Step 2. Context Compiler (Phase A → B)
- 7개 필수 필드 수집 → `context-input.json`
- `Requirement → Plan.md Compiler` 프롬프트로 초안 생성
### Step 3. Gap Reviewer (Phase C)
- 누락된 `Permission`, `Design Constraint`, `External Integration`, `Edge Case` 추출
### Step 4. Rule Freeze (Phase B+)
- 구현 전 `Open Questions`를 최소한으로 해소
### Step 5. Dev Execution
- 확정 사실만 구현
- 미확정 영역은 `TODO / Interface Boundary`로 남김
### Step 6. Spec Generate (Phase F, 선택)
- plan.md → 한국 기업형 기획서(PPTX) 생성
### Step 7. Async Polishing
- 디자인/QA/기획이 사전 병목이 아니라 사후 polishing으로 참여
### Step 8. Pilot Retrospective (Phase E)
- 다음 케이스에 승격할 필수 입력값 추출
## Mandatory Input Rules
- `Intent & Judgment`
	- 왜 이 작업을 하는지
	- 왜 지금 우선순위인지
- `Scope / Out-of-scope`
	- 어디까지 구현할지
	- 어디는 절대 건드리지 말아야 하는지
- `Acceptance Criteria`
	- 무엇이 끝난 상태인지
- `Constraints & Assets`
	- 어떤 디자인/퍼블리싱/레거시/다이어그램을 따라야 하는지
- `Integration`
	- 어떤 외부 시스템과 연결되는지
- `Permission / Security`
	- 누가 무엇을 볼 수 있는지
	- 민감한 경계가 어디인지
## Triage Guide
### 즉시 파일럿 대상
- 기존 UI/퍼블리싱 자산이 충분하다
- 비즈니스 로직과 화면 경계가 비교적 명확하다
- 실패 비용이 낮다
- 내부 어드민성 성격이 강하다
### 보류 대상
- 디자인 가이드가 아직 고정되지 않았다
- 권한/보안 영향도가 크다
- 여러 시스템 간 계약이 불명확하다
- 대형 레거시 리팩토링과 엮여 있다
## Quality Gate
### Gate 1. Requirement Quality
- 문제 정의가 한 문장으로 요약되는가
- 범위와 비범위가 분리되었는가
### Gate 2. Delivery Quality
- `Acceptance Criteria`가 테스트 가능한가
- `Open Questions`가 별도 정리되었는가
### Gate 3. Execution Safety
- `Permission`, `Integration`, `Design Constraint`가 문서화되었는가
### Gate 4. Reuse Quality
- 다음 과제에 재사용 가능한 프롬프트/체크리스트가 추출되었는가
## Suggested Rollout
### 1~2주차
- 기존 문서를 `Plan.md`로 요약하는 연습만 수행
### 3~4주차
- 저위험 과제 1건을 선정해 `Issue Breakdown`까지 실험
### 5~6주차
- `Dev Agent` 또는 실제 구현 연결
### 7주차 이후
- 회고 결과를 반영해 템플릿과 필수 입력값을 확정
## Anti-pattern
- 문서가 부족한데 추측으로 구현 시작
- 디자인 재사용 범위를 고정하지 않고 프론트 개발 먼저 시작
- 권한 정책이 미확정인데 조회 기능부터 넓힘
- `Open Questions`를 숨기고 마치 확정된 것처럼 서술
## Working Agreement
- 사람은 `Intent`, `Priority`, `Trade-off`, `Permission`을 결정한다.
- AI는 `정리`, `분해`, `초안`, `검증 질문`, `형식화`를 담당한다.
- 구현은 확정된 컨텍스트만 사용한다.
