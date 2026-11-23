/**
 * 「인간과 인공지능」 6차시 · 화요일 2기 수업을 연다.
 *
 *   node --env-file=.env.local scripts/open-hai6-tue2.ts
 *   node --env-file=.env.local scripts/open-hai6-tue2.ts 2026-12-01 1
 *
 * open-hai6-tue1.ts 를 복제해 **화요일 2기**로 맞춘 것이다. 분반 값(GROUP_KEY hai-tue-2 ·
 * GROUP_LABEL 화요일 2기 · CLASS_NO 2 · 기본 날짜 2026-12-01)과 캔바 주소 고르기만 다르다.
 * (11/24 에 한 번 열었다가 교사 지시로 그 수업을 5차시 보충(seed-hai5b-tue2)으로 바꿨다.)
 * 발표자료는 교사가 낸 캔바 과제 링크(CANVA_SLIDES_ASSIGN_TUE_2, .env.local)가 있으면
 * ⑥ 템플릿 버튼 자리를 그 과제 링크로 바꾼다. 토큰이 화2기 초대 토큰과 다르면 멈춘다.
 * 세션 ID 는 `${날짜}__${교시}__hai-tue-2`. 활동 통(hai-2026-1기)·계획(106)은 그대로라,
 * 화2기가 2~5차시에 쓴 답·앱 링크·받은 피드백이 오늘 그대로 열린다.
 *
 * ## 여기서 반드시 지켜야 하는 세 가지
 *
 *  1. **분반 캔바 주소를 하나만 남긴다.** 계획의 linkUrlByGroup 표는 통째로 지운다.
 *  2. **106 계획에는 화2기 주소가 없다.** 계획을 9/22 에 심을 때 CANVA_INVITE_TUE_2 가
 *     아직 없어서 표에 tue-1·thu-1 만 있다. 그래서 계획의 기본 linkUrl 로 떨어지게 두지 않고
 *     .env.local 의 CANVA_INVITE_TUE_2 를 직접 쓴다. 없으면 열지 않고 멈춘다.
 *  3. **코드가 이미 쓰이고 있지 않은지 본다.** 끝나지 않은 수업이 쥐고 있으면
 *     학생이 남의 수업에 들어간다.
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

const LESSON_NO = 106;
const GROUP_KEY = "hai-tue-2";
const GROUP_LABEL = "화요일 2기";
/** 화면에 안 보이는 데이터 통 번호. 2~5차시와 같아야 지난 답·앱·받은 피드백이 열린다 */
const CLASS_NO = 2;
const DATE = process.argv[2] ?? "2026-12-01";
const PERIOD = Number(process.argv[3] ?? 1);

/**
 * 세션 문서 ID - db.ts 의 sessionDocId 와 **같은 규칙이어야 한다.**
 * `${날짜}__${교시}__${분반열쇠}` 이다 (분반은 데이터 통으로 classNo 1~4 를 나눠 쓴다).
 */
const SESSION_ID = `${DATE}__${PERIOD}__${GROUP_KEY}`;

/**
 * 안 쓰이는 두 자리 코드를 고르고 **예약까지 한다** (open-hai5 와 같은 이유).
 */
