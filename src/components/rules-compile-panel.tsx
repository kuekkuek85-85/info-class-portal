"use client";

import { useState } from "react";

import { RulesResultTable, type RuleCategory } from "@/components/rules-result-table";
import { usePolled } from "@/lib/use-polled";

/**
 * 교사용 — 「우리 학교 규칙」 완성하기 (1회 생성, 다시 만들기 가능).
 *
 * 「규칙 완성하기」를 누르면 서버가 이 분반 전체 학생의 최종 규칙을 모아 Gemini 로 하나의
 * 표로 정리하고, 학급 공용 결과로 저장한다 — 그 순간 모든 학생 화면에도 같은 표가 뜬다.
 * 이름·학번은 Gemini 에 보내지 않는다(규칙 텍스트만). 저자 표시 없음.
 */

interface Result {
  table: RuleCategory[];
  count: number;
  at: number;
}

export function RulesCompilePanel({ sessionId }: { sessionId: string }) {
  /*
   * 15초마다 다시 읽는다. 안 그러면 화면을 연 순간의 "규칙 낸 학생 수" 에 멈춰,
   * 학생들이 수업 중에 규칙을 자동저장해도 「규칙 완성하기」 버튼이 계속 꺼진 채로 남는다
   * (자동저장이 곧 제출이므로, 낸 학생이 생기면 버튼이 저절로 켜져야 한다 — 교사 요청).
   */
  const { data, reload } = usePolled<{ result: Result | null; contributed: number }>(
    `/api/teacher/rules-result?sessionId=${sessionId}`,
    15000,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const result = data?.result ?? null;
  const contributed = data?.contributed ?? 0;

  async function compile() {
    if (result && !confirm("이미 만든 규칙이 있어요. 지금까지의 규칙으로 다시 만들까요?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/teacher/rules-compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const body = await response.json();
      if (body.ok) {
        reload();
      } else {
        setError(body.message || "정리하지 못했습니다. 조금 뒤에 다시 눌러 주세요.");
      }
    } catch {
      setError("연결을 확인하고 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-body font-bold">우리 학교 규칙 완성하기</h2>
        <span className="t-caption">지금까지 규칙을 낸 학생 {contributed}명</span>
      </div>

      <p className="t-caption">
        누르면 우리 반 학생들의 규칙을 하나의 표로 정리해, 모든 학생 화면에도 같은 완성 지면이
        나타납니다. 학생 이름은 AI에 보내지 않아요.
      </p>

      <button
        type="button"
        onClick={() => void compile()}
        disabled={busy || contributed === 0}
        className="pill pill-primary self-start disabled:opacity-60"
      >
        {busy ? "정리하는 중…" : result ? "다시 만들기" : "규칙 완성하기"}
      </button>

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="t-caption">완성된 규칙 (학생 {result.count}명 기준) — 학생 화면에도 이 표가 보입니다.</p>
          <RulesResultTable table={result.table} />
        </div>
      )}
    </section>
  );
}
