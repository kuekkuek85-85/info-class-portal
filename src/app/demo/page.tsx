"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 교사 연수 시연 참가 화면.
 *
 * 링크 하나로 끝난다 — 코드도 학번도 묻지 않는다. 연수장에서 스무 명에게 번호를
 * 불러 주다 보면 반드시 겹치고, 겹치면 그림이 서로 덮인다. 서버가 빈 번호를 배정한다.
 *
 * 이 화면은 시연용이라 학생 화면과 말투를 달리한다. 보는 사람이 교사다.
 */
export default function DemoPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    setBusy(true);
    setError("");
    const response = await fetch("/api/demo/join", { method: "POST" });
    const result = await response.json();

    if (!result.ok) {
      setBusy(false);
      setError(result.message ?? "들어가지 못했어요.");
      return;
    }
    router.replace("/lesson");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <p className="t-eyebrow">정보 수업 포털</p>
        <h1 className="t-display mt-1">시연 참가</h1>
        <p className="t-body mt-3">
          아래 버튼을 누르면 시연용 수업에 바로 들어갑니다. 수업 코드나 학번을 입력하지
          않아도 됩니다.
        </p>
      </div>

      <button
        type="button"
        onClick={join}
        disabled={busy}
        className="pill pill-primary pill-block t-subhead py-5"
      >
        {busy ? "들어가는 중…" : "시연 참가하기"}
      </button>

      {error && (
        <p className="block bg-pink t-body-sm text-center" role="alert">
          {error}
        </p>
      )}

      {/*
        시연장에서 가장 먼저 나오는 질문이 "이거 진짜 학생 기록에 들어가나요?" 다.
        먼저 답해 둔다.
      */}
      <div className="rounded-lg bg-surface px-4 py-3 t-body-sm">
        <p className="font-bold">시연용으로 완전히 분리되어 있습니다.</p>
        <p className="mt-1">
          여기서 그리거나 쓴 것은 실제 학생 기록에 들어가지 않습니다. 참가자에게는 임시
          번호가 하나씩 배정되고, 이름은 남지 않습니다.
        </p>
      </div>
    </main>
  );
}
