"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { NewsPaper, templateOf } from "@/components/news-paper";
import {
  ARTICLE_RULES,
  resolveItems,
  type CheckItem,
  type FieldRule,
  type Resolution,
} from "@/lib/article-check";
import type { Stroke, TextItem } from "@/lib/types";

/**
 * 교사가 2차 제출을 보고 답하는 화면 (수행평가 검토 패널).
 *
 * ## 두 가지 문서 유형을 낸다
 *
 * 7차시는 **신문 기사**(news_* 필드 + 완성 지면)이고, 11차시는 **논설문**(de11_* 사례
 * 분석·대처·예방)이다. 같은 검토 패널을 쓰지만 산출물 모양이 달라, 세션 worksheet 를
 * 받아 유형을 판별한다 — 신문 본문 필드(news_scene 등)가 있으면 기사 모드, 없으면
 * 논설문(글) 모드. 기사 모드는 지금 그대로(기사 펼치기·완성 지면·기사용 칩)이고,
 * 논설문 모드는 de11 섹션을 읽기 순서대로 한 편의 글로 펼치고 완성 지면을 감춘다.
 *
 * ## "AI 가 1차에서 짚은 것" 은 차시 규칙으로 센다
 *
 * 1차 제출이 aiCheck.items 를 만들 때 **그 차시의 submitFields** 로 판정한다
 * (api/student/submit 의 rulesOf). 그래서 여기서도 같은 규칙으로 다시 세야 표시가
 * 어긋나지 않는다 — 기사 규칙(ARTICLE_RULES)을 못 박지 않고, submitFields 가 있으면
 * 그것을, 없으면 ARTICLE_RULES 를 rules 로 쓴다. list 문항(대처방안)은 문장이 아니라
 * 항목 수로 센다 (resolveItems 가 mode 로 가른다).
 *
 * ## 작은 화면이 기준이다
 *
 * 선생님은 폰을 들고 교실을 돈다. 본문은 **접어 둔다** — 긴 글을 폰에서 읽고 칩을
 * 누르는 것은 무리다. 이름이 뜨면 그 자리로 가서 학생 태블릿으로 글을 읽고, 폰에서는
 * 피드백만 남긴다. 한 명에 5초를 넘기면 대기 줄이 밀린다.
 *
 * ## ✓✗ 는 다시 세서 나온 값이다
 *
 * 학생이 「고쳤어요」를 눌러도 실제로 안 고쳤으면 ✗ 다. 자기 신고를 믿지 않는다.
 * 그리고 **여는 순간** 다시 센다 — 기다리는 동안 더 고쳤으면 그것이 반영되어,
 * 선생님이 보는 글과 화면의 표시가 어긋나지 않는다.
 *
 * ## 칩은 보조이고 입력칸이 본체다
 *
 * 빠진 조건과 오탈자는 AI 자리에서 이미 걸렀다. 여기 남는 것은 기계가 못 보는 것 —
 * 그래서 정성적 피드백을 쓰는 칸을 위에 크게 둔다.
 */

/** 신문 기사 본문 필드. worksheet 에 이 중 하나라도 있으면 기사 모드다.
 *  (news_check2 는 11차 자기 점검이 재사용하는 키라 여기 넣지 않는다 — 오판 방지) */
const NEWS_BODY_KEYS = new Set([
  "news_title",
  "news_scene",
  "news_change",
  "news_real",
  "news_interview",
  "news_template",
]);

/** 수업 중에 자주 쓰는 말. 다섯 남짓을 넘기면 고르는 데 시간이 더 든다 */
const NEWS_CHIPS = [
  "② 의 ‘왜’ 가 더 필요해요",
  "① 이 그림에 없는 것 같아요",
  "③ 사례가 기사와 잘 이어지네요",
  "④ 인터뷰가 앞 내용과 따로 노는 것 같아요",
  "좋아요 · 최종 제출하세요",
];

/** 논설문(11차)용 칩 — 원인·대처·예방·꼬리답변에 맞춘 말 */
const ESSAY_CHIPS = [
  "① 원인·피해 — ‘왜’ 가 더 필요해요",
  "② 대처가 더 구체적이면 좋겠어요",
  "예방(사전)과 대처(사후) 구분을 확인하세요",
  "③ 예방에 우리 반·사회(공동체)가 빠졌어요",
  "④ 꼬리답변을 내 말로 더 채워 주세요",
  "근거가 더 필요해요",
  "좋아요 · 최종 제출하세요",
];

