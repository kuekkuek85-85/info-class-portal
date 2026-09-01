"use client";

import { useCallback, useState } from "react";

import { CardNews, type CardNewsData } from "@/components/card-news";
import { usePolled } from "@/lib/use-polled";
import type { WorksheetQuestion } from "@/lib/types";

/**
 * 교사용 작품 패널 — 제출 현황, 열람, 숨김, 교사 피드백.
 *
 * 목록은 획을 빼고 제목만 받는다. 한 편을 눌렀을 때만 그 작품의 획을 받아 그린다.
 * 28편치 좌표를 한꺼번에 받으면 목록 한 번 여는 데 수백 KB가 오간다.
 *
 * 자동 갱신하지 않는다 — 필요할 때 새로고침 버튼을 누른다 (PRD 10장 D2).
 */

interface Row {
  id: string;
  author: string;
  place: string;
  year: number;
  status: "draft" | "submitted";
  hidden: boolean;
  strokeCount: number;
  /** 선생님이 내린 판정. 없으면 아직 안 본 학생이거나 옛 기록이다 */
  verdict: "pass" | "revise" | null;
  /** 판정을 남긴 때. 통과 명단을 누른 순서대로 세운다 */
  reviewedAt: number;
}

interface Detail {
  card: CardNewsData & { id: string; author: string };
  studentId: string;
  status: string;
  hidden: boolean;
  worksheet: WorksheetQuestion[];
  /** 수행평가 차시인가 — 그렇다면 피드백을 한 칸으로 받아 제출 칸으로 보낸다 */
  hasSubmit: boolean;
  /** 제출 칸이 이미 보여주고 있는 교사 피드백 */
  teacherNote: string;
  /** 이 차시가 쓰는 두 칸의 질문. 학생 화면과 같은 것을 쓴다 */
  feedbackPrompts: { found: { label: string }; question: { label: string } };
  feedbacks: {
    id: string;
    mine: boolean;
    from: string;
    foundTech: string;
    question: string;
    authorReply: string;
  }[];
}

