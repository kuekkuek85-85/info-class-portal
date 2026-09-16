/**
 * 「디지털 마음 톡톡」 5회기(대인관계) — 목요일 1기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-mt5-thu1.ts
 *
 * ## 왜 따로 여는가 — 세션은 7교시 하나로, 분반 토큰은 목요일 1기 것만
 *
 * 5회기는 6·7교시 90분 블록이다. 마음 톡톡 관례대로 세션은 **7교시로 하나만** 연다
 * (6교시로 열면 코드가 6교시 끝에 만료돼 뒷시간에 학생이 못 들어온다). 세션 문서 ID 는
 * 날짜__7__mt-thu-1 이라 같은 교시 정보과 수업과 겹치지 않는다.
 *
 * ## ★ 스냅샷을 빠짐없이 — snapshotOf 와 같은 목록 + phaseOrder
 *
 * 원칙적으로는 공유 헬퍼 `snapshotOf(plan, "mt-thu-1")`(src/lib/db.ts)를 그대로 쓰는 게
 * 가장 안전하다(교사 대시보드의 세션 생성도 그걸 쓴다). 그런데 이 스크립트는 firebase-admin
 * 을 직접 초기화하는 **단독 node 실행**이고, db.ts 는 맨 위에서 `import "server-only"` 를
 * 한다 — 그 패키지는 Next 번들러가 갈아끼우는 것이라 node_modules 에 실물이 없어, 스크립트가
 * db.ts 를 import 하면 모듈 해석 단계에서 바로 터진다(게다가 db.ts 는 서버용 firebase 싱글턴도
 * 끌어온다). 그래서 여기서는 snapshotOf 를 **부르지 못하고**, 대신 그 필드 목록을 그대로 옮겨 적는다.
 *
 * ⚠ 한 가지 덧댐: snapshotOf 자체가 **phaseOrder 를 복사하지 않는다.** 5회기 계획은
 * 착시 영상(video)을 토끼/오리(assessment) 앞에 두려고 phaseOrder 를 쓰므로(seed-mt5.ts),
 * 이걸 빠뜨리면 교사 대시보드의 단계 버튼 순서가 어긋난다. 그래서 아래 planContent 는
 * **snapshotOf 목록 전부 + phaseOrder** 를 담는다. quiz(문항별 group·media·mediaWhileVoting
 * 포함)·phaseLabels·galleryEnabled(activity 안)도 전부 그 안에 들어간다.
 *
 * planContent 는 한 번만 만들어 **create 와 idempotent update 두 분기에 똑같이** 쓴다.
 * (open-mt2-thu1 은 update 분기 목록에서 quiz·phaseOrder 가 빠져 있었다 — 여기서는 그 갈라짐을 없앤다.)
 *
 * ## 프라이버시 — galleryEnabled 는 계획대로 false 로 못박는다
 *
 * 관점 성찰·문화 소감·마음일기 등 서술 칸은 친구에게 안 나간다. 서버 갤러리 라우트가
 * galleryEnabled 를 보고 응답 자체를 막으므로, 화면뿐 아니라 데이터로도 안 샌다. 계획이
 * 이미 false 지만 이 세션에서도 명시적으로 false 로 둔다.
 *
 * ## 멱등 — 이미 열려 있으면 내용만 갈아끼운다
 *
 * 교사가 대시보드에서 먼저 열어 둘 수 있다. 그때 지우고 새로 만들면 칠판에 적은 코드가
 * 바뀐다. 코드·상태·지금 단계·출석은 그대로 두고 계획에서 오는 부분(planContent)만 바꾼다.
 * teacherNote 는 update 분기에서 건드리지 않는다 — 교사가 목요일 세션에 이미 적어 둔 메모를
 * 덮으면 안 된다.
 *
 * ## 화요일 1기 메모 이어받기 (create 분기에서만)
 *
 * 교사가 화요일 1기(mt-tue-1) 5회기 세션에 적어 둔 교사 메모(teacherNote)를, 새로 여는
 * 목요일 1기 세션의 teacherNote 로 이어받는다. 화요일 세션이 없거나 메모가 비어 있으면
 * 그냥 빈 메모로 연다. update 분기에서는 손대지 않는다(위 참조).
 *
 * ## 활동 범위 — 계획의 단계를 전부 연다
 *
 * 5회기 계획에는 활동1(관점)·활동2(감정)·활동4(의사소통)·활동5(공감)이 모듈로 함께 들어
 * 있어 90분에는 벅차다. 그래도 기본값은 **전부 열고**, 교사가 대시보드에서 필요한 단추만
 * 눌러 진행하게 둔다. 시간상 미룰 후보가 있다면 아래 HOLD_PHASES 로 그 단계 문항을 빼
 * 대시보드에 단추가 안 생기게 할 수 있지만(open-mt2-thu1 방식), 그건 **선생님 확인 필요**라
 * 기본은 비워 둔다. (미룰 만한 후보: 활동4 wrapmap · 활동5 wrapheal — 마음일기 뒤 "얹는
 * 활동" 이라 이번 회기에서 자연스럽게 다음으로 넘길 수 있다.)
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const LESSON_NO = 205;
const GROUP_KEY = "mt-thu-1";
const GROUP_LABEL = "목요일 1기";
/** 분반마다 다른 데이터 통 번호 (계획의 groups 와 같아야 한다) */
const CLASS_NO = 2;
/** 6~7교시 블록. 7교시로 하나만 연다 — 6교시로 열면 코드가 중간에 만료된다 */
const PERIOD = 7;

