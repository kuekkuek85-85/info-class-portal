"use client";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import type { Stroke, TextItem, WorksheetQuestion } from "@/lib/types";

/**
 * 카드뉴스 — 그림 + 활동지 답을 한 장으로 묶어 보여준다.
 *
 * 이미지 파일을 만들지 않는다. 획 데이터로 캔버스에 다시 그리고 답을 아래에 붙일 뿐이다.
 * 이미지를 만들어 저장하려면 Cloud Storage 가 필요하고, 그건 Blaze 전환을 뜻한다 (PRD 3.5).
 * 화면에서 보이기만 하면 되는 물건에 요금제를 바꿀 이유가 없다.
 *
 * 갤러리·내 작품 확인·교사 열람이 모두 이 컴포넌트 하나를 쓴다.
 */

export interface CardNewsData {
  place: string;
  year: number;
  strokes: Stroke[];
  texts: TextItem[];
  answers: Record<string, string>;
  traits: string[];
  sources: { site: string; ai: string };
}

interface CardNewsProps {
  data: CardNewsData;
  worksheet: WorksheetQuestion[];
  /** "2반 7번 김○○" 같은 표시명. 서버가 조인해서 만든 문자열만 받는다 */
  author?: string;
  compact?: boolean;
}

export function CardNews({ data, worksheet, author, compact }: CardNewsProps) {
  const filled = worksheet.filter((question) =>
    question.kind === "traits" ? data.traits.length > 0 : (data.answers[question.key] ?? "").trim(),
  );

  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-line bg-canvas p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className={compact ? "t-subhead" : "t-headline"}>
          {data.year}년의 {data.place || "어딘가"}
        </h3>
        {author && <span className="t-caption">{author}</span>}
      </header>

      <ArtifactCanvas strokes={data.strokes} texts={data.texts} />

      {data.traits.length > 0 && (
        <p className="flex flex-wrap gap-2">
          {data.traits.map((trait) => (
            <span key={trait} className="rounded-full bg-lilac px-3 py-1 text-sm font-semibold">
              {trait}
            </span>
          ))}
        </p>
      )}

      {filled.length > 0 && (
        <dl className="flex flex-col gap-3">
          {filled.map((question) => (
            <div key={question.key}>
              <dt className="t-caption">{question.label}</dt>
              <dd className="t-body mt-1 whitespace-pre-wrap">
                {question.kind === "traits"
                  ? data.traits.join(" · ")
                  : data.answers[question.key]}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {(data.sources.site || data.sources.ai) && (
        <footer className="border-t border-line pt-3">
          <p className="t-caption">참고한 곳</p>
          {data.sources.site && <p className="t-body-sm mt-1">🔎 {data.sources.site}</p>}
          {data.sources.ai && <p className="t-body-sm mt-1">🤖 {data.sources.ai}</p>}
        </footer>
      )}
    </article>
  );
}
