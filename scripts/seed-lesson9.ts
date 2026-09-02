/**
 * 9차시 차시 계획 등록 — 「디지털 윤리 ① 개인정보 보호」.
 *
 *   node --env-file=.env.local scripts/seed-lesson9.ts
 *
 * ## 이 차시는 슬라이드가 주인공이다
 *
 * 전년도 슬라이드 23장이 이미 있다. 포털이 그것을 옮겨 담을 이유가 없다 — 옮기면
 * 두 벌이 되고, 고칠 때마다 어느 쪽이 최신인지 알 수 없게 된다. 포털은 슬라이드가
 * 못 하는 것만 맡는다.
 *
 *   · 기분 체크와 출석
 *   · 활동 주소를 **누를 수 있게** 주기 (칠판의 bit.ly 를 손으로 옮겨 적으면 5분이 간다)
 *   · 활동 1을 하고 나서 한 칸 쓰기 — 들은 것과 아는 것을 가르는 자리
 *   · 성찰
 *
 * ## 활동 하나는 죽었다
 *
 * 슬라이드 18의 마스킹 체험(뤼튼 스토어)은 **도메인 자체가 없어졌다**(store.wrtn.ai).
 * 그래서 빼고 둘만 남긴다. 나머지 둘은 확인했다 — wordwall 퀴즈와 security.org 는
 * 살아 있고 로그인도 필요 없다.
 *
 * ## 진짜 비밀번호를 넣게 하지 않는다
 *
 * 슬라이드 19는 "자신의 비밀번호를 테스트해보세요" 라고 한다. 그런데 오늘 수업이
 * 가르치는 것이 바로 **모르는 사이트에 비밀번호를 넣지 말라**는 것이다. 시키는 대로
 * 하면 수업이 스스로를 뒤집는다. 학생도 그 모순을 알아챈다.
 *
 * 그래서 "길이와 모양만 비슷한 가짜를 넣어 보라" 로 바꾼다. 충격은 그대로 남고
 * (여덟 자리 소문자가 몇 초에 뚫리는 것은 진짜든 가짜든 같다), 모순은 사라진다.
 * 오히려 "왜 진짜를 넣으면 안 될까" 가 그 자리에서 생기는 질문이 된다.
 *
 * ## 수행평가 재료는 여기서 안 모은다
 *
 * 원래 끝 10분에 원인·피해 두 칸을 두려 했다가 뺐다. 슬라이드 23장에 활동까지 있어
 * 40분이 빠듯하다. 대신 성찰 한 문항이 그 자리를 가볍게 대신한다 — 11차시에 쓸 때
 * 자기가 쓴 한 줄을 다시 열어 보면 된다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import type { LessonPlan, PhaseContent, WorksheetQuestion } from "../src/lib/types.ts";

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
const LESSON_NO = 9;

/**
 * 새 활동 통. 기사(career-plan)와 **섞지 않는다.**
 *
 * 같은 통에 넣으면 어제 통과받은 스물넷의 "끝났다" 가 풀린다 — 게임 화면이 활동지로
 * 되돌아가고, 판정도 다시 계산된다. 9·10·11차시는 이 통을 함께 쓰므로, 오늘 쓴 한 줄이
 * 11차시 수행평가 화면에서 그대로 열린다.
 */
const ACTIVITY_ID = "digital-ethics";

function empty(): PhaseContent {
  return { heading: "", body: "", url: "" };
}

