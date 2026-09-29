"use client";

import { RulesResultTable, type RuleCategory } from "@/components/rules-result-table";
import { usePolled } from "@/lib/use-polled";

/**
 * 학생용 — 「우리 학교 규칙」 완성 지면 (읽기 전용). rules_result 문항이 쓴다.
 *
 * 교사가 「규칙 완성하기」를 누르면 학급 공용 결과가 만들어진다. 학생은 언제 만들어질지
 * 모르니 몇 초마다 가볍게 폴링해, 완성되면 표가 저절로 나타나게 한다. 개인 답이 아니라
 * 공동체 산출물이라 모두가 같은 표를 본다.
 */

interface Result {
  table: RuleCategory[];
  count: number;
  at: number;
}

export function RulesResultPanel() {
  const { data } = usePolled<{ result: Result | null }>("/api/student/rules-result", 6000);
  const result = data?.result ?? null;

  if (!result) {
    return (
      <p className="rounded-lg border border-line bg-surface px-4 py-3 t-body-sm text-muted">
        아직 완성되지 않았어요. 선생님이 우리 반 규칙을 모아 완성하면 여기에 나타나요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="t-caption">우리 반 {result.count}명의 규칙을 모아 하나로 정리했어요.</p>
      <RulesResultTable table={result.table} />
    </div>
  );
}