export function TeacherArtifactPanel({
  sessionId,
  onFeedbackSent,
}: {
  sessionId: string;
  /** 수행평가 피드백을 보낸 뒤 — 대시보드가 대기 줄을 바로 다시 읽게 한다 */
  onFeedbackSent?: () => void;
}) {
  const [openId, setOpenId] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  /** 목록을 펼쳤는가. 접힌 채로 시작한다 — 수업 중에 늘 보는 것이 아니다 */
  const [listOpen, setListOpen] = useState(false);

  // 간격 없음 — 열 때 한 번. 그 뒤로는 새로고침 버튼과 숨김 처리 뒤에만 다시 읽는다.
  const { data, reload: loadList } = usePolled<{
    activity: boolean;
    rows: Row[];
    stats: { total: number; submitted: number; hidden: number } | null;
  }>(`/api/teacher/artifacts?sessionId=${sessionId}`);

  const rows = data?.activity ? data.rows : data ? [] : null;
  const stats = data?.stats ?? null;

  const openDetail = useCallback(
    async (id: string) => {
      setOpenId(id);
      setDetail(null);
      if (!id) return;

      const response = await fetch(`/api/teacher/artifacts?sessionId=${sessionId}&id=${id}`);
      const result = await response.json();
      if (result.ok) setDetail(result as Detail);
    },
    [sessionId],
  );

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch("/api/teacher/artifacts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    loadList();
    if (openId === id) await openDetail(id);
  }

  if (rows === null) return null;
  if (rows.length === 0) return null;

  /*
   * 통과한 학생만 모은 명단.
   *
   * 작품 목록은 스물여덟 줄이라 훑어야 보인다. 수업 중에 선생님이 알고 싶은 것은
   * "누가 끝났나" 하나이고, 그건 세는 것이 아니라 **보이는 것**이어야 한다.
   * 통과를 준 순서대로 세우면 방금 누른 이름이 맨 끝에 붙어 바로 확인이 된다.
   */
  const passed = rows
    .filter((row) => row.verdict === "pass")
    .sort((a, b) => a.reviewedAt - b.reviewedAt);

  return (
    <>
      <PassedCard passed={passed} total={rows.length} onRefresh={loadList} />

      {/*
        목록은 접어 둔다.

        스물여덟 줄이 늘 펼쳐져 있으면 그 아래에 있는 것들이 화면 밖으로 밀린다.
        수업 중에 자주 보는 것은 위의 통과 명단과 대기 줄이고, 이 목록은 한 명을
        찾아 열어 볼 때만 쓴다. 머리글의 숫자는 접힌 채로도 보이므로, 몇 편이
        들어왔는지는 펼치지 않고도 안다.
      */}
      <section className="card flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="t-body font-bold">
            작품 {stats ? `제출 ${stats.submitted} / ${stats.total}` : ""}
            {stats && stats.hidden > 0 ? ` · 숨김 ${stats.hidden}` : ""}
          </h2>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setListOpen((prev) => !prev)}
              aria-expanded={listOpen}
              className="pill pill-secondary t-body-sm"
            >
              {listOpen ? "접기" : "펼치기"}
            </button>
            {listOpen && (
              <button type="button" onClick={loadList} className="pill pill-secondary t-body-sm">
                새로고침
              </button>
            )}
          </div>
        </div>

      {/*
        펼친 작품은 **누른 줄 바로 아래**에 놓는다. 목록 맨 끝에 붙이면 25명 중 3번을
        눌렀을 때 화면이 저 아래로 튀고, 교사는 자기가 뭘 눌렀는지 잃어버린다.
      */}
      {listOpen && (
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
              <div className="min-w-0">
                <p className="t-body-sm font-semibold">
                  {row.author}
                  {row.hidden && " · 숨김"}
                </p>
                <p className="t-caption">
                  {row.place ? `${row.year}년의 ${row.place}` : "장소 미선택"} · 획{" "}
                  {row.strokeCount}개 · {row.status === "submitted" ? "제출함" : "작성 중"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void openDetail(openId === row.id ? "" : row.id)}
                  className="pill pill-secondary t-body-sm"
                >
                  {openId === row.id ? "닫기" : "보기"}
                </button>
                <button
                  type="button"
                  onClick={() => patch(row.id, { hidden: !row.hidden })}
                  className="pill pill-secondary t-body-sm"
                >
                  {row.hidden ? "숨김 해제" : "숨기기"}
                </button>
              </div>
            </div>

            {openId === row.id && !detail && (
              <p className="t-body-sm px-3">작품을 불러오는 중…</p>
            )}

            {openId === row.id && detail && (
              <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-3">
                <CardNews
                  data={detail.card}
                  worksheet={detail.worksheet}
                  author={detail.card.author}
                  compact
                />

                {detail.feedbacks.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="t-caption">받은 피드백 {detail.feedbacks.length}개</h3>
                    {detail.feedbacks.map((item) => (
                      <div key={item.id} className="rounded-lg bg-canvas px-3 py-2">
                        <p className="t-caption">{item.from}</p>
                        {item.foundTech && <p className="t-body-sm">찾은 기술 · {item.foundTech}</p>}
                        {item.question && <p className="t-body-sm">궁금한 점 · {item.question}</p>}
                        {item.authorReply && (
                          <p className="t-body-sm mt-1">↳ 작성자 답 · {item.authorReply}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/*
                  수행평가 차시는 한 칸이다.

                  두 칸짜리 서식은 **친구 작품 보기용**이라 "이 그림에 어떤 기술이
                  쓰였을까요? 맞혀 보세요" 를 묻는다. 채점하는 글에 할 말이 아니고,
                  갤러리를 끈 차시에서는 써 넣어도 학생 화면에 나올 곳이 없다.
                */}
                {detail.hasSubmit ? (
                  <AssessmentNoteForm
                    key={detail.card.id}
                    sessionId={sessionId}
                    studentId={detail.studentId}
                    existing={detail.teacherNote}
                    onSaved={() => {
                      // 이 패널의 내용과, 위쪽 대기 줄을 함께 다시 읽는다
                      void openDetail(detail.card.id);
                      onFeedbackSent?.();
                    }}
                  />
                ) : (
                  <TeacherFeedbackForm
                    key={detail.card.id}
                    prompts={detail.feedbackPrompts}
                    existing={detail.feedbacks.find((item) => item.mine)}
                    onSave={(foundTech, question) => patch(detail.card.id, { foundTech, question })}
                  />
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
      )}
      </section>
    </>
  );
}

/**
 * 통과한 학생만 모은 카드.
 *
 * ## 왜 작품 목록과 따로 있나
 *
 * 작품 목록은 스물여덟 줄이고, 그 안에서 통과한 넷을 찾으려면 줄마다 상태를 읽어야
 * 한다. 수업 중에 선생님이 확인하는 것은 "누가 끝났나" 한 가지라, 세어야 알 수 있는
 * 자리에 두면 안 본다. 그래서 명단만 떼어 위에 둔다.
 *
 * ## 아무도 없을 때도 카드를 띄운다
 *
 * 비면 감추고 싶지만, 그러면 "아직 아무도 없다" 와 "이 기능이 이 차시엔 없다" 가
 * 화면에서 똑같아 보인다. 0명이라고 말하는 편이 낫다.
 *
 * 읽기를 따로 하지 않는다 — 작품 목록이 이미 받아 온 것을 걸러서 쓴다.
 */
function PassedCard({
  passed,
  total,
  onRefresh,
}: {
  passed: { id: string; author: string }[];
  total: number;
  onRefresh: () => void;
}) {
  return (
    <section className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">
          통과 {passed.length} / {total}
        </h2>
        <button type="button" onClick={onRefresh} className="pill pill-secondary t-body-sm">
          새로고침
        </button>
      </div>

      {passed.length === 0 ? (
        <p className="t-caption">아직 없습니다. 검토에서 「통과」를 누르면 여기에 쌓입니다.</p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-2">
            {passed.map((row) => (
              <li key={row.id} className="rounded-lg bg-lime px-3 py-1.5 t-body-sm font-semibold">
                {row.author}
              </li>
            ))}
          </ul>
          <p className="t-caption">이 학생들 화면에는 활동지 대신 게임이 떠 있습니다.</p>
        </>
      )}
    </section>
  );
}

/**
 * 수행평가 피드백 — 한 칸.
 *
 * 검토 대기 줄의 패널과 **같은 곳에 쓴다** (artifact.teacherFeedback). 그래야 학생
 * 제출 칸에 뜨고, 두 화면에서 쓴 말이 서로 다른 데 쌓이지 않는다.
 *
 * 이 자리가 따로 필요한 이유는 **2차까지 못 온 학생** 때문이다. 대기 줄에는 2차를
 * 낸 학생만 서는데, 1차에서 멈춘 학생에게도 할 말이 있다.
 */
function AssessmentNoteForm({
  sessionId,
  studentId,
  existing,
  onSaved,
}: {
  sessionId: string;
  studentId: string;
  existing: string;
  onSaved: () => void;
}) {
  const [note, setNote] = useState(existing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  /*
   * 판정이 학생 화면을 가른다 — 「통과」면 수행평가가 끝나고 다음 화면으로 넘어간다.
   * 검토 대기 줄의 패널과 같은 규칙이다 (teacher-review-panel).
   */
  async function save(verdict: "pass" | "revise") {
    // 통과는 빈칸이어도 보낸다. 학생 화면이 「다 했어요」 로 바뀌므로 빈 말풍선이 안 된다
    if (verdict === "revise" && !note.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, studentId, chips: [], note, verdict }),
      });
      const result = await response.json();
      if (!result?.ok) {
        setError(result?.message ?? "보내지 못했습니다.");
        return;
      }
      onSaved();
    } catch {
      setError("보내지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <h3 className="t-caption">선생님 피드백 — 학생 제출 칸에 그대로 뜹니다</h3>
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value.slice(0, 500))}
        rows={3}
        placeholder="내용을 보고 한마디"
        className="field"
      />
      {error && <p className="t-body-sm">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save("pass")}
          disabled={busy || !note.trim()}
          className="pill pill-primary"
        >
          {busy ? "보내는 중…" : "통과 — 다 됐어요"}
        </button>
        <button
          type="button"
          onClick={() => void save("revise")}
          disabled={busy || !note.trim()}
          className="pill pill-secondary"
        >
          {busy ? "보내는 중…" : "고쳐서 다시 내기"}
        </button>
      </div>
    </div>
  );
}

function TeacherFeedbackForm({
  existing,
  prompts,
  onSave,
}: {
  existing?: { foundTech: string; question: string };
  prompts: { found: { label: string }; question: { label: string } };
  onSave: (foundTech: string, question: string) => Promise<void> | void;
}) {
  const [foundTech, setFoundTech] = useState(existing?.foundTech ?? "");
  const [question, setQuestion] = useState(existing?.question ?? "");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <h3 className="t-caption">선생님 피드백 (학생과 같은 두 칸)</h3>
      <input
        value={foundTech}
        onChange={(event) => setFoundTech(event.target.value)}
        maxLength={200}
        placeholder={prompts.found.label}
        className="field"
      />
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        maxLength={200}
        placeholder={prompts.question.label}
        className="field"
      />
      <button
        type="button"
        onClick={() => void onSave(foundTech, question)}
        disabled={!foundTech.trim() && !question.trim()}
        className="pill pill-primary self-start"
      >
        {existing ? "고쳐서 남기기" : "남기기"}
      </button>
    </div>
  );
}
