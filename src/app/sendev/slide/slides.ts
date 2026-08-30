import {
  ASKS,
  HALL,
  HANDS_COUNT,
  HANDS_RENT,
  HANDS_TONIGHT,
  HANDS_USING,
  TALKS,
} from "./data";

/**
 * 기록 슬라이드 한 벌.
 *
 * 행사 화면(slides.tsx)과 **일부러 따로 만든다.** 그쪽은 진행자가 눌러 가며 여는
 * 장치가 붙어 있고, 여기는 열려 있는 결과만 남는 곳이다. 한 컴포넌트에 둘을 다
 * 담으려 하면 `revealed` 를 늘 가득 채워 넘기는 가짜 상태가 생기고, 나중에 행사
 * 화면을 고칠 때마다 이 기록까지 흔들린다.
 *
 * 대신 **모양은 같은 토큰을 쓴다** — 같은 `sendev` 테마 안에 있으므로 색과 글자는
 * 그날 화면 그대로다.
 */

export type ArchiveSlide =
  | { kind: "cover" }
  | { kind: "text"; eyebrow?: string; title: string; lines?: string[]; foot?: string }
  | { kind: "flow"; steps: readonly string[] }
  | { kind: "count"; eyebrow: string; q: string; n: number }
  | { kind: "bubbles"; eyebrow: string; q: string; items: readonly string[] }
  | { kind: "rent"; eyebrow: string; q: string; amounts: readonly number[] }
  | { kind: "talk"; speaker: string; where: string; title: string; line: string }
  | { kind: "page"; deck: string; src: string; page: number; total: number }
  | { kind: "asks"; eyebrow: string; items: readonly string[] }
  | {
      kind: "quiz";
      eyebrow: string;
      items: readonly { q: string; a: string; note?: string }[];
    }
  | { kind: "awards"; names: readonly string[]; photo: string; prize: string }
  | { kind: "hall"; champion: string; grit: string; photo: string }
  | { kind: "photos"; title: string; lines: readonly string[]; photos: readonly string[] }
  | { kind: "concat"; command: string; lines: readonly string[] };

/** 장 구분 — 90장이 넘어가므로 건너뛸 자리를 준다 */
export interface Chapter {
  label: string;
  at: number;
}

function pagesOf(slug: string, total: number, deck: string): ArchiveSlide[] {
  return Array.from({ length: total }, (_, i) => ({
    kind: "page" as const,
    deck,
    src: `/sendev/deck/${slug}-${String(i + 1).padStart(2, "0")}.png`,
    page: i + 1,
    total,
  }));
}