const WORKSHEET: WorksheetQuestion[] = [
  {
    key: "_pi_note",
    phase: "worksheet",
    label: "오늘은 화면으로 함께 봅니다",
    hint:
      "설명은 앞 화면으로 같이 봐요. 이 화면에서는 두 가지만 합니다.\n\n" +
      "· 아래 두 활동을 눌러서 해 보기\n" +
      "· 활동 1을 하고 나서 한 칸 쓰기",
    kind: "note",
    maxLength: 0,
  },

  {
    key: "_pi_quiz",
    phase: "worksheet",
    label: "활동 1 · 이건 개인정보일까?",
    hint: "두 개 중에서 개인정보인 쪽을 고르는 퀴즈입니다. 새 창으로 열려요.",
    kind: "note",
    linkUrl: "https://wordwall.net/ko/resource/73876091",
    linkLabel: "퀴즈 열기",
    maxLength: 0,
  },

  /*
   * 한 칸은 반드시 쓰게 한다.
   *
   * 하나는 수업 설계 때문이다 — 퀴즈는 손이 먼저 움직여서, 끝나고 나면 무엇을 왜
   * 틀렸는지 안 남는다. 헷갈린 것 하나를 적게 하면 그 자리에서 정리가 된다.
   *
   * 다른 하나는 화면 때문이다. 쓸 칸이 하나도 없는 활동지에도 「다 했어요」 는 뜨는데,
   * 누르면 "활동지를 한 칸이라도 채워 주세요" 가 뜬다. 아무도 못 내는 화면이 된다.
   */
  {
    key: "pi_confuse",
    phase: "worksheet",
    label: "퀴즈에서 헷갈렸던 것 하나",
    hint:
      "무엇이 헷갈렸는지, 그리고 지금은 어느 쪽이라고 생각하는지 적어 주세요.\n" +
      "예) 학교 이름이 헷갈렸다. 그것만으로는 나를 못 찾지만 반·번호와 합치면 찾을 수 있으니 개인정보인 것 같다.",
    kind: "long",
    maxLength: 300,
  },

  {
    key: "_pi_password",
    phase: "worksheet",
    label: "활동 2 · 이 비밀번호는 얼마나 버틸까",
    /*
     * 경고를 안내의 맨 앞에 둔다. 뒤에 붙이면 이미 자기 비밀번호를 치고 난 뒤에 읽는다.
     */
    hint:
      "진짜 비밀번호는 넣지 마세요. 오늘 배우는 것이 바로 그것입니다.\n\n" +
      "길이와 모양만 비슷한 가짜를 만들어 넣어 보세요.\n" +
      "예) 진짜가 영문 소문자 여덟 자리라면 → abcdefgh\n\n" +
      "그다음 대문자·숫자·기호를 하나씩 섞어 가며 시간이 어떻게 바뀌는지 보세요.",
    kind: "note",
    linkUrl: "https://www.security.org/how-secure-is-my-password/",
    linkLabel: "테스트 열기",
    maxLength: 0,
  },
];

const PLAN: Omit<LessonPlan, "id" | "createdAt" | "updatedAt"> = {
  lessonNo: LESSON_NO,
  /*
   * 「디지털 시민 리포트」 를 안 쓴다.
   *
   * 그 이름은 진로 기사에 붙어 있고, 어제 스물넷이 그것을 끝냈다. 오늘 같은 이름이
   * 뜨면 "끝난 걸 또 하나" 로 읽힌다. 셋(9·10·11차시)이 한 묶음인 것은 번호로 보인다.
   */
  title: "디지털 윤리 ① — 개인정보 보호",
  moodCheckEnabled: true,

  game: {
    heading: "기다리는 동안 — 하노이탑",
    body:
      "원반을 한 번에 하나씩 옮겨서, 큰 것이 작은 것 위에 올라가지 않게 다 옮기면 됩니다.\n수업이 시작되면 닫습니다.",
    url: "https://hanoi-tower-game-rosy.vercel.app/",
  },
  gameExplainer: empty(),
  progress: empty(),
  video: empty(),

  assessment: {
    heading: "오늘 할 일 — 개인정보 보호",
    body: "",
    url: "",
    tabs: [
      {
        label: "오늘 배울 것",
        subtitle: "개인정보가 무엇이고, 어떻게 지키는가",
        note: "설명은 앞 화면으로 같이 봅니다.",
        rows: [
          { label: "① 개인정보란", value: "무엇이 개인정보인지, 어떤 종류가 있는지" },
          { label: "② 어떻게 빼앗기나", value: "피싱 · 파밍 · 스미싱 · 보이스피싱" },
          { label: "③ 어떻게 지키나", value: "보호 수칙과 안전한 비밀번호" },
        ],
        highlights: [
          "하나만으로는 누군지 몰라도, 다른 것과 합치면 알 수 있으면 그것도 개인정보입니다.",
        ],
      },
      {
        label: "함께 해 볼 것",
        subtitle: "활동 두 가지",
        note: "활동지 화면의 단추로 열립니다. 주소를 손으로 적지 않아도 돼요.",
        rows: [
          { label: "활동 1", value: "이건 개인정보일까? — 둘 중 고르는 퀴즈" },
          { label: "활동 2", value: "이 비밀번호는 얼마나 버틸까 — 뚫리는 시간 보기" },
        ],
        highlights: [
          "활동 2에 진짜 비밀번호를 넣지 마세요. 길이와 모양만 비슷한 가짜로 해 보세요.",
        ],
      },
    ],
  },

  /*
   * 성찰 한 문항.
   *
   * "오늘 무엇을 배웠나" 로 묻지 않는다. 그렇게 물으면 슬라이드 제목을 옮겨 적는다.
   * **나에게 있을 법한 것**을 고르고 이유를 대라고 하면, 오늘 배운 넷을 자기 생활에
   * 한 번씩 대 봐야 답이 나온다. 그 한 줄이 11차시에 쓸 때의 출발점이 되기도 한다.
   */
  reflectionQuestions: [
    "오늘 배운 것(피싱·파밍·스미싱·보이스피싱·오픈카톡방) 중에서 나에게 가장 있을 법한 것은 무엇인가요? 왜 그렇게 생각하나요?",
  ],
  reflectionPublic: false,

  /*
   * 활동 두 개가 다 바깥 사이트다. 이탈로 세면 반 전체가 빨간 신호등이 되고,
   * 그 화면을 본 선생님은 아무 판단도 못 한다 (5·6차시와 같은 이유).
   */
  focusExempt: ["worksheet"],
  phaseLabels: {
    assessment: "오늘 할 일",
    worksheet: "함께 해 볼 것",
  },
  freeNavigation: false,

  activity: {
    activityId: ACTIVITY_ID,
    // 그리는 차시가 아니다. 비워 두면 화면이 글만 쓰는 활동으로 잡는다
    places: [],
    year: 2036,
    worksheet: WORKSHEET,
    // 서로 구경할 것이 없다 — 오늘 쓰는 것은 한 칸뿐이다
    galleryEnabled: false,
    // 출처 두 칸은 수행평가1의 평가 항목이라 붙여 둔 것이다. 오늘은 쓸 일이 없다
    sourcesEnabled: false,
  },
};

