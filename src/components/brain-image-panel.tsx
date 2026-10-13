"use client";

import { useState } from "react";

/**
 * 나의 뇌구조 이미지 패널 (마음 톡톡 8회기) — DrawBoard(손그림) 자리를 대신한다.
 *
 * 왼쪽 활동지(상황·감정·색·마음 크기)를 다 채우면 「뇌구조 이미지 만들기」 버튼이 켜진다.
 * 누르면 서버가 그 학생 artifact 의 답을 읽어 프롬프트를 조립해 Gemini 로 그림을 그려 저장하고,
 * 여기서 그 그림을 보여 준다. 다시 누르면 새로 그린다(재생성).
 *
 * ★ 학번·이름은 전송에 끼지 않는다 — 버튼은 서버 라우트만 부르고, 서버가 artifact 에서 답을 읽는다.
 * ★ 이 그림은 본인 것이라 친구에게 안 나간다(galleryEnabled:false, 전용 필드 저장).
 */

/** data URL 로 이미지를 읽어 온다 (캔버스 축소용). 실패하면 reject */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/**
 * 생성된 PNG(≈1MB)는 Firestore 문서 한도(1MB)에 안 들어간다. 저장용으로만 캔버스에서 길이를
 * 줄이고 JPEG 로 다시 떠서(≈100KB) 한도 안에 넣는다. 화면에 보이는 그림은 원본 그대로 쓴다.
 * 투명 PNG 가 JPEG 로 바뀌면 배경이 검어지므로 흰 배경을 먼저 깐다.
 */
