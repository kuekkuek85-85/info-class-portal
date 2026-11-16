/**
 * 「인간과 인공지능」 5차시 · 화요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-hai5-tue2.ts
 *   node --env-file=.env.local scripts/open-hai5-tue2.ts 2026-11-17 1
 *
 * open-hai5-tue1.ts 를 복제해 **화요일 2기**로 맞춘 것이다. 바꾼 것은 분반 값 넷뿐:
 * GROUP_KEY(hai-tue-2) · GROUP_LABEL(화요일 2기) · CLASS_NO(2) · 기본 날짜(2026-11-17).
 * 세션 ID 는 `${날짜}__${교시}__hai-tue-2`. 활동 통(hai-2026-1기)·계획(105)은 그대로라,
 * 화2기가 2·3·4차시에 낸 앱 링크(build_url)가 오늘 동료 검토에 그대로 올라간다.
 *
 * ## 여기서 반드시 지켜야 하는 두 가지
 *
 *  1. **분반 캔바 주소를 하나만 남긴다.** 계획에는 네 분반 주소가 다 들어 있는데,
 *     그대로 복사하면 학생 화면에 남의 분반 초대 토큰이 실려 간다. 토큰만 있으면
 *     누구나 그 캔바 팀에 들어온다 (snapshotOf 의 resolveGroupLinks 와 같은 규칙).
 *  2. **코드가 이미 쓰이고 있지 않은지 본다.** 두 자리 코드는 90개뿐이고, 끝나지
 *     않은 수업이 쥐고 있으면 학생이 남의 수업에 들어간다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

const LESSON_NO = 105;
const GROUP_KEY = "hai-tue-2";
const GROUP_LABEL = "화요일 2기";
/** 화면에 안 보이는 데이터 통 번호. 2·3·4차시와 같아야 지난 답·앱이 열린다 */
const CLASS_NO = 2;
const DATE = process.argv[2] ?? "2026-11-17";
const PERIOD = Number(process.argv[3] ?? 1);

/**
 * 접속 직후 '앱 게시 링크 제출' 모달을 띄울 학번.
 *
 * 지난 차시에 링크를 못 냈거나(권지용·박동은·이준용) 죽은 링크를 낸(정아윤) 4명만 콕 집는다.
 * 이 학번으로 로그인한 학생에게만 모달이 뜨고, 제출하면 build_url 로 저장된다(LinkPromptModal).
 * 목록에 없는 학생·다른 세션에는 영향이 없다.
 */
const LINK_PROMPT_STUDENT_IDS = ["10603", "10711", "10720", "10622"];

/**
 * 세션 문서 ID — db.ts 의 sessionDocId 와 **같은 규칙이어야 한다.**
 *
 * `${날짜}__${교시}__${분반열쇠 || 반}` 이다. 분반 수업에서 반 번호를 쓰면
 * 같은 날 같은 교시의 정보과 수업과 문서 ID 가 겹친다 — 분반은 데이터 통으로
 * classNo 1~4 를 나눠 쓰기 때문이다.
 */
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

/**
 * 안 쓰이는 두 자리 코드를 고르고 **예약까지 한다.**
 *
 * 예약 문서를 안 남기면 교사 화면에서 다음 수업을 만들 때 reserveCode 가 이 코드를
 * 비어 있는 것으로 보고 같은 값을 내준다. 그러면 학생이 남의 수업에 들어간다.
 */
async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
      // create 라서 이미 예약돼 있으면 던진다 — 두 스크립트가 동시에 같은 코드를 못 잡는다
      await db.collection("codeReservations").doc(`${DATE}__${code}`).create({
        date: DATE,
        code,
        createdAt: Date.now(),
      });
      return code;
    } catch {
      // 이미 예약된 코드다. 다음 것으로 넘어간다
    }
  }
  throw new Error("남은 코드가 없습니다. 끝난 수업을 정리해 주세요.");
}

