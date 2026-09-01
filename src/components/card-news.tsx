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
  /**
   * 질문 이름표를 떼고 답만 보여준다.
   *
   * 친구 것을 볼 때 쓴다. 차시가 골라 연 칸의 이름표는 **쓰라고 시키는 문장**이라
   * ("그 감정을 한 줄로 적어 주세요 — 이 줄만 친구들에게 보입니다") 남의 글 위에
   * 붙으면 읽는 사람에게 하는 지시로 읽힌다. 내 것을 볼 때는 이름표가 있어야 하므로
   * 화면이 자리마다 정한다.
   */
  hideQuestionLabels?: boolean;
  /** 그림 제목. 안 주면 "○○년의 △△" (artifact-title.ts) */
  title?: string;
}

/** 줄 칸의 답을 읽는다. 못 읽으면 빈 목록 — 옛 형식이 남아 있어도 화면이 죽지 않는다 */
function rowsOf(raw: string | undefined): Record<string, string>[] {
  if (!raw?.trim()) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((r) => typeof r === "object" && r !== null) : [];
  } catch {
    return [];
  }
}

export function CardNews({
  data,
  worksheet,
  author,
  compact,
  hideQuestionLabels,
  title,
}: CardNewsProps) {
  const filled = worksheet.filter((question) =>
    question.kind === "traits" ? data.traits.length > 0 : (data.answers[question.key] ?? "").trim(),
  );
  const hasDrawing = data.strokes.length > 0 || data.texts.length > 0;

  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-line bg-canvas p-4">
      {/*
        그림이 없는 활동(4차시 직업 조사처럼 글만 쓰는 차시)에서는 제목 줄과 캔버스를
        통째로 뺀다. "2040년의 어딘가" 라는 빈 제목과 새하얀 사각형이 카드마다 붙으면
        정작 읽어야 할 글이 아래로 밀린다.
      */}
      {hasDrawing && (
        <>
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className={compact ? "t-subhead" : "t-headline"}>
              {title ?? `${data.year}년의 ${data.place || "어딘가"}`}
            </h3>
            {author && <span className="t-caption">{author}</span>}
          </header>

          <ArtifactCanvas strokes={data.strokes} texts={data.texts} />
        </>
      )}

      {!hasDrawing && author && <p className="t-caption">{author}</p>}

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
              {!hideQuestionLabels && <dt className="t-caption">{question.label}</dt>}
              <dd className="t-body mt-1 whitespace-pre-wrap">
                {question.kind === "traits" ? (
                  data.traits.join(" · ")
                ) : question.kind === "rows" ? (
                  /*
                    줄 칸은 JSON 으로 담긴다. 그대로 찍으면 대괄호와 따옴표가 나온다.
                    선생님이 읽을 것은 학생이 적은 값이지 저장 형식이 아니다.
                  */
                  <span className="flex flex-col gap-0.5">
                    {rowsOf(data.answers[question.key]).map((row, i) => (
                      <span key={i}>
                        ·{" "}
                        {(question.rowColumns ?? [])
                          .map((c) => (row[c.key] ?? "").trim())
                          .filter(Boolean)
                          .join(" — ")}
                      </span>
                    ))}
                  </span>
                ) : question.kind === "image" ? (
                  /*
                    사진은 사진으로 그린다.

                    답이 데이터 URL 이라, 다른 칸처럼 글자로 찍으면 base64 십팔만 자가
                    화면에 쏟아진다. 교사가 폰으로 학생 하나를 열었을 때 그 일이 난다.
                  */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={(data.answers[question.key] ?? "").trim()}
                    alt={question.label || "붙인 사진"}
                    className="h-auto w-full rounded-lg border border-line bg-white"
                  />
                ) : /^https?:\/\//.test((data.answers[question.key] ?? "").trim()) ? (
                  /*
                    주소는 눌러서 열 수 있게 한다.

                    캔바로 만든 감정 캐릭터처럼 **결과물이 다른 곳에 있는** 활동이 있다.
                    주소를 글자로만 보여주면 친구 작품을 보러 갈 방법이 손으로 옮겨 적는 것
                    뿐이고, 토큰이 붙은 백 자짜리 주소는 옮겨 적을 수 없다.

                    새 창으로 연다 — 같은 창에서 나가면 쓰던 감상이 날아간다.
                  */
                  <a
                    href={(data.answers[question.key] ?? "").trim()}
                    target="_blank"
                    rel="noreferrer"
                    className="pill pill-primary pill-block text-center"
                  >
                    🎨 작품 보러 가기 (새 창)
                  </a>
                ) : (
                  data.answers[question.key]
                )}
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
