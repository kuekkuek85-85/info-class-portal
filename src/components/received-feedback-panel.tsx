"use client";

import { useEffect, useState } from "react";

/**
 * 지금까지 내가 받은 피드백 셋을 한 표로 보여준다 — 읽기 전용(참고용).
 *
 * 발표 준비 차시(「인간과 인공지능」 6차)에서 학생이 발표 자료를 만들며, 3~5차에 걸쳐 받은
 * AI·선생님·친구 피드백을 한눈에 참고하게 한다. 고치는 칸이 아니라 **보고 참고하는** 표다.
 *
 * 데이터는 /api/student/received-feedback 에서 온다 — **본인 것만**, 친구 신원은 빠진 채로.
 * 자동저장(1.5초)을 안 탄다. 답을 저장하지 않으므로 answers 를 건드리지 않는다.
 *
 * 아직 받은 것이 없으면 조용히 안내만 띄운다 — 빈 표를 그리면 고장으로 읽는다.
 */

interface Received {
  ai: string[];
  teacher: { chips: string[]; note: string } | null;
  peers: { found: string; question: string; reactions: string[] }[];
}

const EMPTY: Received = { ai: [], teacher: null, peers: [] };

function hasAny(data: Received): boolean {
  return data.ai.length > 0 || data.teacher !== null || data.peers.length > 0;
}

export function ReceivedFeedbackPanel() {
  const [data, setData] = useState<Received>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const response = await fetch("/api/student/received-feedback", { cache: "no-store" });
        const body = await response.json();
        if (!alive) return;
        if (body?.ok) {
          setData({
            ai: Array.isArray(body.ai) ? body.ai : [],
            teacher: body.teacher ?? null,
            peers: Array.isArray(body.peers) ? body.peers : [],
          });
        }
      } catch {
        // 잠깐 끊긴 것이다. 참고용이라 조용히 둔다 — 학생에게 알릴 일이 아니다
      } finally {
        if (alive) setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!loaded) {
    return <p className="t-note">받은 피드백을 불러오는 중이에요…</p>;
  }

  if (!hasAny(data)) {
    return (
      <p className="rounded-lg bg-cream px-4 py-3 t-body-sm">
        아직 받은 피드백이 없어요. 지난 시간까지 받은 게 있으면 여기에 모여서 보입니다.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border-2 border-ink">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-cream">
            <th className="border-b-2 border-ink px-3 py-2 align-top t-caption">어디서</th>
            <th className="border-b-2 border-ink px-3 py-2 align-top t-caption">받은 피드백</th>
          </tr>
        </thead>
        <tbody>
          {/* 🤖 AI — 검토받을 때 AI 가 더 생각해 보라고 물어본 질문들 */}
          {data.ai.length > 0 && (
            <tr className="border-b border-line align-top">
              <td className="px-3 py-3 t-body-sm font-semibold">🤖 AI</td>
              <td className="px-3 py-3">
                {data.ai.map((q, i) => (
                  <p key={i} className="t-body-sm">
                    {i + 1}. {q}
                  </p>
                ))}
              </td>
            </tr>
          )}

          {/* 🧑‍🏫 선생님 — 교사 검토(칩 + 한 줄) */}
          {data.teacher && (
            <tr className="border-b border-line align-top">
              <td className="px-3 py-3 t-body-sm font-semibold">🧑‍🏫 선생님</td>
              <td className="px-3 py-3">
                {data.teacher.chips.map((chip) => (
                  <p key={chip} className="t-body-sm font-semibold">
                    · {chip}
                  </p>
                ))}
                {data.teacher.note.trim() && (
                  <p className="t-body-sm whitespace-pre-line">{data.teacher.note}</p>
                )}
              </td>
            </tr>
          )}

          {/* 🧑‍🤝‍🧑 친구 — 동료 검토(좋은 점·개선점·이모지). 누가 썼는지는 안 나온다 */}
          {data.peers.length > 0 && (
            <tr className="align-top">
              <td className="px-3 py-3 t-body-sm font-semibold">🧑‍🤝‍🧑 친구</td>
              <td className="px-3 py-3">
                {data.peers.map((peer, i) => (
                  <div key={i} className={i > 0 ? "mt-2 border-t border-line pt-2" : ""}>
                    {peer.found.trim() && (
                      <p className="t-body-sm">
                        <span className="font-semibold">좋은 점 · </span>
                        {peer.found}
                      </p>
                    )}
                    {peer.question.trim() && (
                      <p className="t-body-sm">
                        <span className="font-semibold">개선하면 좋을 점 · </span>
                        {peer.question}
                      </p>
                    )}
                    {peer.reactions.length > 0 && (
                      <p className="t-body-sm">{peer.reactions.join(" ")}</p>
                    )}
                  </div>
                ))}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