/** case_story 스토리 한 편 */
interface StoryLine {
  match: string;
  text: string;
  image?: string;
}

/**
 * 검토 패널이 유형을 판별하는 데 필요한 worksheet 조각.
 *
 * 대시보드가 넘기는 세션 worksheet 스냅샷의 부분집합이다 — 전체 WorksheetQuestion 을
 * 요구하지 않고 여기서 실제로 읽는 필드만 구조적으로 받는다.
 */
export interface ReviewWorksheetItem {
  key: string;
  kind?: string;
  label?: string;
  confirmLock?: boolean;
  storySourceKey?: string;
  stories?: StoryLine[];
  submitFields?: FieldRule[];
}

/** list 문항 값(문자열 배열 JSON)을 항목 배열로. 빈 항목은 뺀다. 깨지면 빈 배열 */
function parseList(raw: string | undefined): string[] {
  if (!(raw ?? "").trim()) return [];
  try {
    const parsed = JSON.parse(raw as string);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  } catch {
    return [];
  }
}

interface Loaded {
  answers: Record<string, string>;
  sources: { site: string; ai: string };
  items: CheckItem[];
  strokes: Stroke[];
  texts: TextItem[];
}

interface TeacherReviewPanelProps {
  sessionId: string;
  studentId: string;
  /** 마스킹이 켜져 있으면 번호만 넘어온다 */
  who: string;
  selfCheck: string;
  /** 세션 활동지 — 문서 유형(기사/논설문) 판별과 논설문 섹션 순서에 쓴다 */
  worksheet: ReviewWorksheetItem[];
  onDone: () => void;
  onClose: () => void;
}

const MARK: Record<Resolution["state"], string> = { fixed: "✓", open: "✗", asked: "?" };

