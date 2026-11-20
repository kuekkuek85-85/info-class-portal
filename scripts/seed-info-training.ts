/**
 * 교사 연수(2026-11-23 20:00, 줌) 전용 계획 - 「똥피하기 시리즈 다섯 장면」.
 *
 *   node --env-file=.env.local scripts/seed-info-training.ts --dry    # 읽기만: 원본에서 조립해 요약만 출력
 *   node --env-file=.env.local scripts/seed-info-training.ts          # lessonPlans/info-training 에 쓰기
 *   node --env-file=.env.local scripts/seed-info-training.ts --force  # 이미 참가자가 들어온 연수 세션에도 반영
 *
 * 설계: docs/superpowers/specs/2026-11-20-teacher-training-demo-proposal.md
 *
 * ## 무엇을 묶나 (똥피하기 ①~⑤ = 28·29·30·31·32차)
 *   ① problem  빈칸 채우기·자동 힌트 (28·29차)  - 28차 미션 1(빈칸 2) + 29차 미션 1(빈칸 3, 더 해 보기)
 *   ② mvp      형성평가 (30차)                  - and 퀴즈 ②(서로 다른 칸: 참 and 거짓)
 *   ③ build    좌우 비교 하이라이트 (31·32차)    - 31차 미션②(리스트로 정리, code_choose). 32차에 실제로 함
 *   ④ grill    포털 AI·AI 기록 (32차)            - vibe_code (바탕 = 완성 리스트 똥피하기)
 *   그다음 한 줄 성찰. 대기 = 파이썬 타자 링크. 마음 체크인 관문 유지. 보상 게임 없음.
 *
 * ## 원본은 Firestore 의 실제 계획에서 읽는다
 *   코드 틀·빈칸 정답·그림 경로는 학생이 실제로 본 그대로 쓰려고, lessonNo 28~32 의 본 계획(variant 없음)에서
 *   문항을 key 로 골라 복사한다. 학생 설명(label·hint)만 연수용 3줄 이내로 새로 쓰고,
 *   옛 글에 남은 긴 대쉬는 짧은 하이픈으로 바꾼다. 원본 계획은 건드리지 않는다(읽기만).
 *
 * ## 데이터 분리
 *   activityId = microbit-makecode__training (실제 microbit-makecode__학번 과 다른 문서).
 *   lessonNo = 901, variant = "training", 문서 ID = info-training (정규 차시 번호 질의에 안 걸린다).
 *   echo·prefill·지난 차시 복습에 기대는 문항은 없다(외부인은 지난 기록이 없다) - 아래 assertNoEcho 로 확인한다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPhase, LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";

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
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");

// open-info-training-1123.ts · clean-info-training.ts 와 같은 값 (이 파일을 import 하면 main 이 돌아서 각자 적는다)
const TRAINING_PLAN_ID = "info-training";
const TRAINING_ACTIVITY_ID = "microbit-makecode__training";
const LESSON_NO = 901;

/** 단계 이름 - 차시와 장치가 보이게 */
const PHASE_LABELS: Partial<Record<LessonPhase, string>> = {
  problem: "① 빈칸 채우기·자동 힌트 (28·29차)",
  mvp: "② 형성평가 - 그리고(and) (30차)",
  build: "③ 좌우 비교 하이라이트 (31·32차)",
  grill: "④ 포털 AI·AI 기록 (32차)",
};
const PHASE_ORDER: LessonPhase[] = ["waiting", "problem", "mvp", "build", "grill", "reflection"];
/** 줌 창을 계속 오가므로 이탈은 어느 단계에서도 세지 않는다 */
const FOCUS_EXEMPT: LessonPhase[] = ["waiting", "mood", "problem", "mvp", "build", "grill", "reflection"];

const REFLECTION = "오늘 AI에게 맡기지 않고 내가 직접 판단한 것 하나는?";