/** 화요일 1기 세션에서 메모를 이어받을 때 원문 앞에 붙이는 짧은 표시 (원문은 그대로 보존) */
const TUE_NOTE_PREFIX = "[화요일 1기 메모] ";

/**
 * 이번 회기에 미루는 단계 — 기본은 비움(전부 연다).
 *
 * ⚠ 선생님 확인 필요: 90분이 벅차 특정 활동을 미루기로 하면, 그 단계 이름을 여기 넣는다.
 * 후보는 활동4(wrapmap)·활동5(wrapheal)다. 넣으면 그 단계 문항이 빠져 대시보드에 단추가
 * 안 생긴다(teacher/dashboard 의 availablePhase 는 문항 없는 단계에 버튼을 안 만든다).
 */
const HOLD_PHASES = new Set<string>([]);

/**
 * 계획에서 세션으로 복사되는 부분 — snapshotOf(src/lib/db.ts) 의 목록 + phaseOrder.
 *
 * create·update 두 분기가 이 한 곳을 똑같이 쓴다(갈라지지 않게). worksheet 은 분반 주소를
 * 그 분반 것 하나로 줄이고(resolveGroupLinks 와 같은 이유), galleryEnabled 는 false 로 못박는다.
 */
function planContent(
  plan: LessonPlan,
  kept: WorksheetQuestion[],
): Record<string, unknown> {
  return {
    lessonNo: plan.lessonNo,
    title: plan.title,
    moodCheckEnabled: plan.moodCheckEnabled,
    game: plan.game,
    gameExplainer: plan.gameExplainer,
    progress: plan.progress,
    assessment: plan.assessment,
    video: plan.video,
    videoPrompts: plan.videoPrompts ?? [],
    reflectionQuestions: plan.reflectionQuestions,
    reflectionPublic: plan.reflectionPublic,
    // 퀴즈도 스냅샷에 포함한다 — 문항별 group·media·mediaWhileVoting·nowText 가 여기 다 들어 있다.
    quiz: plan.quiz,
    // snapshotOf 가 빠뜨리는 필드. 착시 영상(video)을 토끼/오리(assessment) 앞에 두는 버튼 순서.
    phaseOrder: plan.phaseOrder ?? [],
    phaseLabels: plan.phaseLabels ?? {},
    focusExempt: plan.focusExempt ?? [],
    // 없으면 ignoreUndefinedProperties 로 안 실린다(팝업 없음).
    progressChecks: plan.progressChecks,
    freeNavigation: plan.freeNavigation ?? false,
    activity: {
      ...plan.activity,
      worksheet: kept,
      /*
       * 서로의 마음 읽기를 막는다 — 감정·의견 글은 친구에게 안 나간다. 서버 갤러리
       * 라우트가 이 값을 보고 응답 자체를 막는다(gallery/route.ts). 계획도 false 지만
       * 여기서도 명시해, 단추 하나 잘못 눌러 감정 글이 반 전체에 걸리는 일을 막는다.
       */
      galleryEnabled: false,
    },
  };
}

