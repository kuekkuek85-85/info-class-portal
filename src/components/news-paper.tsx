"use client";

import { ArtifactCanvas } from "@/components/artifact-canvas";
import type { Stroke, TextItem } from "@/lib/types";

/**
 * 완성된 신문 지면 (7차시 수행평가).
 *
 * 최종 제출한 학생이 자기 기사를 신문 꼴로 본다. 교사도 같은 지면을 본다.
 *
 * ## 이미지를 만들지 않는다
 *
 * CardNews 와 같은 방식이다 — 획 데이터로 캔버스에 다시 그리고 글을 배치할 뿐이다.
 * 이미지를 만들어 저장하려면 Cloud Storage 가 필요하고 그건 Blaze 전환을 뜻한다
 * (PRD 3.5). 화면에서 보이기만 하면 되는 물건에 요금제를 바꿀 이유가 없다.
 *
 * ## 세 가지 판형뿐이다
 *
 * 고르는 데 시간을 쓰면 안 된다. 종 치기 전에 마감해야 하는 시간이라, 셋을 넘기면
 * 고르다가 제출을 못 한다. 셋은 **무엇을 앞세우는가**로 갈린다 — 사진이냐, 말이냐,
 * 기사냐.
 *
 * ## 기자 이름은 학생 이름이다
 *
 * 기사의 주인공이 자기 자신인 활동이라, 서명도 자기 이름이어야 지면이 완성된다.
 * 이름이 없으면(임시 번호로 들어온 시연 참가자) 서명 줄을 통째로 뺀다 —
 * "  기자" 라고 빈 채로 뜨는 것보다 없는 편이 낫다.
 */

export type NewsTemplate = "top" | "interview" | "photo";

/**
 * 활동지 선택지 문구 → 판형. 고른 글자가 그대로 answers 에 들어온다.
 *
 * **맨 앞으로만 가른다.** includes 로 찾으면 「1면 톱 — 제목 크게, 사진 크게」 가
 * '사진' 에 걸려 사진 특집이 된다. 선택지 설명에 다른 판형의 낱말이 섞이는 것은
 * 막을 수 없으므로, 무엇으로 시작하는지만 본다.
 *
 * 못 알아보면 「1면 톱」이다 — 안 고르고 제출한 학생도 지면은 나와야 한다.
 */
export function templateOf(choice: string | undefined): NewsTemplate {
  const head = (choice ?? "").trim();
  if (head.startsWith("인터뷰")) return "interview";
  if (head.startsWith("사진")) return "photo";
  return "top";
}

export interface NewsPaperData {
  title: string;
  scene: string;
  change: string;
  real: string;
  interview: string;
  caption: string;
  strokes: Stroke[];
  texts: TextItem[];
  /** 서명. 빈 값이면 서명 줄을 그리지 않는다 */
  reporter: string;
}

const MASTHEAD = "2036  미  래  신  문";

export function NewsPaper({
  data,
  template,
}: {
  data: NewsPaperData;
  template: NewsTemplate;
}) {
  const hasDrawing = data.strokes.length > 0 || data.texts.length > 0;

  return (
    <article className="flex flex-col gap-4 rounded-lg border-2 border-ink bg-white p-4 sm:p-6">
      {/* 제호. 위아래 두 줄이 신문 1면의 표시다 */}
      <header className="border-y-2 border-ink py-2 text-center">
        <p className="t-eyebrow tracking-[0.3em]">{MASTHEAD}</p>
      </header>

      <h1 className={template === "photo" ? "t-headline" : "t-display"}>
        {data.title || "제목 없음"}
      </h1>

      {template === "interview" && data.interview && (
        /*
         * 인터뷰를 앞세우는 판형.
         *
         * 큰 따옴표로 시작하는 글을 지면 맨 위에 두면 신문의 인터뷰 기사가 된다.
         * 그러면 아래 본문이 "그 말이 나온 배경" 으로 읽힌다.
         */
        <blockquote className="border-l-4 border-ink pl-4 t-headline whitespace-pre-line">
          {data.interview}
        </blockquote>
      )}

      {hasDrawing && (
        <figure className="flex flex-col gap-1">
          <ArtifactCanvas
            strokes={data.strokes}
            texts={data.texts}
            pixelWidth={template === "photo" ? 1000 : 720}
            className="h-auto w-full rounded border border-line bg-white"
          />
          {data.caption && (
            <figcaption className="t-caption">▸ {data.caption}</figcaption>
          )}
        </figure>
      )}

      {/*
        본문을 두 단으로 흘린다.
        신문처럼 보이게 하는 것의 절반이 이 단 나눔이다. 좁은 화면에서는 한 단으로
        떨어진다 — 휴대폰에서 두 단이면 한 단에 대여섯 글자밖에 안 들어간다.
      */}
      <div
        className={
          template === "photo"
            ? "flex flex-col gap-3"
            : "flex flex-col gap-3 sm:columns-2 sm:gap-6 sm:[&>p]:mb-3"
        }
      >
        {[data.scene, data.change, data.real].map(
          (body, i) =>
            body && (
              <p key={i} className="t-note whitespace-pre-line sm:break-inside-avoid">
                {body}
              </p>
            ),
        )}
        {template !== "interview" && data.interview && (
          <p className="t-note whitespace-pre-line sm:break-inside-avoid">{data.interview}</p>
        )}
      </div>

      {data.reporter && (
        <p className="t-caption text-right">{data.reporter} 기자</p>
      )}
    </article>
  );
}