/** 원본에서 가져올 문항: [차시, 원본 key, 새 key, 새 단계, 새 label, 새 hint] */
const PICKS: { lessonNo: number; from: string; key: string; phase: LessonPhase; label: string; hint: string; extra?: Partial<WorksheetQuestion> }[] = [
  {
    lessonNo: 28,
    from: "_mb28_m1",
    key: "_tr28_fill",
    phase: "problem",
    label: "28차 - 주인공을 좌우로 움직이기 (빈칸 2곳)",
    hint:
      "A 버튼(왼쪽)은 바로 아래 B 버튼(오른쪽) 줄을 거꾸로 생각해요.\n" +
      "✎ 빈칸만 채우고 다른 곳을 누르면, 틀린 칸에 규칙 힌트가 떠요.\n" +
      "다 맞으면 '완성 코드 복사'까지만 해요. 오늘은 MakeCode 는 건너뛰어요.",
  },
  {
    lessonNo: 29,
    from: "_mb29_m1",
    key: "_tr29_fill",
    phase: "problem",
    label: "더 해 보기 (29차) - 똥 한 개 떨어뜨리기 (빈칸 3곳)",
    hint:
      "시간이 남으면 해요. 똥 시작 칸 정하기 · 한 칸 아래로 · 똥 켜기.\n" +
      "막히면 「AI 도움」을 눌러요. 답 대신 생각할 방향만 알려 줘요.",
  },
  {
    lessonNo: 30,
    from: "mb30_and_q2",
    key: "tr30_and",
    phase: "mvp",
    label: "30차 - 이 상황, 부딪힐까요?",
    hint:
      "두 조건이 각각 참인지 거짓인지 고르고, and 로 묶은 결과도 골라요.\n" +
      "코드를 쓰기 전에, 그림만 보고 내 판단부터 확인해요.",
  },
  {
    lessonNo: 32,
    from: "_mb32_m2",
    key: "_tr31_choose",
    phase: "build",
    label: "31·32차 - 리스트로 정리하기 (보기 골라 채우기)",
    hint:
      "빈칸 네 곳을 보기에서 골라 「확인」을 눌러요.\n" +
      "왼쪽 옛 코드의 같은 색 줄이 '이 빈칸이 무엇을 대신하는지' 알려 줘요.\n" +
      "다 맞으면 '완성 코드 복사'까지만 해요.",
  },
  {
    lessonNo: 32,
    from: "mb32_vibe",
    key: "tr32_vibe",
    phase: "grill",
    label: "32차 - AI에게 기능 하나 부탁하기",
    hint: "기능은 한 번에 하나만, 무엇이 어떻게 되면 좋을지 적어요.",
  },
];

/** 연수용으로 새로 쓰는 안내 블록 (각 3줄 이내). imageFrom 은 원본 문항의 그림을 빌려 온다. */
const NOTES: { key: string; phase: LessonPhase; label: string; hint: string; imageFrom?: { lessonNo: number; key: string } }[] = [
  {
    key: "_tr_fill_note",
    phase: "problem",
    label: "학교 수업 28·29차 - 코드는 주어지고, 빈칸만 내가",
    hint:
      "중학교 1학년이 마이크로비트로 똥피하기를 만든 첫 장면이에요.\n" +
      "전체를 치지 않고 ★핵심 빈칸만★ 직접 채워요. 값과 명령을 고르는 판단이 학생 몫이에요.",
  },
  {
    key: "_tr_and_note",
    phase: "mvp",
    label: "학교 수업 30차 - 부딪힘은 '그리고(and)'",
    hint:
      "똥이 맨 아랫줄에 왔고, 그리고 주인공과 같은 칸이면 부딪힘이에요.\n" +
      "and 는 두 조건이 모두 참일 때만 참이에요.",
  },
  {
    key: "_tr_list_note",
    phase: "build",
    label: "학교 수업 31·32차 - 같은 일을 하는 두 코드 비교",
    hint:
      "31차: 똥이 늘 때마다 변수를 또 만들었더니 코드가 길어졌어요.\n" +
      "32차: 그 코드를 리스트와 반복으로 짧게 다시 써요. i 가 0, 1 로 바뀌며 똥을 하나씩 가리켜요.",
    imageFrom: { lessonNo: 32, key: "_mb32_m2_note" },
  },
  {
    key: "_tr_vibe_note",
    phase: "grill",
    label: "학교 수업 32차 - 포털 AI에게만 부탁해요",
    hint:
      "더하고 싶은 기능을 한 문장으로 부탁하면 AI가 전체 코드를 만들어요.\n" +
      "외부 AI는 쓰지 않아요. 보낸 말과 받은 코드는 모두 기록되고 선생님이 봐요.\n" +
      "받은 코드가 내 뜻대로인지 확인하는 것은 내 몫이에요.",
    imageFrom: { lessonNo: 32, key: "_mb32_vibe_intro" },
  },
];

const DASH = new RegExp("[\\u2014\\u2013]", "g");
/** 코드 첫 줄 "# 똥피하기 ⑦" 의 원문자 번호 (①~⑳) */
const MISSION_HEADER = new RegExp("^# 똥피하기 [\\u2460-\\u2473]", "m");

