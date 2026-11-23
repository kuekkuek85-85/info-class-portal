/**
 * 32차 1-4 압축판 계획 등록 - 「똥피하기 ⑤ - 마무리와 수행평가 준비 (1-4반)」. 교사 확정 안 B (2026-11-18).
 *
 *   node --env-file=.env.local scripts/seed-lesson32-c4.ts            (교사 지시 전 실행 금지)
 *   node --env-file=.env.local scripts/seed-lesson32-c4.ts --force
 *
 * ## 왜 따로 있나
 * 1-4 는 두 차시 늦어서 30~32차를 두 차시로 줄였다: 11/23(월) 3교시 30차 그대로 → 11/25(수) 2교시 이 판 →
 * 11/26(목) 4교시 33차 → 34차는 그다음 주(날짜 미정). (2026-11-18 확정 시간표)
 * 31차(리스트)를 건너뛰므로 32차에서 리스트 미션을 빼고, AI 미션의 바탕 코드를 리스트 없는 완성 똥피하기
 * (30차 완성본: 똥 1개 + 충돌 + 점수)로 바꾼다. 총정리·수행평가 안내·성찰은 32차와 똑같다.
 *
 * ## 번호·키 체계
 *  · lessonNo 는 32 그대로(대시보드 표시 "32차시", review.ts 의 '앞 차시 = lessonNo - 1' 이 33차에서 맞게).
 *  · 계획 문서 ID 를 lesson32-c4 로 고정하고 variant:"c4" 를 붙인다. seed-lesson32.ts·open 스크립트는 variant 가
 *    있는 계획을 건너뛰고, 세션 갱신은 lessonPlanId 로 갈라 서로 덮지 않는다.
 *  · 답 키는 32차와 같은 mb32_* 다. 답은 학번별 문서(artifacts/microbit-makecode__학번)에 있어 반끼리 섞이지 않고,
 *    한 학생은 한 판만 듣는다. 그래서 33차 echo 키(mb32_pa_problem · mb32_want_in · mb32_want_out)가 모든 반에서 같다.
 *
 * ## 단계 (45분)
 *   대기·체크인 3 → 미션 ① AI로 나만의 기능(grill) 12 → 총정리(problem) 10 → 수행평가 안내(assessment) 14 → 성찰 6
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";
import { MISSION_AI, PLAN, RECAP, relabel } from "./lesson32-plan.ts";

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

const PLAN_DOC_ID = "lesson32-c4";
const VARIANT = "c4";
const FORCE = process.argv.includes("--force");

/** AI 미션 바탕 = 리스트 없는 완성 똥피하기 (30차 미션②를 빈칸까지 채운 코드: 똥 1개 · 충돌 · 점수). */
const DODGE_ONE_DONE = `x = 2
poop_x = randint(0, 4)
poop_y = 0
playing = True
score = 0

def on_button_pressed_a():
    global x
    x = x - 1
    if x < 0:
        x = 0
input.on_button_pressed(Button.A, on_button_pressed_a)

def on_button_pressed_b():
    global x
    x = x + 1
    if x > 4:
        x = 4
input.on_button_pressed(Button.B, on_button_pressed_b)

def on_forever():
    global poop_x, poop_y, playing, score
    if playing:
        poop_y = poop_y + 1
        if poop_y > 4:
            poop_y = 0
            poop_x = randint(0, 4)
            score = score + 1
        basic.clear_screen()
        led.plot(x, 4)
        led.plot(poop_x, poop_y)
        if poop_y == 4 and poop_x == x:
            playing = False
            basic.show_icon(IconNames.SAD)
            basic.show_number(score)
    basic.pause(300)
basic.forever(on_forever)`;

/** 32차 AI 미션을 1-4 판으로: 미션 번호 ①, 바탕 코드·예시 그림만 바꾼다(키·단계·안내 글은 그대로). */
const MISSION_AI_C4: WorksheetQuestion[] = relabel(MISSION_AI, {
  _mb32_vibe_intro: "미션 ① - AI에게 기능 하나를 부탁하기",
}).map((q) => {
  if (q.kind === "vibe_code") return { ...q, vibeBaseCode: DODGE_ONE_DONE };
  if (q.key === "_mb32_vibe_intro") return { ...q, imageUrl: "/mb32-vibe-ideas-c4.svg" };
  return q;
});

const PLAN_C4: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> & { variant: string } = {
  ...PLAN,
  variant: VARIANT,
  title: "똥피하기 ⑤ - 마무리와 수행평가 준비 (1-4반)",
  focusExempt: ["waiting", "grill"],
  phaseLabels: {
    grill: "미션 ① AI로 나만의 기능",
    problem: "마이크로비트 총정리",
    assessment: "수행평가 안내",
  },
  // 2026-11-23: 입력·출력 고르기는 성찰 글쓰기 [1] 로 합쳤다(lesson32-plan.ts reflectionQuestions)
  phaseOrder: ["waiting", "grill", "problem", "assessment", "reflection"],
  activity: {
    ...PLAN.activity!,
    worksheetIntro: {
      heading: "똥피하기 마무리 + 수행평가 준비",
      body: "미션① AI로 나만의 기능 → 총정리 → 수행평가 안내 → 성찰\n다 한 뒤 성찰을 내면 UNO 가 열려요.",
    },
    worksheet: [...MISSION_AI_C4, ...RECAP],
  },
};

async function main(): Promise<void> {
  const ref = db.collection("lessonPlans").doc(PLAN_DOC_ID);
  const now = Date.now();
  const before = await ref.get();
  await ref.set(
    { ...PLAN_C4, updatedAt: now, ...(before.exists ? {} : { createdAt: now }), quiz: FieldValue.delete() },
    { merge: true },
  );
  await ref.update({ phaseLabels: PLAN_C4.phaseLabels });
  console.log(`${before.exists ? "↻ 갱신" : "＋ 등록"} - ${PLAN_C4.title} (${PLAN_DOC_ID})`);

  // 이 계획으로 연 세션만(lessonPlanId === lesson32-c4) 갱신한다.
  const live = await db
    .collection("classSessions")
    .where("lessonPlanId", "==", PLAN_DOC_ID)
    .where("status", "in", ["scheduled", "active"])
    .get();
  let applied = 0;
  for (const session of live.docs) {
    const joined = await db.collection("attendance").where("sessionId", "==", session.id).limit(1).get();
    if (!joined.empty && !FORCE) {
      console.log(`· ${session.id} - 이미 학생이 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`);
      continue;
    }
    await session.ref.set(
      {
        title: PLAN_C4.title,
        assessment: PLAN_C4.assessment,
        reflectionQuestions: PLAN_C4.reflectionQuestions,
        reflectionAnswerKey: PLAN_C4.reflectionAnswerKey,
        rewardGame: PLAN_C4.rewardGame,
        focusExempt: PLAN_C4.focusExempt,
        phaseOrder: PLAN_C4.phaseOrder,
        freeNavigation: PLAN_C4.freeNavigation,
        activity: PLAN_C4.activity,
      },
      { merge: true },
    );
    await session.ref.update({ phaseLabels: PLAN_C4.phaseLabels });
    applied += 1;
  }
  console.log(`   열린 수업 ${applied}개에 반영`);
  console.log("단계: 대기 → 기분 → 미션①(grill AI, 바탕=리스트 없는 완성 똥피하기) → 총정리 → 수행평가 안내 → 성찰 → UNO.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
