import { fail, guard, ok } from "@/lib/api";
import { listAllSessions, listArtifactsByStudent, listMoodEntriesByStudent } from "@/lib/db";
import { getMood, moodCellStyle } from "@/lib/mood";
import { readStudentSession } from "@/lib/session";
import type { Stroke, TextItem } from "@/lib/types";

/**
 * 포트폴리오 — 학생 '본인'의 지난 회기 활동/작품 + 회기별 기분 추이 (마음 톡톡 8회기 성찰).
 *
 * ## ★ 프라이버시 (이 과목 1순위)
 *
 * 철저히 **본인 것만** 모은다. 학번(me.studentId)으로만 조회하고, 친구 것은 한 건도 섞지
 * 않는다. 친구에게 나가는 경로가 아니라 자기 화면에만 뜨므로 갤러리·동료와 무관하다.
 * AI(Gemini)로 보내는 것은 없다 — 지난 답을 그대로 읽어 보여줄 뿐이다.
 *
 * 리허설 흔적(activityId 가 __rehearsal 로 끝나는 통)과 두 번째 그림판 슬롯(::graph)은
 * 거른다 — 전자는 교사 테스트, 후자는 8회기 인생 그래프(지난 작품이 아니다).
 *
 * ## 무엇을 모으나 (합리적 스코프)
 *
 * 지난 회기(2·3/4/5/6/7)에서 **본인이 쓴 글 몇 줄 + 그때의 기분**을 회기별로 모은다.
 * 지난 회기 산출물은 대부분 캔바·수노 같은 외부 링크라 포털에 그림이 없다. 단 2·3회기의
 * '힐링 스페이스'만 포털 내장 그림판이라 strokes 가 있어, 그 그림만 읽기 전용으로 다시 띄운다.
 * (기획 선택: 지난 작품 '원본 로딩' 은 포털에 그림이 있는 힐링 스페이스 하나로 한정.)
 */

/** 회기별로 떠올려 보여줄 것 — 통 ID → 라벨 + 본인이 쓴 글 칸 몇 개 */
interface PortfolioBin {
  activityId: string;
  label: string;
  /** 포털 내장 그림(strokes)이 있는 통인가 — 2·3회기 힐링 스페이스만 true */
  hasDrawing?: boolean;
  keys: { key: string; label: string; link?: boolean }[];
}

const PORTFOLIO_BINS: PortfolioBin[] = [
  {
    activityId: "mt-2026-2",
    label: "2·3회기 — 내 감정 알아차리기",
    hasDrawing: true, // 힐링 스페이스 그림
    keys: [
      { key: "word1", label: "내가 찾은 감정말 ①" },
      { key: "word2", label: "내가 찾은 감정말 ②" },
      { key: "word3", label: "내가 찾은 감정말 ③" },
      { key: "map_mine", label: "나만의 감정 조절법" },
      { key: "heal_place", label: "나의 힐링 공간" },
    ],
  },
  {
    activityId: "mt-2026-3",
    label: "4회기 — 실패를 노래로 자랑하기",
    keys: [
      { key: "brag_title", label: "내 실패 자랑 제목" },
      { key: "lyric_line", label: "내 노래 가사 한 줄" },
      { key: "learn_line", label: "실패에서 배운 것" },
      { key: "song_url", label: "내가 만든 노래", link: true },
    ],
  },
  {
    activityId: "mt-2026-5",
    label: "5회기 — 관점과 감정 읽기",
    keys: [
      { key: "persp_reflect", label: "관점에 대해 느낀 점" },
      { key: "a2_tm_reflect", label: "AI 감정 분석 소감" },
    ],
  },
  {
    activityId: "mt-2026-6",
    label: "6회기 — 의사소통과 공감",
    keys: [
      { key: "a4_imsg", label: "내가 쓴 '나 전달법'" },
      { key: "a5_empathy", label: "내가 쓴 공감 문장" },
      { key: "a4_virtue", label: "내가 고른 관계 덕목" },
    ],
  },
  {
    activityId: "mt-2026-7",
    label: "7회기 — 그림으로 마음 전하기 · 규칙 만들기",
    keys: [
      { key: "sk_feel", label: "그림 게임에서 느낀 점" },
      { key: "sk_perspective", label: "관점에 대해 알게 된 것" },
      { key: "pd_reflect", label: "협력 게임 소감" },
    ],
  },
];

/** 화면에 보여줄 한 칸 길이 상한 (긴 글은 잘라 보여준다 — 본인 것이라 전문은 지난 기록에서) */
const MAX_VALUE = 400;

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const [artifacts, moods, sessions] = await Promise.all([
      listArtifactsByStudent(me.studentId),
      listMoodEntriesByStudent(me.studentId),
      listAllSessions(),
    ]);

    // 리허설·슬롯을 뺀 '진짜 지난 작품' 만 activityId 로 찾는다
    const realArtifact = (activityId: string) =>
      artifacts.find(
        (a) => a.activityId === activityId && !a.activityId.includes("__rehearsal"),
      );

    const works = PORTFOLIO_BINS.flatMap((bin) => {
      const artifact = realArtifact(bin.activityId);
      if (!artifact) return [];

      const answers = artifact.answers ?? {};
      const highlights = bin.keys
        .map((k) => ({
          label: k.label,
          value: String(answers[k.key] ?? "").trim().slice(0, MAX_VALUE),
          link: k.link ?? false,
        }))
        .filter((h) => h.value);

      const drawing =
        bin.hasDrawing && (artifact.strokes?.length ?? 0) > 0
          ? {
              strokes: artifact.strokes as Stroke[],
              texts: (artifact.texts ?? []) as TextItem[],
              title: artifact.place ? `힐링 스페이스 · ${artifact.place}` : "힐링 스페이스",
            }
          : null;

      // 쓴 글도 그림도 없으면 빈 카드가 되므로 뺀다
      if (highlights.length === 0 && !drawing) return [];
      return [{ activityId: bin.activityId, label: bin.label, highlights, drawing }];
    });

    /* ── 회기별 기분 추이 — 마음 톡톡 세션의 mood 만 (정보 수업 mood 는 제외) ── */
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const moodTrend = moods
      .map((m) => {
        const session = sessionById.get(m.sessionId);
        if (!session) return null;
        // 마음 톡톡 세션만 (제목으로 거른다 — 정보·진로탐색 mood 가 섞이지 않게)
        if (!String(session.title ?? "").includes("마음 톡톡")) return null;
        const option = getMood(m.mood);
        const style = option ? moodCellStyle(option) : null;
        return {
          lessonNo: session.lessonNo ?? 0,
          title: String(session.title ?? ""),
          date: session.date ?? m.date ?? "",
          moodLabel: option?.label ?? m.mood,
          valence: m.valence ?? 0,
          arousal: m.arousal ?? 0,
          color: style?.background ?? "#cccccc",
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      // 회기 번호 → 날짜 순. 같은 통을 두 회기가 나눠 쓰므로 세션별로 각각 한 점이 된다
      .sort((a, b) => a.lessonNo - b.lessonNo || a.date.localeCompare(b.date));

    return ok({ works, moodTrend });
  });
}