/** 화요일 1기 5회기 세션의 교사 메모를 가장 최근 것에서 읽는다 (create 분기에서만 쓴다). */
async function readTuesdayNote(): Promise<string> {
  const snap = await db
    .collection("classSessions")
    .where("lessonNo", "==", LESSON_NO)
    .where("groupKey", "==", "mt-tue-1")
    .get();
  if (snap.empty) return "";

  const rows = snap.docs
    .map((d) => d.data() as { date?: string; createdAt?: number; teacherNote?: string })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const note = String(rows[0]?.teacherNote ?? "").trim();
  return note;
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 205차시 계획이 없습니다. scripts/seed-mt5.ts 를 먼저 돌리세요.");
    process.exit(1);
  }
  const planDoc = plans.docs[0];
  const plan = planDoc.data() as LessonPlan;

  /* ── 활동지에서 (미루는 단계가 있으면) 덜어내고, 분반 캔바 주소를 하나로 줄인다 ── */
  const original = plan.activity?.worksheet ?? [];
  const kept: WorksheetQuestion[] = [];
  const held: string[] = [];
  let canvaLink = "";

  for (const q of original) {
    if (HOLD_PHASES.has(q.phase ?? "worksheet")) {
      held.push(q.key);
      continue;
    }

    const next: WorksheetQuestion = { ...q };

    // 분반 주소 표는 학생 화면에 내려보내지 않는다 (db.ts 의 resolveGroupLinks 와 같은 이유).
    // 남겨 두면 목요일 1기 학생 브라우저에 다른 분반 캔바 토큰까지 실려 간다.
    if (next.linkUrlByGroup) {
      const picked = next.linkUrlByGroup[GROUP_KEY];
      delete next.linkUrlByGroup;
      if (picked) {
        next.linkUrl = picked;
        canvaLink = picked;
      }
    }

    kept.push(next);
  }

  const content = planContent(plan, kept);

  /* ── 오늘 날짜(KST) ─────────────────────────────────────── */
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const id = `${today}__${PERIOD}__${GROUP_KEY}`;
  const existing = await db.collection("classSessions").doc(id).get();

  /*
   * 이미 열어 둔 수업이면 **내용만 갈아 끼운다.** 코드·상태·지금 단계·출석·teacherNote 는
   * 그대로 둔다(계획에서 오는 부분만 바꾼다).
   *
   * 학생이 벌써 미루려는 칸에 쓴 것이 있으면 멈춘다 — 그 단계를 빼는 것이 그 답을
   * 화면에서 지우는 일이 되기 때문. (HOLD_PHASES 가 비어 있으면 held 도 비어 안 걸린다.)
   */
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string };
    if (held.length > 0) {
      const arts = await db
        .collection("artifacts")
        .where("activityId", "==", plan.activity?.activityId ?? "")
        .get();
      const wroteHeld = arts.docs.filter((d) => {
        const a = d.data() as { classNo?: number; answers?: Record<string, string> };
        if (a.classNo !== CLASS_NO) return false;
        return held.some((k) => String(a.answers?.[k] ?? "").trim());
      });
      if (wroteHeld.length > 0) {
        console.error(`✗ 이미 ${wroteHeld.length}명이 미루려는 칸에 썼습니다. 바꾸지 않습니다.`);
        process.exit(1);
      }
    }

    // teacherNote 는 뺀다 — 교사가 목요일 세션에 이미 적어 둔 메모를 덮지 않는다.
    await db
      .collection("classSessions")
      .doc(id)
      .set({ lessonPlanId: planDoc.id, ...content }, { merge: true });
    console.log(`↻ 이미 열려 있던 수업(코드 ${s.code}, ${s.status})의 내용을 갈아 끼웠습니다`);
    report(id, s.code, kept, held, canvaLink, null);
    process.exit(0);
  }

  /* ── 새로 연다 ──────────────────────────────────────────── */
  const taken = new Set(
    (await db.collection("classSessions").get()).docs
      .map((d) => d.data() as { code?: string; status?: string; date?: string })
      .filter((s) => s.status !== "ended" || s.date === today)
      .map((s) => s.code),
  );
  let code = "";
  for (let n = 11; n <= 99; n += 1) {
    if (!taken.has(String(n))) {
      code = String(n);
      break;
    }
  }
  if (!code) {
    console.error("✗ 오늘 쓸 수 있는 수업 코드가 없습니다.");
    process.exit(1);
  }

  await db.collection("codeReservations").doc(`${today}__${code}`).set({
    date: today,
    code,
    createdAt: Date.now(),
  });

  // 화요일 1기 세션의 교사 메모를 이어받는다 (create 분기에서만).
  const tueNote = await readTuesdayNote();
  const teacherNote = tueNote ? `${TUE_NOTE_PREFIX}${tueNote}` : "";

  await db.collection("classSessions").doc(id).set({
    lessonPlanId: planDoc.id,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: today,
    period: PERIOD,
    code,

    // 계획에서 복사하는 것 (snapshotOf 목록 + phaseOrder + quiz)
    ...content,

    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    demo: false,
    teacherNote,
    startedAt: null,
    endedAt: null,
    createdAt: Date.now(),
  });

  console.log(`✓ ${GROUP_LABEL} ${PERIOD}교시 수업을 만들었습니다 (대기 상태)`);
  report(id, code, kept, held, canvaLink, tueNote);
  process.exit(0);
}