async function pickCode(): Promise<string> {
  const live = await db.collection("classSessions").where("status", "in", ["scheduled", "active"]).get();
  const taken = new Set(live.docs.map((d) => String((d.data() as { code?: string }).code ?? "")));

  for (let n = 10; n <= 99; n += 1) {
    const code = String(n);
    if (taken.has(code)) continue;
    try {
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
    console.error("✗ 106차시 계획이 없습니다. 먼저 scripts/seed-hai6.ts 를 돌리세요.");
    process.exit(1);
  }
  const plan = plans.docs[0];
  const p = plan.data() as Record<string, unknown>;

  const existing = await db.collection("classSessions").doc(SESSION_ID).get();
  if (existing.exists) {
    const s = existing.data() as { code: string; status: string; lessonNo: number };
    console.log(`이미 있습니다 - ${SESSION_ID}  코드 ${s.code}  ${s.lessonNo}차시  ${s.status}`);
    process.exit(0);
  }

  /*
   * 이 분반 주소 하나만 남긴다. 나머지는 통째로 지운다 -
   * 화면으로 내려가는 문서에 남의 분반 토큰이 남아 있으면 안 된다.
   */
  const activity = p.activity as { worksheet?: Record<string, unknown>[] } | undefined;
  const worksheet = (activity?.worksheet ?? []).map((q) => {
    const byGroup = q.linkUrlByGroup as Record<string, string> | undefined;
    if (!byGroup) return q;
    const rest = { ...q };
    delete rest.linkUrlByGroup;
    // 계획의 기본 linkUrl 로는 떨어지지 않는다 (남의 그룹 초대일 수 있다)
    const picked = byGroup[GROUP_KEY] || process.env.CANVA_INVITE_TUE_2 || "";
    if (!picked) {
      console.error("✗ 화요일 2기 캔바 초대 주소(CANVA_INVITE_TUE_2)가 없습니다. .env.local 을 확인하세요.");
      process.exit(1);
    }
    return { ...rest, linkUrl: picked };
  });

  // 발표자료 캔바 과제 링크 (교사가 준 것, 화2기 초대 + 과제로 바로 가기). 없으면 계획의 공용 템플릿 그대로
  const assign = process.env.CANVA_SLIDES_ASSIGN_TUE_2 ?? "";
  if (assign) {
    const tok = (u: string) => u.match(/token=([^&]+)/)?.[1] ?? "";
    if (tok(assign) !== tok(process.env.CANVA_INVITE_TUE_2 ?? "")) {
      console.error("✗ 발표자료 과제 링크의 토큰이 화요일 2기 초대 토큰과 다릅니다. 열지 않습니다.");
      process.exit(1);
    }
    for (let i = 0; i < worksheet.length; i += 1) {
      const q = worksheet[i];
      if (q.key !== "_l6_slides_intro") continue;
      worksheet[i] = {
        ...q,
        label: "⑥ 발표 슬라이드 만들기 - 선생님이 낸 캔바 과제를 열어 채워요",
        hint: String(q.hint ?? "").replace(
          /^아래 \[발표자료 템플릿 열기\] 를 누르면, 선생님이 준비한 발표용 슬라이드가 새 탭에 떠요\.\n그대로 고칠 수 있는 내 편집본이에요\./,
          "아래 [발표자료 과제 열기] 를 누르면 선생님이 낸 캔바 과제가 새 탭에 떠요.\n과제에서 시작하면 내 편집본이 생겨요.",
        ),
        linkUrl: assign,
        linkLabel: "발표자료 과제 열기 (새 탭)",
      };
    }
  }

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
    /*
     * 시작 단계를 'mood' 로 연다 (교사 확정 - 대기 단계를 흐름에서 뺀다).
     * 학생은 대기(waiting) 화면(게임/placeholder)을 지나지 않고, 기분 체크 →
     * 곧바로 grill(발표 자료 만들기: 캔바 로그인부터)로 넘어간다. moodCheckEnabled 가 true 라
     * mood 단계가 MoodPicker 를 띄운다.
     */
    phase: "mood",
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
    // 단계 버튼 순서. 6차 계획은 phaseOrder 로 대기를 흐름에서 뺀다 - 세션에 함께 실어 나른다
    // (snapshotOf 도 같은 값을 싣는다; 여기서도 실어 화면·open 세션이 같은 순서가 되게)
    ...(p.phaseOrder ? { phaseOrder: p.phaseOrder } : {}),
    focusExempt: p.focusExempt ?? [],
    freeNavigation: p.freeNavigation ?? false,
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
  console.log(`  남의 분반 토큰 실림  ${dumped.includes("linkUrlByGroup") ? "예 <- 문제" : "아니오"}`);
  const tue2 = process.env.CANVA_INVITE_TUE_2 ?? "";
  console.log(`  캔바 초대 = 화요일 2기 것  ${tue2 && dumped.includes(tue2) ? "예" : "아니오 <- 문제"}`);
  console.log(
    `  서로 구경하기  ${act?.galleryEnabled ? "켬" : "끔"} · 배정 ${act?.peerAssign ?? "cyclic"}` +
      ` ${act?.peerCount ?? 2}편` +
      ` · ${act?.galleryAssignedOnly ? "배정만 노출(자유 선택 없음)" : "전체 + 자유 선택"}`,
  );
  console.log(`  시작 단계  ${back.phase}${back.phase === "mood" ? " (대기 단계 건너뜀 - 기분 체크부터)" : ""}`);
  console.log(`  단계 순서(phaseOrder)  ${Array.isArray(back.phaseOrder) ? (back.phaseOrder as string[]).join(" → ") : "없음(LESSON_PHASES 기본)"}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