async function compressForStore(dataUrl: string, maxSide = 768, quality = 0.82): Promise<string> {
  const img = await loadImage(dataUrl);
  const side = Math.max(img.width, img.height) || maxSide;
  const scale = Math.min(1, maxSide / side);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

/** 저장된 답에서 '상황'과 '감정 줄'이 다 있는지 — 버튼 활성 판정(클라이언트 1차, 서버가 재확인) */
function isReady(answers: Record<string, string>): boolean {
  const situation = (answers.brain_situation ?? "").trim();
  if (!situation) return false;
  const raw = (answers.brain_emotions ?? "").trim();
  if (!raw) return false;
  try {
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return false;
    return rows.some((row) => {
      if (!row || typeof row !== "object") return false;
      const r = row as { emotion?: unknown; color?: unknown };
      return String(r.emotion ?? "").trim() && String(r.color ?? "").trim();
    });
  } catch {
    return false;
  }
}

export function BrainImagePanel({
  answers,
  initial,
  prompt,
  disabled,
  onGenerated,
}: {
  /** 지금 활동지에 쓴 답(버튼 활성 판정용). 서버는 artifact 에서 다시 읽는다 */
  answers: Record<string, string>;
  /** 이미 만들어 둔 이미지(새로고침·탭 이동에도 남게 페이지가 들고 있다가 넘겨준다) */
  initial?: { dataUrl: string; at: number } | null;
  /** 그리기 안내 문구(계획의 drawPrompt) */
  prompt?: { heading: string; body: string } | null;
  disabled?: boolean;
  /** 생성 성공 시 페이지 상태에 반영(탭을 오가도 그림이 남게) */
  onGenerated?: (dataUrl: string) => void;
}) {
  const [image, setImage] = useState<string>(initial?.dataUrl ?? "");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "blocked">("idle");
  const [message, setMessage] = useState("");
  const ready = isReady(answers);

  async function generate() {
    if (disabled || status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      /*
       * 먼저 지금 쓴 상황·감정을 저장해 둔다 — 활동지 자동저장이 아직 날아가는 중일 수 있어
       * 서버가 옛 답을 읽는 것을 막는다. (서버는 answers 를 문항 키로 걸러 병합한다.)
       */
      await fetch("/api/student/artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: {
            brain_situation: answers.brain_situation ?? "",
            brain_emotions: answers.brain_emotions ?? "",
          },
        }),
      }).catch(() => undefined);

      const res = await fetch("/api/student/brain-image", { method: "POST" });
      const body = await res.json();

      if (!res.ok || !body.ok) {
        setStatus("error");
        setMessage(body?.message ?? "그림을 만들지 못했어요. 잠시 뒤에 다시 눌러 주세요.");
        return;
      }
      if (body.blocked) {
        setStatus("blocked");
        setMessage(body.message ?? "");
        return;
      }

      // 화면에는 원본 그림을 바로 보여 준다.
      setImage(body.dataUrl);
      setStatus("idle");
      onGenerated?.(body.dataUrl);

      /*
       * 저장은 작게 줄인 JPEG 로 artifact 에 올린다(원본은 1MB 를 넘어 문서에 안 들어간다).
       * 저장이 실패해도 방금 받은 그림은 화면에 그대로 있다 — 안내만 띄운다.
       */
      try {
        const small = await compressForStore(body.dataUrl);
        const save = await fetch("/api/student/artifact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brainImage: small }),
        });
        const saveJson = await save.json();
        if (save.ok && saveJson.ok && saveJson.brainSaved) {
          // 저장된(줄인) 그림으로 페이지 상태를 맞춰 둔다 — 새로고침·탭 이동에도 같은 그림이 뜬다.
          onGenerated?.(small);
        } else {
          setMessage("그림은 보여 줄게요. 저장이 잘 안 됐을 수 있어요 — 다시 만들면 저장돼요.");
        }
      } catch {
        setMessage("그림은 보여 줄게요. 저장이 잘 안 됐을 수 있어요 — 다시 만들면 저장돼요.");
      }
    } catch {
      setStatus("error");
      setMessage("연결이 끊겼어요. 잠시 뒤에 다시 눌러 주세요.");
    }
  }

  const loading = status === "loading";

  return (
    <div className="flex flex-col gap-4">
      {prompt && (prompt.heading || prompt.body) && (
        <div className="rounded-lg border border-line bg-surface p-4">
          {prompt.heading && <p className="t-title-sm mb-1">{prompt.heading}</p>}
          {prompt.body && <p className="t-body-sm whitespace-pre-line text-muted">{prompt.body}</p>}
        </div>
      )}

      {!ready && (
        <p className="t-body-sm rounded-lg border border-line bg-canvas p-3 text-muted">
          먼저 왼쪽 <b>활동지 쓰기</b> 에서 ‘상황’과 ‘감정·색·마음 크기’를 채워 주세요.
          다 채우면 아래 버튼이 켜져요.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={disabled || loading || !ready}
          className="pill pill-primary disabled:opacity-40"
        >
          {loading
            ? "그리는 중…"
            : image
              ? "다시 만들기"
              : "뇌구조 이미지 만들기"}
        </button>
        {loading && (
          <span className="t-caption text-muted">AI가 그림을 그리고 있어요 (최대 40초)</span>
        )}
      </div>

      {message && (
        <p
          className={`t-body-sm rounded-lg border p-3 ${
            status === "blocked"
              ? "border-line bg-surface"
              : "border-line bg-canvas text-muted"
          }`}
        >
          {message}
        </p>
      )}

      {loading && !image && (
        <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-xl border border-line bg-canvas">
          <span className="t-body-sm text-muted">잠시만 기다려 주세요…</span>
        </div>
      )}

      {image && (
        <figure className="flex flex-col gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL 은 next/image 로 못 다룬다 */}
          <img
            src={image}
            alt="내가 적은 감정으로 만든 나의 뇌구조 이미지"
            className="w-full max-w-md rounded-xl border border-line bg-white"
          />
          <figcaption className="t-caption text-muted">
            내가 적은 상황·감정·색·마음 크기로 AI가 그린 나의 뇌구조예요. 마음에 안 들면
            <b> 다시 만들기</b> 를 눌러요.
          </figcaption>
        </figure>
      )}
    </div>
  );
}
