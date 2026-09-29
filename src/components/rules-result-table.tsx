"use client";

/**
 * 「우리 학교 규칙」 완성 지면 — 읽기 전용 표. 교사·학생 화면이 함께 쓴다.
 *
 * 카테고리별로 항목·상점/벌점·점수를 보여준다. 저자 표시는 없다(통합 결과). 모바일에서
 * 가로 스크롤이 없도록 표 대신 세로 카드로 쌓는다.
 */

export interface RuleItem {
  item: string;
  type: string;
  score: string;
}
export interface RuleCategory {
  category: string;
  items: RuleItem[];
}

export function RulesResultTable({ table }: { table: RuleCategory[] }) {
  if (!table || table.length === 0) {
    return <p className="t-body-sm text-muted">정리된 규칙이 없어요.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {table.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-2">
          <h3 className="rounded-md bg-cream px-3 py-1 t-body font-bold">{group.category}</h3>
          <ul className="flex flex-col gap-1">
            {group.items.map((item, ii) => (
              <li
                key={ii}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg border border-line px-3 py-2"
              >
                <span className="t-body-sm min-w-0 flex-1">{item.item}</span>
                <span className="flex shrink-0 items-baseline gap-2">
                  {item.type && (
                    <span
                      className={`rounded-full px-2 py-0.5 t-caption ${
                        item.type === "벌점" ? "bg-pink" : "bg-lime"
                      }`}
                    >
                      {item.type}
                    </span>
                  )}
                  {item.score && <span className="t-body-sm font-semibold">{item.score}점</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
