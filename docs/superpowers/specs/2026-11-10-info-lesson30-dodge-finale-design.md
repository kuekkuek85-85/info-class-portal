# 정보 30차 「똥피하기 만들기 ③ (완성 + AI로 나만의 기능)」 설계

작성 2026-11-10. 교사 승인 완료. **실세션 오픈 금지(날짜 확정 후 별도 지시).** 커밋 금지.
28·29차(seed-lesson28/29.ts) 승계. 출처 미션 = scratchpad `dodge29_hybridA.py`(3미션).

## 목표
- 28·29차에서 만든 "똥이 계속 떨어지는" 뼈대에 **충돌·점수·여러 똥**을 얹어 똥피하기를 **완성**한다.
- 마지막에 **바이브 코딩(AI로 나만의 기능 추가)** 으로 자기 게임을 자유 확장한다(27차 vibe_code 재사용).
- 새 개념(`playing` on/off 스위치·`and`·`show_number`·`or`)은 쓰기 직전에 짧은 설명(note) 단계로 가르친 뒤 쓴다.

## 단계(phaseOrder) / 라벨(phaseLabels)
`waiting → assessment → build → grill → mvp → worksheet → reflection`
- assessment "안내", build "미션1 — 충돌(게임오버)", grill "미션2 — 점수", mvp "미션3 — 똥 2개", worksheet "미션4 — AI로 나만의 기능".
- 각 구현 단계 맨 앞에 개념 설명 **note**(maxLength 0) → 그 아래 **code_fill** 미션.

## 미션별 빈칸(code_fill, 토큰·answer 요약)
붙여넣기 허용 + ✎칸만 채우기. 모든 ✎칸은 **완결된 own-line 블록**(비어도 템플릿이 유효한 파이썬). `___`/`★★★` 리터럴 없음.

- **미션1(build) 충돌→게임오버**: 바탕 = 29차 완성(똥 계속 낙하) + `playing=True`·`if playing:` 가드(템플릿 제공).
  - `a` = 충돌 판정 블록(3줄):`if poop_y == 4 and poop_x == x:` / `playing = False` / `basic.show_icon(IconNames.SAD)`
- **미션2(grill) 점수**: 바탕 = 미션1 완성 + `score=0`(제공).
  - `a` = 바닥 리셋 안 점수:`score = score + 1`
  - `b` = 게임오버 때 점수 표시:`basic.show_number(score)`
- **미션3(mvp) 똥 2개**: 바탕 = 미션2 완성 + 둘째 똥 변수·낙하·그리기(제공, 첫 똥과 평행). 리스트 미학습 → 변수 2벌 유지.
  - `a` = 둘째 똥 바닥 리셋 블록(4줄, 첫 똥 리셋을 거울처럼):`if poop_y2 > 4:` / `poop_y2 = 0` / `poop_x2 = randint(0, 4)` / `score = score + 1`
  - `b` = `or` 충돌 블록(4줄):`if (poop_y == 4 and poop_x == x) or (poop_y2 == 4 and poop_x2 == x):` / `playing = False` / `basic.show_icon(IconNames.SAD)` / `basic.show_number(score)`

### 구조 결정 (보고에 명시) — flattened
출처 hybridA 는 `if 충돌 … else: (리셋+그리기)` 구조다. 본 차시 템플릿·vibeBaseCode 는 **충돌 판정을 그리기 뒤로 옮긴 평탄화(else 없음)** 버전을 쓴다. 이유: 모든 code_fill ✎칸을 비어도 유효한 완결 블록으로 만들고(28·29 안전 패턴), 템플릿에 blank-의존 `else:` 가 매달리지 않게 하려고. 동작 동일(poop_y==4 프레임에서 리셋은 안 걸리고 충돌 판정됨). 쓰는 명령은 전부 hybrid 헤더가 2026-11-08 MakeCode 실측으로 변환 확인한 것과 동일(`and`/`or`·`playing` bool·`show_number`·`show_icon`·`led.plot`·`randint`·`basic.forever`·여러 `global`). 학생이 미션1~3으로 만든 최종 코드 == vibeBaseCode 가 되도록 맞춤.

## 바이브 코딩(캡스톤, worksheet 단계) — 27차 메커니즘 그대로 재사용
- `kind: "vibe_code"`, `vibeTarget: "microbit"`, `vibeBaseCode = 완성 똥피하기(똥 2개·점수·게임오버)`, `vibeNoun="똥피하기"`, `vibePlaceholder` 예시.
- 라우트 `/api/student/vibe-code`(POST) → 서버가 `buildMicrobitSystem(vibeBaseCode)` + 학생 프롬프트로 Gemini 호출 → 전체 MakeCode static Python + 설명. 컴포넌트 `VibeCodePanel`.
- note(예시: "맞으면 삐 소리", "점수 10 넘으면 하트", "A+B 로 다시 시작") → vibe_code → text `mb30_vibe_what`(AI가 뭘 더했나) → text `mb30_vibe_mine`(내가 더한 기능 한 줄) → long `mb30_share`(완성 공유 링크, maxLength 6000).

### 걸림돌 점검
- **학교망**: 25·26·27차에서 같은 Gemini 엔드포인트(generativelanguage.googleapis.com)로 실제 수업했으므로 차단 아님. 파이썬 타자/UNO/MakeCode 는 기존 차시에서 열림 확인.
- **AI 쿼터**: 학번당 25회/시간, 태블릿당 50회/시간(route.ts rateLimit). 바이브는 선택 보너스라 충분.
- **프라이버시**: 학번·이름은 Gemini 로 안 감(vibeBaseCode + 프롬프트만). 프롬프트·답은 본인 artifact 에 저장, 교사만 열람, 학생 화면에 "선생님이 볼 수 있어요".

## 세션 표준
- 대기 = 파이썬 타자 도우미(`game.url="link:https://python-typing-helper.vercel.app/"`). 보상 = UNO(`rewardGame`), `requires=[{key:"mb30_share",phase:"worksheet",submitted:true}]`. 공유링크가 성찰 앞 선형 단계라 freeNav off 로도 통과.
- `freeNavigation:false`, 마음 체크인 강제 관문, `hideDoneButton:true`, 활동 통 `microbit-makecode`(키 mb30_* 충돌 없음).
- 구현 미션마다 실행결과 SVG 우측 1/3: 신규 `/mb30-m1.svg`(SAD 게임오버)·`/mb30-m2.svg`(점수 숫자)·`/mb30-m3.svg`(똥 2개). (28 자산은 '계속 낙하'라 의미가 달라 신규 제작.)

## 산출/검증
- `scripts/seed-lesson30.ts`(계획 심기, 멱등 --force), `public/mb30-m1|m2|m3.svg`, `scripts/open-info-30-rehearsal.ts`(리허설), `scripts/open-info-30.ts`(실세션용, **실행 금지**).
- 리허설: 고유 날짜/코드(9교시)로 열어 대기→기분→안내→미션1·2·3(개념 note+code_fill)→바이브→성찰→UNO 게이트, freeNav off·마음 체크인 확인 후 내가 만든 리허설만 정리.