function build(): { slides: ArchiveSlide[]; chapters: Chapter[] } {
  const slides: ArchiveSlide[] = [];
  const chapters: Chapter[] = [];
  const chapter = (label: string) => chapters.push({ label, at: slides.length });

  chapter("여는 글");
  slides.push({ kind: "cover" });
  slides.push({
    kind: "flow",
    steps: ["손 들어 주세요", "발표 ①", "발표 ② ③", "하노이 릴레이", "시상식", "클로징"],
  });

  chapter("손들기");
  slides.push({
    kind: "text",
    eyebrow: "손 들어 주세요",
    title: "빙고 대신, 휴대폰으로",
    lines: [
      "자리를 옮기기 어려운 방이라 종이 빙고를 접었습니다.",
      "앉은 채로 답하고, 결과를 앞 화면에서 함께 봤습니다.",
    ],
    foot: "여섯 문항 · 이름은 받지 않았습니다",
  });
  for (const item of HANDS_COUNT) {
    slides.push({ kind: "count", eyebrow: "손 들어 주세요", q: item.q, n: item.n });
  }
  slides.push({
    kind: "bubbles",
    eyebrow: "손 들어 주세요",
    q: "업무 말고 수업에, 만든 것을 실제로 쓰고 계신 분",
    items: HANDS_USING,
  });
  slides.push({
    kind: "rent",
    eyebrow: "손 들어 주세요",
    q: "AI·디지털 월세, 한 달에 얼마 내고 계신가요?",
    amounts: HANDS_RENT,
  });
  slides.push({
    kind: "bubbles",
    eyebrow: "손 들어 주세요",
    q: "오늘 다른 일정을 뿌리치고 오신 분",
    items: HANDS_TONIGHT,
  });

  TALKS.forEach((talk, i) => {
    const no = ["①", "②", "③"][i];
    chapter(`발표 ${no}`);
    slides.push({
      kind: "talk",
      speaker: talk.speaker,
      where: talk.where,
      title: talk.title,
      line: talk.line,
    });
    slides.push(...pagesOf(talk.slug, talk.pages, `${talk.speaker} — ${talk.title}`));
    const asks = ASKS[talk.slug.startsWith("talk1") ? "talk1" : talk.slug.startsWith("talk2") ? "talk2" : "talk3"];
    if (asks?.length) {
      slides.push({ kind: "asks", eyebrow: `발표 ${no} · 받은 질문`, items: asks });
    }
    slides.push({ kind: "quiz", eyebrow: `3초 퀴즈 ${no}`, items: talk.quiz });
  });

  chapter("하노이탑");
  slides.push({
    kind: "text",
    eyebrow: "왜 하노이탑인가",
    title: "딸깍이면 누구나 만드는 시대에,",
    lines: ["학생들에게 도대체 무엇을 가르쳐야 할까요?", "(정보 교과 입장에서)"],
    foot: "문제 정의 · 추상화 · 알고리즘 → 바이브 코딩 → 검증 · 유지보수",
  });
  slides.push({
    kind: "text",
    eyebrow: "하노이 탑",
    title: "3분, 다 같이 한 판",
    lines: [
      "① 제한 시간 안에 완성하기",
      "② 최소 이동 · 최단 시간으로 겨루기",
    ],
    foot: "지난주 1학년 학생들이 한 바로 그 게임입니다",
  });

  chapter("시상");
  slides.push({
    kind: "awards",
    names: [
      "이재연 선생님 — 서일중학교",
      "김효진 선생님 — 서울군자초등학교",
      "박환석 선생님 — 대신중학교",
    ],
    photo: "/sendev/prize-wrist.png",
    prize: "🖱️ 마우스 손목 받침대",
  });
  slides.push({
    kind: "hall",
    champion: HALL.champion,
    grit: HALL.grit,
    photo: "/sendev/prize-hanoi.png",
  });

  chapter("기념품");
  slides.push({
    kind: "photos",
    title: "키캡의 정체",
    lines: [
      "‘개발자 키캡’ 을 기념품으로 찾아 헤맸는데, 세상에 없더라고요.\n그래서… 고양이발을 샀습니다.",
      "그런데 사 놓고 보니, 이거 개발자 키캡 맞습니다.\ncat — 리눅스 명령어잖아요.",
    ],
    photos: ["/sendev/keycap-paw.png", "/sendev/keycap-cat.png"],
  });
  slides.push({
    kind: "concat",
    command: "cat 이재연.md 김효진.md 박환석.md > 서울.md",
    lines: [
      "cat 은 파일을 열어 보는 명령어로 알고 있지만,\n이름의 뜻은 concatenate — 이어 붙이다 입니다.",
      "오늘 세 분의 발표가 딱 그것이었어요.\n따로 있던 파일 셋이 한 편의 문서가 됐습니다.",
      "교사개발자 한 분 한 분이 이미 좋은 파일입니다.\n서로 이어 붙일 때, 서울 교육이 바뀝니다.",
    ],
  });

  chapter("닫는 글");
  slides.push({
    kind: "text",
    eyebrow: "클로징",
    title: "다음에 또",
    lines: [
      "다음 나눔 데이는 임OO, 김OO 교사 개발자 분께서 발표해주실 겁니다.",
      "문화 분과 소식도 곧 전해드립니다.",
    ],
    foot: "2026년 8월 28일 · 제1호 교사개발자 홈커밍데이",
  });

  return { slides, chapters };
}

export const { slides: ARCHIVE, chapters: CHAPTERS } = build();
