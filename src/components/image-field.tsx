"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 사진 한 장을 붙이는 칸. 파일로 고르거나 클립보드에서 붙여넣는다.
 *
 * ## 왜 데이터 URL 로 저장하는가
 *
 * 이 앱에는 파일 보관소가 없다 (Firebase Storage 를 안 붙였고, 수업 당일에 붙일
 * 것도 아니다). 그래서 사진을 **줄여서 글자로 바꿔** 활동지 답에 그대로 넣는다.
 * 서버는 그 답을 문항의 maxLength 로 자르므로, 그 값이 곧 용량 상한이 된다.
 *
 * Firestore 문서 하나가 1MB 다. 답과 획이 같은 문서에 들어 있으므로 사진에
 * 마음껏 쓸 수가 없다. 그래서 **긴 변 900px · JPEG** 로 줄이고, 그래도 크면
 * 화질을 한 단씩 내린다. 영화 장면 캡처를 태블릿에서 보는 데는 그 정도면 넉넉하다.
 *
 * ## 왜 작게 줄이는 것이 화질 문제가 아닌가
 *
 * 활동지는 저장할 때 답을 **통째로** 다시 보낸다(1.5초 디바운스). 사진이 크면
 * 옆 칸에 한 글자 칠 때마다 그만큼이 다시 올라간다. 스물두 명이 같은 교실
 * 무선을 쓰는 자리라, 여기서 아낀 것이 그대로 수업 속도가 된다.
 *
 * ## 붙여넣기
 *
 * 노트북 학생은 캡처해서 Ctrl+V 가 제일 빠르다. 붙여넣기는 문서 전체에서 받는다 —
 * 칸을 먼저 눌러야 한다고 하면 그걸 모르는 학생이 "안 돼요" 로 손을 든다.
 * 클립보드에 그림이 들어 있을 때만 가로채므로, 글을 쓰다 글자를 붙여넣는 것은
 * 그대로 지나간다.
 */

/** 긴 변 상한. 태블릿 화면에서 장면을 알아보는 데 충분하다 */
const MAX_EDGE = 900;
/** 이 글자 수를 넘으면 화질을 한 단 내린다 (문항 maxLength 보다 넉넉히 아래) */
const TARGET_CHARS = 240_000;
const QUALITIES = [0.7, 0.55, 0.42, 0.3];

/** 파일 하나를 줄여서 데이터 URL 로. 못 하면 사유를 돌려준다 */
async function shrink(file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: "사진 파일만 붙일 수 있어요." };
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return { error: "이 사진을 열지 못했어요. 다른 파일로 해 볼래요?" };

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { error: "이 기기에서는 사진을 줄이지 못했어요." };
  /*
   * 투명한 PNG 를 JPEG 로 바꾸면 투명한 자리가 검게 나온다.
   * 흰 바탕을 먼저 깔아 둔다 — 캡처 이미지가 대부분이라 흰색이 자연스럽다.
   */
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  for (const quality of QUALITIES) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= TARGET_CHARS) return { url };
  }
  return { error: "사진이 너무 커요. 화면을 조금만 잘라서 다시 올려 주세요." };
}

export function ImageField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const take = useCallback(
    async (file: File | null | undefined) => {
      if (!file || disabled) return;
      setBusy(true);
      setError("");
      const result = await shrink(file).catch(() => ({ error: "사진을 붙이지 못했어요." }));
      setBusy(false);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      onChange(result.url);
    },
    [disabled, onChange],
  );

  /*
   * 문서 전체에서 붙여넣기를 받는다.
   *
   * 클립보드에 그림이 있을 때만 가져간다. 글자를 붙여넣는 것은 손대지 않으므로,
   * 학생이 활동지 다른 칸에 글을 붙여 넣는 것은 그대로 된다.
   */
  useEffect(() => {
    if (disabled) return;
    function onPaste(event: ClipboardEvent) {
      const item = [...(event.clipboardData?.items ?? [])].find((i) =>
        i.type.startsWith("image/"),
      );
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      event.preventDefault();
      void take(file);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [disabled, take]);

  return (
    <div className="flex flex-col gap-3">
      {value ? (
        <figure className="flex flex-col gap-2">
          {/*
            줄여서 담아 둔 데이터 URL 이라 next/image 로 감싸지 않는다.
            바깥 주소를 부르는 것이 아니고 크기도 이미 정해져 있다.
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="내가 붙인 사진"
            className="h-auto w-full rounded-lg border border-line bg-white"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={disabled || busy}
              className="pill pill-secondary t-body-sm"
            >
              다른 사진으로 바꾸기
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setError("");
              }}
              disabled={disabled}
              className="pill pill-secondary t-body-sm"
            >
              사진 지우기
            </button>
          </div>
        </figure>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-line px-4 py-6 text-center">
          <p className="t-body-sm text-muted">
            {busy ? "사진을 넣는 중이에요…" : "아직 사진이 없어요."}
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={disabled || busy}
            className="pill pill-primary self-center t-body-sm"
          >
            사진 고르기
          </button>
          <p className="t-caption text-muted">
            복사해 둔 사진이 있으면 Ctrl+V 로 바로 붙여넣어도 됩니다.
          </p>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void take(event.target.files?.[0]);
          // 같은 파일을 다시 골라도 이벤트가 오게 비워 둔다
          event.target.value = "";
        }}
      />

      {error && <p className="t-body-sm rounded-md bg-pink px-4 py-3">{error}</p>}
    </div>
  );
}
