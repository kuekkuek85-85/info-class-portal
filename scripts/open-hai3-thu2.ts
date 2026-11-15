/**
 * 「인간과 인공지능」 3차시(= 2기에게는 2차시) — 목요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-hai3-thu2.ts 2026-11-05 1 [--force]
 *
 * ## 무엇을 재사용하고 무엇을 바꿨나
 *
 * open-hai3-tue2.ts(화요일 2기 3차시)를 기준으로 하되, 목요일 2기(hai-thu-2 / classNo 4 /
 * CANVA_INVITE_THU_2)로 연다. 세션 ID 는 `${날짜}__${교시}__hai-thu-2`.
 * 바꾼 것은 분반(요일)뿐이다:
 *   GROUP_KEY  hai-tue-2 → hai-thu-2
 *   GROUP_LABEL 화요일 2기 → 목요일 2기
 *   CLASS_NO   2 → 4 (계획 groups 의 목요일 2기 통 번호, 102차시와 같아야 지난 답이 열린다)
 *   CANVA      화요일 2기 토큰 → 목요일 2기 토큰(CANVA_INVITE_THU_2, 없으면 기본 주소)
 *
 * ### 제출 방식 = A (교사 확인/발표형) — 교사 결정 (open-hai3-tue2.ts 와 동일)
 * 캔바 '게시(URL 뽑기)'를 학교 관리자가 막아, 1차시에서 링크 제출이 급감했다.
 * 그래서 103의 **게시 링크 제출(build_url)을 빼고**, 만든 화면을 **선생님께 직접 보여주는**
 * 것으로 바꾼다("보여줬나요?" 체크 + 교사 순회 확인). 관련 안내 문구("반드시 뽑는다 /
 * 링크 가져오기")도 "만들기 / 선생님께 보여주기"로 맞춘다. **세션에만** 반영한다(계획·배포 X).
 *
 * ### 표준 설정 (교사 지시)
 *  - freeNavigation **off** (캔바 예외는 교사 확정 전까지 off 유지)
 *  - hideDoneButton **on**
 *  - 기분 체크 **on**, 대기 게임 **없음** — 대기 화면은 마음 체크인만(게임으로 안 넘어감)
 *  - 기분 '단계'는 phaseOrder 로 숨긴다(1차시와 동일) — 대기 화면 기분 체크는 그대로
 *
 * ## 반드시 지키는 것
 *  - 분반별 캔바 주소 표(linkUrlByGroup)는 학생 화면에 안 내려보낸다(남의 분반 토큰 유출).
 *  - 코드가 이미 쓰이고 있지 않은지 보고 고른다.
 *  - 활동 ID 는 2차시(hai-2026-1기)와 같아 지난 답이 그대로 열린다(계획 103 그대로).
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldPath } from "firebase-admin/firestore";

import type { LessonPlan, WorksheetQuestion } from "../src/lib/types.ts";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다.`);
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

const LESSON_NO = 103;
const GROUP_KEY = "hai-thu-2";
const GROUP_LABEL = "목요일 2기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 하고, 2차시와 같아야 지난 답이 열린다) */
const CLASS_NO = 4;

const KST_TODAY = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
const DATE = process.argv[2] ?? KST_TODAY;
const PERIOD = Number(process.argv[3] ?? 1);

/** 캔바 초대 주소 — 목요일 2기 전용(없으면 기본 주소로 물러남) */
const CANVA_URL = process.env.CANVA_INVITE_THU_2 || process.env.CANVA_INVITE_URL || "";

/**
 * 제출 방식 A 로 워크시트를 바꾼다.
 *  - build_url(게시 링크 제출 칸) 제거
 *  - _build_publish(③ 링크 가져오기) → ③ 선생님께 보여주기 + 바로 뒤 "보여줬나요?" 체크
 *  - _l3_start(오늘은 반드시 뽑는다) 문구 → 만들기/보여주기
 *  - echo 카드의 build_url(내가 만든 화면 링크) 줄 제거 — 링크가 없으므로
 *  - 분반 캔바 토큰은 이 분반 것 하나만 남긴다
 */