/** 문자열 안의 긴 대쉬·엔 대쉬를 짧은 하이픈으로 (코드 틀 주석·빈칸 힌트에 남은 옛 표기) */
function undash<T>(value: T): T {
  if (typeof value === "string") return value.replace(DASH, "-") as T;
  if (Array.isArray(value)) return value.map((v) => undash(v)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, undash(v)])) as T;
  }
  return value;
}

/** 지난 차시 기록에 기대는 필드가 있으면 멈춘다 (외부인은 지난 기록이 없다) */
function assertNoEcho(questions: WorksheetQuestion[]): void {
  const risky = ["echoKey", "echoKeys", "prefill", "vibeContinue", "vibeContinueFromKey"];
  for (const q of questions) {
    const raw = q as unknown as Record<string, unknown>;
    const hit = risky.filter((f) => raw[f] !== undefined && raw[f] !== false);
    if (hit.length) throw new Error(`${q.key} 에 지난 기록 의존 필드가 있습니다: ${hit.join(", ")}`);
    if (q.kind === "echo") throw new Error(`${q.key} 는 echo 문항입니다.`);
    if (/\{mb\d+_[A-Za-z0-9_]+\}/.test(JSON.stringify(q))) throw new Error(`${q.key} 가 다른 답 키를 끼워 넣습니다.`);
  }
}

async function sourceWorksheet(lessonNo: number): Promise<WorksheetQuestion[]> {
  const found = await db.collection("lessonPlans").where("lessonNo", "==", lessonNo).get();
  const main = found.docs.find((d) => !(d.data() as { variant?: string }).variant);
  if (!main) throw new Error(`${lessonNo}차 본 계획이 없습니다.`);
  const plan = main.data() as LessonPlan;
  if (!plan.title.includes("똥피하기")) throw new Error(`${lessonNo}차 제목이 똥피하기가 아닙니다: ${plan.title}`);
  return plan.activity?.worksheet ?? [];
}

async function buildPlan() {
  const cache = new Map<number, WorksheetQuestion[]>();
  const sheet = async (n: number) => {
    if (!cache.has(n)) cache.set(n, await sourceWorksheet(n));
    return cache.get(n)!;
  };

  const picked = new Map<string, WorksheetQuestion>();
  for (const p of PICKS) {
    const src = (await sheet(p.lessonNo)).find((q) => q.key === p.from);
    if (!src) throw new Error(`${p.lessonNo}차에 ${p.from} 문항이 없습니다.`);
    const copy = undash(structuredClone(src));
    // 코드 첫 줄 주석의 미션 번호(①③⑦⑧ 등, 학교 수업 안 번호)를 차시 번호로 바꾼다 - 연수 단계 이름(①~④)과 헷갈리지 않게.
    // 왼쪽 비교 코드(codeRefTemplate)는 31차 결과물이라 31차로 적는다. 줄 수는 그대로라 refLines 가 안 어긋난다.
    const tag = (n: number) => `# 똥피하기 (${n}차)`;
    if (copy.codeTemplate) copy.codeTemplate = copy.codeTemplate.replace(MISSION_HEADER, tag(p.lessonNo));
    if (copy.codeRefTemplate) copy.codeRefTemplate = copy.codeRefTemplate.replace(MISSION_HEADER, tag(31));
    picked.set(p.key, { ...copy, ...p.extra, key: p.key, phase: p.phase, label: p.label, hint: p.hint });
  }

  const notes = new Map<string, WorksheetQuestion>();
  for (const n of NOTES) {
    let image: Pick<WorksheetQuestion, "imageUrl" | "imageAlt"> = {};
    if (n.imageFrom) {
      const src = (await sheet(n.imageFrom.lessonNo)).find((q) => q.key === n.imageFrom!.key);
      if (src?.imageUrl) image = undash({ imageUrl: src.imageUrl, imageAlt: src.imageAlt });
    }
    notes.set(n.key, { key: n.key, phase: n.phase, label: n.label, hint: n.hint, kind: "note", maxLength: 0, ...image } as WorksheetQuestion);
  }

  // 단계별로 안내 → 활동 순서
  const order = ["_tr_fill_note", "_tr28_fill", "_tr29_fill", "_tr_and_note", "tr30_and", "_tr_list_note", "_tr31_choose", "_tr_vibe_note", "tr32_vibe"];
  const worksheet = order.map((k) => picked.get(k) ?? notes.get(k)).filter((q): q is WorksheetQuestion => Boolean(q));
  if (worksheet.length !== order.length) throw new Error("문항 조립이 덜 됐습니다.");
  assertNoEcho(worksheet);

  // 대기 화면(타자 링크)은 32차 것을 그대로 쓴다
  const p32 = await db.collection("lessonPlans").where("lessonNo", "==", 32).get();
  const main32 = p32.docs.find((d) => !(d.data() as { variant?: string }).variant)!.data() as LessonPlan;
  const empty = { heading: "", body: "", url: "" };

  const plan: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> & { variant: string } = {
    lessonNo: LESSON_NO,
    variant: "training",
    title: "교사 연수 체험 - 똥피하기 시리즈 다섯 장면",
    moodCheckEnabled: true,
    hideDoneButton: true,
    game: main32.game,
    gameExplainer: empty,
    progress: empty,
    assessment: empty,
    video: empty,
    reflectionQuestions: [REFLECTION],
    reflectionPublic: false,
    phaseOrder: PHASE_ORDER,
    phaseLabels: PHASE_LABELS,
    focusExempt: FOCUS_EXEMPT,
    freeNavigation: false,
    activity: {
      ...main32.activity!,
      places: [],
      activityId: TRAINING_ACTIVITY_ID,
      galleryEnabled: false,
      sourcesEnabled: false,
      worksheetIntro: {
        heading: "똥피하기 시리즈 다섯 장면 (중1 정보, 28~32차)",
        body:
          "① 빈칸 채우기 → ② 형성평가 → ③ 좌우 비교 → ④ 포털 AI → 한 줄 성찰\n" +
          "선생님이 단계를 넘기면 다 못 끝내도 괜찮아요.",
      },
      worksheet,
    },
  };
  return plan;
}