export function TeacherReviewPanel({
  sessionId,
  studentId,
  who,
  selfCheck,
  worksheet,
  onDone,
  onClose,
}: TeacherReviewPanelProps) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [openBody, setOpenBody] = useState(false);
  const [openPaper, setOpenPaper] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /*
   * 유형 판별과 규칙은 worksheet 에서 뽑는다 (answer 키 스니핑보다 견고).
   *  · isNews    — 신문 본문 필드가 있으면 기사 모드, 없으면 논설문 모드
   *  · rules     — 차시가 정한 submitFields(있으면), 없으면 기사 기본 ARTICLE_RULES
   *  · caseItem  — 논설문의 고른 사례(확정 잠금 choice)
   *  · storyItem — 사례 지문(case_story). 학생이 쓴 글이 아니라 참고 지문이다
   */
  const { isNews, rules, caseItem, storyItem } = useMemo(() => {
    const list = worksheet ?? [];
    const news = list.some((q) => NEWS_BODY_KEYS.has(q.key));
    const submit = list.find((q) => q.kind === "submit");
    const fields = submit?.submitFields;
    return {
      isNews: news,
      rules: (fields && fields.length > 0 ? fields : ARTICLE_RULES) as readonly FieldRule[],
      caseItem: list.find((q) => q.kind === "choice" && q.confirmLock === true) ?? null,
      storyItem: list.find((q) => q.kind === "case_story") ?? null,
    };
  }, [worksheet]);

  // 이 패널을 열 때만 artifact 를 1건 읽는다. 대기 줄에는 본문을 싣지 않는다
  const pull = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/teacher/artifact?sessionId=${encodeURIComponent(sessionId)}&studentId=${encodeURIComponent(studentId)}`,
        { cache: "no-store" },
      );
      const result = await response.json();
      if (result?.ok) {
        setLoaded({
          answers: result.answers ?? {},
          sources: result.sources ?? { site: "", ai: "" },
          items: result.items ?? [],
          strokes: result.strokes ?? [],
          texts: result.texts ?? [],
        });
      } else {
        setError(result?.message ?? "작품을 불러오지 못했습니다.");
      }
    } catch {
      setError("작품을 불러오지 못했습니다.");
    }
  }, [sessionId, studentId]);

  useEffect(() => {
    const id = setTimeout(() => void pull(), 0);
    return () => clearTimeout(id);
  }, [pull]);

  /*
   * 보내는 단추가 둘이다 — 판정이 곧 학생 화면을 가른다.
   *
   * 「통과」를 받은 학생은 이 수행평가가 끝나고 다음 화면으로 넘어간다.
   * 「고치기」를 받은 학생은 고쳐서 다시 낸다. 그래서 무엇을 적었는지가 아니라
   * 어느 단추를 눌렀는지로 가른다 — 칭찬과 지적이 한 글에 섞여 있어도 판단이 흐려지지 않는다.
   */
  const send = useCallback(async (verdict: "pass" | "revise") => {
    // 통과는 그냥 누르면 된다. 고칠 것을 적게 하는 것은 고치라고 할 때뿐이다
    if (verdict === "revise" && chips.length === 0 && !note.trim()) {
      setError("무엇을 고칠지 칩을 고르거나 한 줄 적어 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, studentId, chips, note, verdict }),
      });
      const result = await response.json();
      if (!result?.ok) {
        setError(result?.message ?? "보내지 못했습니다. 다시 눌러 보세요.");
        return;
      }
      onDone();
    } catch {
      setError("보내지 못했습니다. 다시 눌러 보세요.");
    } finally {
      setBusy(false);
    }
  }, [chips, note, onDone, sessionId, studentId]);

  const resolutions: Resolution[] = loaded
    ? resolveItems(loaded.items, loaded.answers, loaded.sources, rules)
    : [];

  // 논설문의 고른 사례와 그 참고 지문 (기사 모드에서는 안 쓴다)
  const caseAnswer = caseItem ? (loaded?.answers[caseItem.key] ?? "").trim() : "";
  const storyText = (() => {
    if (isNews || !storyItem || !loaded) return "";
    const picked = (loaded.answers[storyItem.storySourceKey ?? ""] ?? "").trim();
    return (storyItem.stories ?? []).find((s) => s.match === picked)?.text ?? "";
  })();

  const chipList = isNews ? NEWS_CHIPS : ESSAY_CHIPS;

  return (
    <div className="card flex flex-col gap-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="t-card-title">{who}</p>
        <button type="button" onClick={onClose} className="pill pill-secondary text-sm">
          닫기
        </button>
      </header>

      {/*
        2차를 내기 전에 학생이 스스로 고른 것. 왜 이 학생이 앞에 섰는지가 여기 있다.
        "학생이 고른 것" 만으로는 무엇을 고른 건지 안 보여서 문장으로 푼다.
      */}
      {selfCheck && (
        <p className="t-note">
          <b>학생이 스스로 본 것</b> — “{selfCheck}”
        </p>
      )}

      {!loaded && !error && <p className="t-body">불러오는 중…</p>}

      {loaded && (
        <>
          <section className="flex flex-col gap-2">
            <p className="t-eyebrow">AI 가 1차에서 짚은 것</p>
            {resolutions.length === 0 ? (
              <p className="t-body">1차에서 짚은 것이 없었습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {resolutions.map(({ item, state, now }) => (
                  <li key={item.code} className="flex flex-wrap items-baseline gap-2 t-body">
                    <span className="t-card-title">{MARK[state]}</span>
                    <span className={state === "open" ? "font-bold" : ""}>{item.label}</span>
                    <span className="t-caption">{now}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/*
            본문은 접어 둔다. 선생님은 학생 태블릿으로 읽는 것이 기본이고,
            자리에 못 갈 때만 여기서 편다. 완성 지면(NewsPaper)은 기사 모드에서만 —
            논설문에는 신문 지면이 없다.
          */}
          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOpenBody((prev) => !prev)}
                aria-expanded={openBody}
                className="pill pill-secondary self-start text-sm"
              >
                {isNews
                  ? openBody
                    ? "기사 접기"
                    : "기사 펼쳐 보기"
                  : openBody
                    ? "글 접기"
                    : "논설문 펼쳐 보기"}
              </button>
              {isNews && (
                <button
                  type="button"
                  onClick={() => setOpenPaper((prev) => !prev)}
                  aria-expanded={openPaper}
                  className="pill pill-secondary self-start text-sm"
                >
                  {openPaper ? "지면 접기" : "완성 지면 보기"}
                </button>
              )}
            </div>

            {/* 기사 모드 — 지금 그대로: ARTICLE_RULES 순서로 펼친다 */}
            {openBody && isNews && (
              <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
                {ARTICLE_RULES.map((rule) => (
                  <p key={rule.key} className="t-note whitespace-pre-line">
                    <b>{rule.label}</b>
                    {"\n"}
                    {loaded.answers[rule.key]?.trim() || "(비어 있음)"}
                  </p>
                ))}
                <p className="t-note">
                  <b>출처</b>
                  {"\n"}
                  {[loaded.sources.site, loaded.sources.ai].filter(Boolean).join(" / ") ||
                    "(비어 있음)"}
                </p>
              </div>
            )}

            {/*
              논설문 모드 — de11 섹션을 읽기 순서(submitFields)대로 한 편의 글로 펼친다.
              맨 위에 고른 사례를 머리로 두고, 사례 지문은 "학생이 쓴 글이 아님" 을 밝혀
              접어 보여준다. 대처방안(list)은 번호 목록으로 푼다.
            */}
            {openBody && !isNews && (
              <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
                {caseAnswer && (
                  <div className="flex flex-col gap-1">
                    <p className="t-eyebrow">고른 사례</p>
                    <p className="t-note whitespace-pre-line font-bold">{caseAnswer}</p>
                    {storyText && (
                      <details className="mt-1">
                        <summary className="t-caption cursor-pointer text-muted">
                          사례 지문 보기 (학생이 쓴 글이 아님)
                        </summary>
                        <p className="mt-1 whitespace-pre-line t-caption text-muted">{storyText}</p>
                      </details>
                    )}
                  </div>
                )}

                {rules.map((rule) => {
                  const isList = rule.mode === "list";
                  const items = isList ? parseList(loaded.answers[rule.key]) : [];
                  const text = (loaded.answers[rule.key] ?? "").trim();
                  return (
                    <div key={rule.key} className="flex flex-col gap-1">
                      <p className="t-note">
                        <b>{rule.label}</b>
                      </p>
                      {isList ? (
                        items.length > 0 ? (
                          <ol className="flex list-decimal flex-col gap-1 pl-5 t-note">
                            {items.map((item, i) => (
                              <li key={i} className="whitespace-pre-line">
                                {item}
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="t-note">(비어 있음)</p>
                        )
                      ) : (
                        <p className="t-note whitespace-pre-line">{text || "(비어 있음)"}</p>
                      )}
                    </div>
                  );
                })}

                <p className="t-note">
                  <b>출처</b>
                  {"\n"}
                  {[loaded.sources.site, loaded.sources.ai].filter(Boolean).join(" / ") ||
                    "(비어 있음)"}
                </p>
              </div>
            )}

            {/*
              학생이 보는 것과 같은 지면 — 기사 모드에서만. 채점할 때 칸별로 읽는 것과
              한 편으로 읽는 것이 다르므로 둘 다 열어 둔다.
            */}
            {isNews && openPaper && (
              <NewsPaper
                template={templateOf(loaded.answers.news_template)}
                data={{
                  title: loaded.answers.news_title ?? "",
                  scene: loaded.answers.news_scene ?? "",
                  change: loaded.answers.news_change ?? "",
                  real: loaded.answers.news_real ?? "",
                  interview: loaded.answers.news_interview ?? "",
                  caption: loaded.answers.news_caption ?? "",
                  strokes: loaded.strokes,
                  texts: loaded.texts,
                  // 교사 화면은 마스킹이 걸릴 수 있어 서명을 넣지 않는다
                  reporter: "",
                }}
              />
            )}
          </section>
        </>
      )}

      <section className="flex flex-col gap-2">
        <label htmlFor="review-note" className="t-eyebrow">
          선생님 피드백
        </label>
        <textarea
          id="review-note"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          rows={3}
          placeholder="내용을 보고 한마디 — 여기가 본체입니다"
          className="field"
        />
        <div className="flex flex-wrap gap-2">
          {chipList.map((chip) => {
            const on = chips.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setChips((prev) => (on ? prev.filter((c) => c !== chip) : [...prev, chip]))
                }
                className={`pill text-sm ${on ? "pill-primary" : "pill-secondary"}`}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </section>

      {error && <p className="t-body-sm">{error}</p>}

      {/*
        판정을 단추로 가른다.

        「통과」는 그 학생의 화면을 바꾼다 — 수행평가가 끝나고 다음 화면으로 넘어간다.
        되돌리려면 같은 학생에게 「고치기」로 다시 보내면 된다.
      */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void send("pass")}
          disabled={busy}
          className="pill pill-primary pill-block"
        >
          {busy ? "보내는 중…" : "통과 — 다 됐어요"}
        </button>
        <button
          type="button"
          onClick={() => void send("revise")}
          disabled={busy}
          className="pill pill-secondary pill-block"
        >
          {busy ? "보내는 중…" : "고쳐서 다시 내기"}
        </button>
      </div>
    </div>
  );
}