async function main(): Promise<void> {
  const existing = await db.collection(LESSON_PLANS).where("lessonNo", "==", LESSON_NO).get();
  const now = Date.now();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.set({ ...PLAN, updatedAt: now }, { merge: true });
    console.log(`↻ 갱신 — ${PLAN.title} (${doc.id})`);

    // 아직 시작 안 한 수업에는 바로 반영한다. 시작한 수업은 그날 화면을 흔들지 않는다
    const scheduled = await db
      .collection("classSessions")
      .where("lessonNo", "==", LESSON_NO)
      .where("status", "==", "scheduled")
      .get();
    for (const session of scheduled.docs) {
      await session.ref.set(
        {
          title: PLAN.title,
          moodCheckEnabled: PLAN.moodCheckEnabled,
          game: PLAN.game,
          assessment: PLAN.assessment,
          reflectionQuestions: PLAN.reflectionQuestions,
          reflectionPublic: PLAN.reflectionPublic,
          focusExempt: PLAN.focusExempt,
          phaseLabels: PLAN.phaseLabels,
          freeNavigation: PLAN.freeNavigation,
          activity: PLAN.activity,
        },
        { merge: true },
      );
    }
    console.log(`   아직 시작하지 않은 수업 ${scheduled.size}개에 반영`);
  } else {
    const ref = await db.collection(LESSON_PLANS).add({ ...PLAN, createdAt: now, updatedAt: now });
    console.log(`＋ 등록 — ${PLAN.title} (${ref.id})`);
  }

  console.log(`\n활동 ID: ${ACTIVITY_ID} (기사와 다른 통 — 어제 통과한 학생의 "끝났다" 가 안 풀립니다)`);
  console.log("단계: 대기 → 기분 → 오늘 할 일 → 함께 해 볼 것 → 성찰 → 마침");
  console.log("활동 링크 2개 — wordwall 퀴즈 · security.org 비밀번호 (둘 다 로그인 불필요, 접속 확인함)");
  console.log("슬라이드 18의 마스킹 체험은 뺐습니다 — store.wrtn.ai 도메인이 사라졌습니다.");
  console.log("비밀번호 활동은 「진짜 말고 가짜를 넣으라」 로 안내합니다.");
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 등록 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