async function main(): Promise<void> {
  const plan = await buildPlan();
  const summary = plan.activity!.worksheet!.map((q) => `   [${q.phase}] ${q.kind} ${q.key} 「${q.label}」`).join("\n");
  const dashes = JSON.stringify(plan).match(DASH)?.length ?? 0;
  console.log(`계획: ${plan.title} (lessonNo ${plan.lessonNo}, activityId ${plan.activity!.activityId})`);
  console.log(`단계: ${plan.phaseOrder!.join(" → ")}  · 보상 게임 없음 · 되돌아가기 off · 이탈 면제 전 단계`);
  console.log(summary);
  console.log(`성찰: ${plan.reflectionQuestions.join(" / ")}`);
  console.log(`긴 대쉬 남은 개수: ${dashes}`);
  if (dashes > 0) throw new Error("긴 대쉬가 남아 있습니다.");

  if (DRY) {
    console.log("\n--dry: 쓰지 않았습니다.");
    process.exit(0);
  }

  const ref = db.collection("lessonPlans").doc(TRAINING_PLAN_ID);
  const now = Date.now();
  const existing = await ref.get();
  // set(merge 없이) - 지난 버전의 단계 이름·문항이 남지 않게 통째로 바꾼다
  await ref.set({
    ...plan,
    createdAt: existing.exists ? (existing.data()?.createdAt ?? now) : now,
    updatedAt: now,
  });
  console.log(`\n${existing.exists ? "↻ 갱신" : "＋ 등록"} - lessonPlans/${TRAINING_PLAN_ID}`);

  // 이미 연 연수 세션(예정·진행 중)에도 내용만 반영한다. 참가자가 들어온 세션은 --force 때만.
  const live = await db.collection("classSessions").where("lessonPlanId", "==", TRAINING_PLAN_ID).get();
  let applied = 0;
  for (const s of live.docs) {
    const status = (s.data() as { status?: string }).status;
    if (status !== "scheduled" && status !== "active") continue;
    const joined = await db.collection("attendance").where("sessionId", "==", s.id).limit(1).get();
    if (!joined.empty && !FORCE) {
      console.log(`· ${s.id} - 이미 참가자가 들어와 있어 건드리지 않습니다 (--force 로 덮어쓸 수 있습니다)`);
      continue;
    }
    await s.ref.set(
      {
        title: plan.title,
        moodCheckEnabled: plan.moodCheckEnabled,
        hideDoneButton: plan.hideDoneButton,
        game: plan.game,
        gameExplainer: plan.gameExplainer,
        rewardGame: null,
        assessment: plan.assessment,
        video: plan.video,
        reflectionQuestions: plan.reflectionQuestions,
        reflectionPublic: plan.reflectionPublic,
        focusExempt: plan.focusExempt,
        phaseOrder: plan.phaseOrder,
        freeNavigation: plan.freeNavigation,
        activity: plan.activity,
      },
      { merge: true },
    );
    await s.ref.update({ phaseLabels: plan.phaseLabels });
    applied += 1;
  }
  console.log(`   열린 연수 세션 ${applied}개에 반영`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