function report(
  id: string,
  code: string,
  kept: WorksheetQuestion[],
  held: string[],
  canvaLink: string,
  tueNote: string | null,
): void {
  console.log(`   ${id}`);
  console.log(`   수업 코드 ${code}\n`);

  // 교사 버튼 순서 = 계획의 phaseOrder. 세션에 실제로 들어간 그 순서를 그대로 보인다.
  console.log("교사 버튼 순서(phaseOrder): 대기 → 마음 체크인");
  console.log("  [활동1] 오늘 할 일 → 착시 영상 → 토끼?오리? 투표 → 관점 차이 → 문화별 감정 → 정리");
  console.log("  [활동2] 노래 맞히기 → 감정 추측(듣고 맞히기) → AI로 감정 분석 → 이미지 AI 체험");
  console.log("  [활동4] 효과적인 의사소통 → [활동5] 공감 문장·감정 대화 → 마음일기 → 마침\n");

  console.log(`활동지 문항 ${kept.length}개 · 퀴즈 문항 = 계획 quiz 그대로(토끼오리·노래10·감정추측3·AI감정3).`);
  if (held.length > 0) {
    console.log(`다음 회기로 미룬 칸 ${held.length}개: ${held.join(" · ")}`);
    console.log("  → 이 단계들은 대시보드에 단추 자체가 안 생깁니다.\n");
  } else {
    console.log("미룬 단계 없음 — 계획의 모든 단계를 열었습니다(교사가 대시보드에서 필요한 단추만 진행).\n");
  }

  const shown = canvaLink
    ? canvaLink.replace(/token=([^&]{4})[^&]*/, "token=$1…")
    : "없음 — 캔바 단추가 안 나옵니다";
  const which = process.env.CANVA_INVITE_MT_THU_1 ? "목요일 1기 전용" : "⚠ 기본 주소 (목요일 1기 전용 주소 없음)";
  console.log(`캔바 초대 주소: ${shown}  [${which}]`);

  if (tueNote === null) {
    console.log("화요일 1기 메모 이어받기: (해당 없음 — 이미 열려 있던 세션이라 teacherNote 는 건드리지 않음)");
  } else if (tueNote) {
    console.log("화요일 1기 메모 이어받기: 있음 — 화요일 1기 세션의 교사 메모를 목요일 세션 teacherNote 로 옮겼습니다.");
  } else {
    console.log("화요일 1기 메모 이어받기: 없음 — 화요일 1기 세션이 없거나 메모가 비어 빈 메모로 열었습니다.");
  }
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