function transform(questions: WorksheetQuestion[]): WorksheetQuestion[] {
  return questions
    .filter((q) => q.key !== "build_url")
    .flatMap((q): WorksheetQuestion[] => {
      let next: WorksheetQuestion = { ...q };

      if (next.linkUrlByGroup) {
        const picked = next.linkUrlByGroup[GROUP_KEY];
        delete next.linkUrlByGroup;
        // 분반 표에 이 분반 토큰이 있으면 그걸 쓴다. 없으면(계획이 오래돼 2기 토큰이
        // 안 실린 경우) 이 분반 전용 CANVA_URL(=CANVA_INVITE_THU_2)로 물러나, 기본
        // 주소가 아니라 목2기 초대가 학생에게 가게 한다. 둘 다 없을 때만 원래 linkUrl 유지.
        if (picked) next.linkUrl = picked;
        else if (CANVA_URL) next.linkUrl = CANVA_URL;
      }

      if (next.kind === "echo" && next.echoKeys) {
        next = { ...next, echoKeys: next.echoKeys.filter((e) => e.key !== "build_url") };
      }

      if (next.key === "_l3_start") {
        next.label = "오늘은 반드시 화면을 하나 만듭니다";
        next.hint =
          "지난 시간에 프롬프트까지는 거의 다 썼는데, 실제로 화면을 만든 사람은 몇 명뿐이었어요.\n" +
          "오늘의 목표는 딱 하나입니다 — 내 화면을 하나 만들어 선생님께 보여주는 것.\n" +
          "이미 만든 사람은 바로 아래 ‘살펴보기’ 로 가세요.\n" +
          "오늘도 일부러 대충 갑니다. 허접해도 됩니다 — 왜 허접한지 찾는 게 다음 순서예요.";
      }

      if (next.key === "_build_publish") {
        next.label = "③ 선생님께 보여주기 — 여기까지 해야 오늘 한 것이 됩니다";
        next.hint =
          "캔바 ‘게시(URL 뽑기)’ 는 지금 학교에서 막혀 있어요.\n" +
          "그 대신 만든 화면을 열어서 선생님께 직접 보여주세요 — 선생님이 돌아다니며 확인합니다.\n" +
          "보여줬으면 아래 칸에 표시해 주세요.";
        return [
          next,
          {
            key: "shown_teacher",
            phase: "build",
            label: "선생님께 보여줬나요?",
            hint: "",
            kind: "choice",
            choices: ["네, 보여줬어요", "아직이요 — 선생님을 부를게요"],
            maxLength: 0,
          } as WorksheetQuestion,
        ];
      }

      return [next];
    });
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 103차시 계획이 없습니다. scripts/seed-hai3.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const planDoc = plans.docs[0];
  const plan = planDoc.data() as LessonPlan;

  const worksheet = transform(plan.activity?.worksheet ?? []);

  /* ── 코드 정하기 + (있으면) 강제 재오픈 (open-hai3-tue2.ts 와 같은 로직) ── */
  const FORCE = process.argv.includes("--force");
  const id = `${DATE}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  let code = "";

  if (existing.exists) {
    const ex = existing.data() as { code: string; status: string; activity?: { activityId?: string } };
    if (!FORCE) {
      console.error(`✗ ${id} 가 이미 있습니다 (코드 ${ex.code}, ${ex.status}).`);
      console.error("  강제 재오픈하려면 --force 를 붙이세요 (테스트/빈 세션만). 대시보드에서 지워도 됩니다.");
      process.exit(1);
    }

    // 안전장치: 이 세션 ID 에 출석이 있으면(이미 진행된 수업일 수 있음) 멈춘다.
    // ※ 답 기반이 아니라 출석 기반인 이유: 이 통(classNo 4)에는 1차시(102) 답이 정상적으로
    //    누적돼 있어, "답 있으면 멈춤"을 쓰면 늘 막힌다. 강제 재오픈은 세션 범위 기록만
    //    지우고 작품(artifacts)은 손대지 않으므로 지난 답은 보존된다.
    const att = await db
      .collection("attendance")
      .where(FieldPath.documentId(), ">=", `${id}__`)
      .where(FieldPath.documentId(), "<", `${id}__`)
      .get();
    if (att.size > 0) {
      console.error(`✗ 강제 재오픈 중단 — ${id} 에 출석 ${att.size}건(이미 진행된 수업일 수 있음).`);
      console.error("  코디네이터에게 먼저 알리세요.");
      process.exit(1);
    }

    for (const col of ["attendance", "moodEntries", "reflections", "quizAnswers"]) {
      const snap = await db
        .collection(col)
        .where(FieldPath.documentId(), ">=", `${id}__`)
        .where(FieldPath.documentId(), "<", `${id}__`)
        .get();
      for (const d of snap.docs) await d.ref.delete();
      if (snap.size) console.log(`  정리: ${col} ${snap.size}건 삭제`);
    }

    code = String(ex.code);
    await existing.ref.delete();
    await db.collection("codeReservations").doc(`${DATE}__${code}`).delete().catch(() => {});
    await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
    console.log(`  강제 재오픈 — 코드 ${code} 유지`);
  } else {
    const live = (await db.collection("classSessions").get()).docs
      .map((d) => d.data() as { code: string; status: string; date: string })
      .filter((s) => s.status !== "ended" || s.date === DATE);
    const taken = new Set(live.map((s) => s.code));
    for (let n = 11; n <= 99; n += 1) {
      if (!taken.has(String(n))) {
        code = String(n);
        break;
      }
    }
    if (!code) {
      console.error("✗ 쓸 수 있는 수업 코드가 없습니다.");
      process.exit(1);
    }
    await db.collection("codeReservations").doc(`${DATE}__${code}`).create({ date: DATE, code, createdAt: Date.now() });
  }

  await db.collection("classSessions").doc(id).set({
    lessonPlanId: planDoc.id,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: DATE,
    period: PERIOD,
    code,

    lessonNo: plan.lessonNo,
    title: plan.title,
    // 표준: 기분 체크 on, 대기 게임 없음 — 대기 화면은 마음 체크인만(게임으로 안 넘어감)
    moodCheckEnabled: true,
    game: { heading: "", body: "", url: "" },
    gameExplainer: plan.gameExplainer,
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    videoPrompts: plan.videoPrompts ?? [],
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    quiz: plan.quiz,
    focusExempt: plan.focusExempt ?? [],

    // 제출 방식 A 로 바꾼 활동지 (galleryEnabled=false 등 나머지는 계획 그대로)
    activity: { ...plan.activity, worksheet },
    phaseLabels: plan.phaseLabels ?? {},
    // 기분 '단계'는 숨긴다(대기 화면 기분 체크는 유지). 103 단계 순서대로 나열, mood 제외.
    phaseOrder: ["waiting", "progress", "build", "grill", "worksheet", "emotion", "reflection"],

    // 표준: 되돌아가기 off, '다 했어요' 단추 숨김 on
    freeNavigation: false,
    hideDoneButton: true,

    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    demo: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  const back = (await db.collection("classSessions").doc(id).get()).data() as Record<string, unknown> | undefined;
  const dumped = JSON.stringify(back?.activity ?? {});
  const hasBuildUrl = dumped.includes('"build_url"');
  const hasShown = dumped.includes('"shown_teacher"');

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 (${LESSON_NO}차시 = 2기 2차시) 수업을 만들었습니다`);
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code} · 상태 ${back?.status} · classNo ${CLASS_NO}`);
  console.log(`   되돌아가기 ${back?.freeNavigation ? "켬" : "끔"} · 다했어요 단추 ${back?.hideDoneButton ? "숨김" : "보임"} · 기분체크 ${back?.moodCheckEnabled ? "켬" : "끔"}`);
  console.log(`   대기 게임: ${(back?.game as { url?: string })?.url ? (back?.game as { heading?: string })?.heading : "없음 (대기 화면 = 마음 체크인만)"}`);
  console.log(`   제출 방식 A: build_url 제거=${!hasBuildUrl ? "OK" : "✗ 남아있음"} · shown_teacher 추가=${hasShown ? "OK" : "✗ 없음"}`);
  console.log(`   남의 분반 토큰 실림: ${dumped.includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log(`   phaseOrder=${JSON.stringify(back?.phaseOrder)} (mood 없음)`);

  const shown = CANVA_URL ? CANVA_URL.replace(/token=([^&]{4})[^&]*/, "token=$1…") : "없음";
  const which = process.env.CANVA_INVITE_THU_2 ? "목요일 2기 전용" : "⚠ 기본 주소";
  console.log(`   캔바 초대: ${shown}  [${which}]`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