async function main(): Promise<void> {
  const plans = await db.collection("lessonPlans").where("lessonNo", "==", LESSON_NO).get();
  if (plans.empty) {
    console.error("✗ 105차시 계획이 없습니다. 먼저 scripts/seed-hai5.ts 를 돌리세요.");
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string; lessonNo: number };
    console.log(`이미 있습니다 — ${SESSION_ID}  코드 ${s.code}  ${s.lessonNo}차시  ${s.status}`);
    process.exit(0);
  }

  /*
   * 이 분반 주소 하나만 남긴다. 나머지는 통째로 지운다 —
   * 화면으로 내려가는 문서에 남의 분반 토큰이 남아 있으면 안 된다.
   */
  const activity = p.activity as { worksheet?: Record<string, unknown>[] } | undefined;
  const worksheet = (activity?.worksheet ?? []).map((q) => {
    const byGroup = q.linkUrlByGroup as Record<string, string> | undefined;
    if (!byGroup) return q;
    const rest = { ...q };
    delete rest.linkUrlByGroup;
    const picked = byGroup[GROUP_KEY] ?? (q.linkUrl as string | undefined);
    return picked ? { ...rest, linkUrl: picked } : rest;
  });

  const code = await pickCode();

  await db.collection("classSessions").doc(SESSION_ID).set({
    id: SESSION_ID,
    lessonPlanId: plan.id,
    lessonNo: LESSON_NO,
    title: p.title,
    classNo: CLASS_NO,
    groupKey: GROUP_KEY,
    groupLabel: GROUP_LABEL,
    date: DATE,
    period: PERIOD,
    code,
    status: "scheduled",
    phase: "waiting",
    rehearsal: false,
    teacherNote: "",
    startedAt: null,
    endedAt: null,
    activity: { ...activity, worksheet },
    moodCheckEnabled: p.moodCheckEnabled,
    game: p.game,
    gameExplainer: p.gameExplainer,
    progress: p.progress,
    assessment: p.assessment,
    video: p.video,
    videoPrompts: [],
    reflectionQuestions: p.reflectionQuestions,
    reflectionPublic: p.reflectionPublic,
    phaseLabels: p.phaseLabels ?? {},
    focusExempt: p.focusExempt ?? [],
    freeNavigation: p.freeNavigation ?? false,
    // 접속 직후 링크 제출 모달 대상 (지난 차시 링크 미제출·죽은 링크 4명)
    linkPromptStudentIds: LINK_PROMPT_STUDENT_IDS,
  });

  // 읽어서 확인한다. 반쪽만 써진 문서가 남는 사고를 겪은 적이 있다
  const back = (await db.collection("classSessions").doc(SESSION_ID).get()).data() as
    | Record<string, unknown>
    | undefined;
  if (!back?.code) {
    console.error("✗ 문서가 제대로 안 써졌습니다.");
    process.exit(1);
  }

  const dumped = JSON.stringify(back.activity);
  const act = back.activity as
    | { peerAssign?: string; peerCount?: number; galleryAssignedOnly?: boolean; galleryEnabled?: boolean }
    | undefined;
  console.log(`✓ 열림  ${SESSION_ID}`);
  console.log(`  ${DATE} ${PERIOD}교시 · ${GROUP_LABEL} · ${LESSON_NO}차시`);
  console.log(`  수업 코드  ${back.code}`);
  console.log(`  상태 ${back.status} · 단계 ${back.phase} · 되돌아가기 ${back.freeNavigation ? "켬" : "끔"}`);
  console.log(`  남의 분반 토큰 실림  ${dumped.includes("linkUrlByGroup") ? "예 ← 문제" : "아니오"}`);
  console.log(
    `  동료 검토  ${act?.galleryEnabled ? "켬" : "끔"} · 배정 ${act?.peerAssign ?? "cyclic"}` +
      ` ${act?.peerCount ?? 2}편` +
      ` · ${act?.galleryAssignedOnly ? "배정만 노출(자유 선택 없음)" : "전체 + 자유 선택"}`,
  );
  console.log(`  대기 게임  ${(back.game as { heading?: string })?.heading ?? "없음"}`);
  console.log(`  링크 제출 모달 대상  ${JSON.stringify(back.linkPromptStudentIds ?? [])}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
