/**
 * 32차시 차시 계획 등록 - 「똥피하기 ⑤ - 마무리와 수행평가 준비」 (MakeCode 아크 마지막 + 33~34차 수행평가 예고).
 *
 *   node --env-file=.env.local scripts/seed-lesson32.ts
 *   node --env-file=.env.local scripts/seed-lesson32.ts --force   (이미 학생이 들어온 수업도 덮어씀)
 *
 * 설계: docs/superpowers/specs/2026-11-18-info-lesson32-design.md (교사 결정 2026-11-18 반영)
 *
 * ## 흐름 (45분)
 *   대기(타자)·마음 체크인 3분
 *   미션 ① (build)     리스트로 정리 - 31차 미션② 그대로(좌우 대비 보기 고르기, 색 짝). 10분
 *   미션 ② (grill)     AI로 나만의 기능 - 31차 미션③ 그대로. **모두 함**(보너스 아님, 교사 결정). 9분
 *   총정리 (problem)    다섯 작품 입력·처리·출력 표 + 본체 부품 그림 + 써 보고 싶은 입력·출력 고르기. 8분
 *   수행평가 안내 (assessment)  탭 5개: 한눈에 · 채점① · 채점② · 33~34차 흐름 · AI 규칙. 11분
 *   성찰 → UNO          "해결하고 싶은 학교생활 속 불편" - 33차에서 다시 보여 준다(reflectionAnswerKey). 4분
 *
 * ## 교사 결정 (2026-11-18)
 *  · AI 미션은 모두. 하드웨어는 본체 내장 부품만(외부 부품 없음). AI 는 33~34차 모두 **포털 AI만**.
 *  · 수행평가 안내는 끝. 답 키는 mb32 로 새로(31차에 고르다 만 답이 미리 채워지지 않게).
 *  · 채점 기준 문구는 평가 계획 그대로(아래 RUBRIC_*).
 *  · 성찰은 수행평가로 잇기. 성찰 글을 학번별 공유 답안 문서의 mb32_pa_problem 에도 한 벌 저장한다
 *    (세션 reflectionAnswerKey -> /api/student/reflection). 33차는 echoKeys:[{key:"mb32_pa_problem"}] 로 읽는다.
 *    이 키는 32차 활동지 문항이 아니라서 학생 자동 저장이 덮어쓰지 않는다.
 *
 * ## 세션 운영 (정보 수업 표준)
 *  · 대기 = 파이썬 타자 링크. 보상 = UNO(requires 비움, 성찰 제출만으로). hideDoneButton. 되돌아가기 off.
 *  · 글은 블록당 3줄 이내(lesson-text-3-lines), 코드 줄 번호·Tab 표기는 공용 컴포넌트가 처리.
 *  · 그림: /mb31-loop.svg · /mb31-m2.svg · /mb31-vibe-ideas.svg(재사용) + /mb32-recap.svg · /mb32-parts.svg ·
 *    /mb32-pa-flow.svg(새로). 새 그림은 배포 뒤에 세션을 열어야 404 가 안 난다.
 *  · 세션을 열 때는 open 스크립트가 reflectionAnswerKey 도 실어야 한다(open-info-32-31-1123.ts 는 싣는다).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { ACTIVITY_ID, LESSON_NO, PA_PROBLEM_KEY, PLAN } from "./lesson32-plan.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다. --env-file=.env.local 을 붙였는지 확인하세요.`);
    process.exit(1);
  }
  return value;
}

const app = initializeApp({
  credential: cert({
    projectId: requiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY")
      .replace(/^["']|["']$/g, "")
      .replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const LESSON_PLANS = "lessonPlans";
const FORCE = process.argv.includes("--force");

async function main(): Promise<void> {
  // 1-4 압축판(seed-lesson32-c4.ts, 문서 ID lesson32-c4, variant:"c4")도 lessonNo 32 라서 걸러 낸다.
  const found = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const mine = found.docs.filter((d) => !(d.data() as { variant?: string }).variant);
  const now = Date.now();

  if (mine.length === 0) {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 - ${PLAN.title} (${ref.id})`);
  } else {
    const doc = mine[0];
    await doc.ref.set(
      { ...PLAN, updatedAt: now, progressChecks: FieldValue.delete(), quiz: FieldValue.delete() },
      { merge: true },
    );
    // merge 는 맵을 깊게 합쳐 빠진 단계 이름이 남는다 - phaseLabels 는 통째로 바꾼다.
    await doc.ref.update({ phaseLabels: PLAN.phaseLabels });
    console.log(`↻ 갱신 - ${PLAN.title} (${doc.id})`);

    const live = await db
      .collection("classSessions")
      .where("lessonNo", "==", LESSON_NO)
      .where("status", "in", ["scheduled", "active"])
      .get();
    let applied = 0;
    // 이 계획으로 연 세션만 갱신한다(1-4 압축판 세션은 lessonPlanId 가 lesson32-c4 라서 건너뛴다).
    for (const session of live.docs.filter((s) => (s.data() as { lessonPlanId?: string }).lessonPlanId === doc.id)) {
      const joined = await db.collection("attendance").where("sessionId", "==", session.id).limit(1).get();
      if (!joined.empty && !FORCE) {
        console.log(`· ${session.id} - 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`);
        continue;
      }
      await session.ref.set(
        {
          title: PLAN.title,
          moodCheckEnabled: PLAN.moodCheckEnabled,
          hideDoneButton: PLAN.hideDoneButton,
          game: PLAN.game,
          gameExplainer: PLAN.gameExplainer,
          rewardGame: PLAN.rewardGame,
          progressChecks: FieldValue.delete(),
          quiz: FieldValue.delete(),
          assessment: PLAN.assessment,
          video: PLAN.video,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          reflectionAnswerKey: PLAN.reflectionAnswerKey,
          focusExempt: PLAN.focusExempt,
          phaseOrder: PLAN.phaseOrder,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
        },
        { merge: true },
      );
      await session.ref.update({ phaseLabels: PLAN.phaseLabels });
      applied += 1;
    }
    console.log(`   열린 수업 ${applied}개에 반영`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (키 mb32_*) · 성찰 한 벌 저장 키: ${PA_PROBLEM_KEY}`);
  console.log("단계: 대기(타자) → 기분 → 미션①(build 리스트) → 미션②(grill AI, 모두) → 총정리(problem) → 수행평가 안내(assessment) → 성찰 → UNO.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
