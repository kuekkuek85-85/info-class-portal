"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { DigitDisplay, NumberPad } from "@/components/number-pad";

/**
 * 학생 진입 화면. ① 수업 코드 → ② 학번 → ③ 확인 → ④ 오늘 수업 (PRD 3.1)
 *
 * 코드를 먼저 받는 순서가 핵심이다. 학번이 규칙적이라 학번을 먼저 받으면 아무 숫자나 넣어
 * 이름을 조회할 수 있다. 코드가 앞에 있으면 그 교실에 있는 학생만 이름 확인 화면에 도달한다.
 */

type Step = "code" | "studentId" | "confirm";

interface CodeInfo {
  classNo: number;
  lessonNo: number;
  title: string;
  period: number;
  /** 반이 섞인 수업(선택과목). 반·차시 번호를 감춘다 */
  mixed?: boolean;
}

interface Identified {
  studentId: string;
  name: string;
  temporary: boolean;
  description: string;
}

export default function EntryPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("code");
  const [code, setCode] = useState("");
  const [studentId, setStudentId] = useState("");
  const [codeInfo, setCodeInfo] = useState<CodeInfo | null>(null);
  const [identified, setIdentified] = useState<Identified | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const length = step === "code" ? 2 : 5;

  const post = useCallback(async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as { ok: boolean; message?: string; [key: string]: unknown };
  }, []);

  const submitCode = useCallback(
    async (raw: string) => {
      setBusy(true);
      setError("");
      const result = await post("/api/student/code", { code: raw });
      setBusy(false);

      if (!result.ok) {
        setError(result.message ?? "다시 시도해 주세요.");
        setCode("");
        return;
      }
      setCodeInfo(result as unknown as CodeInfo);
      setStep("studentId");
    },
    [post],
  );

  const submitStudentId = useCallback(
    async (raw: string) => {
      setBusy(true);
      setError("");
      const result = await post("/api/student/identify", { studentId: raw });
      setBusy(false);

      if (!result.ok) {
        setError(result.message ?? "다시 시도해 주세요.");
        setStudentId("");
        return;
      }
      setIdentified(result as unknown as Identified);
      setStep("confirm");
    },
    [post],
  );

  // 마지막 자리를 누르면 바로 넘어간다. 확인 버튼을 한 번 더 누르는 동작을 없애 진입을 줄인다.
  function pushDigit(digit: string) {
    if (busy) return;
    setError("");

    if (step === "code") {
      if (code.length >= 2) return;
      const next = code + digit;
      setCode(next);
      if (next.length === 2) void submitCode(next);
      return;
    }

    if (studentId.length >= 5) return;
    const next = studentId + digit;
    setStudentId(next);
    if (next.length === 5) void submitStudentId(next);
  }

  function popDigit() {
    setError("");
    if (step === "code") setCode((prev) => prev.slice(0, -1));
    if (step === "studentId") setStudentId((prev) => prev.slice(0, -1));
  }

  async function confirmYes() {
    if (!identified) return;
    setBusy(true);
    setError("");
    const result = await post("/api/student/confirm", { studentId: identified.studentId });
    setBusy(false);

    if (!result.ok) {
      setError(result.message ?? "다시 시도해 주세요.");
      setStep("studentId");
      setStudentId("");
      return;
    }
    router.replace("/lesson");
  }

  function confirmNo() {
    setIdentified(null);
    setStudentId("");
    setStep("studentId");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-5 py-8">
      <header className="text-center">
        <p className="t-eyebrow">장평중학교 1학년</p>
        <h1 className="t-display mt-1">정보 수업</h1>
      </header>

      {step === "code" && (
        <section className="flex flex-col gap-5">
          <h2 className="t-subhead text-center">
            칠판에 있는 <b className="font-bold">수업 코드</b>를 눌러 주세요
          </h2>
          <DigitDisplay value={code} length={length} />
          <NumberPad onDigit={pushDigit} onBackspace={popDigit} disabled={busy} />
        </section>
      )}

      {step === "studentId" && (
        <section className="flex flex-col gap-5">
          {codeInfo && (
            <p className="block bg-lime t-body-sm text-center">
              {/*
                반이 섞인 수업(선택과목)에서는 반도 차시 번호도 감춘다.
                "1학년 1반" 이라고 뜨면 나머지 세 반 학생은 코드를 잘못 눌렀다고 생각하고,
                차시 번호는 정보과와 겹치지 않게 100번대를 쓰고 있어 학생에게 뜻이 없다.
              */}
              {codeInfo.mixed ? (
                <b className="font-bold">{codeInfo.title}</b>
              ) : (
                <>
                  <b className="font-bold">1학년 {codeInfo.classNo}반</b> · {codeInfo.lessonNo}차시{" "}
                  {codeInfo.title}
                </>
              )}
            </p>
          )}
          <h2 className="t-subhead text-center">
            <b className="font-bold">학번 5자리</b>를 눌러 주세요
          </h2>
          <p className="t-body-sm text-center">예) 1학년 2반 9번 → 10209</p>
          <DigitDisplay value={studentId} length={length} />
          <NumberPad onDigit={pushDigit} onBackspace={popDigit} disabled={busy} />
          <button
            type="button"
            className="pill pill-ghost t-body-sm self-center"
            onClick={() => {
              setStep("code");
              setCode("");
              setStudentId("");
              setError("");
            }}
          >
            수업 코드 다시 입력
          </button>
        </section>
      )}

      {step === "confirm" && identified && (
        <section
          className="block flex flex-col gap-5 bg-cream text-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <h2 id="confirm-title" className="t-headline leading-relaxed">
            {identified.description}
            <br />
            {identified.temporary ? (
              <span className="font-normal">임시 번호로 들어갑니다</span>
            ) : (
              <>
                {identified.name} 학생 맞나요?
              </>
            )}
          </h2>

          {identified.temporary && (
            <p className="t-body-sm">
              명단에 없는 번호예요. 우선 수업에 들어가고, 수업이 끝나면 선생님께 알려 주세요.
            </p>
          )}

          {/*
            이탈 기록 고지 — 기능과 **같은 배포에** 싣는다.
            몰래 켜는 순간 이 기능은 교육적으로 실패한 것이 된다.

            둘째 줄을 굳이 넣는 이유: 사실이기도 하고, 9월 개인정보 단원에서
            "수집하지 않는 것을 수집하지 않는다고 정확히 말하는 것"의 실례가 된다.
          */}
          <p className="rounded-md bg-surface px-4 py-3 text-left t-body-sm">
            수업 화면을 벗어나면 <b>벗어난 시간</b>이 기록되고, 선생님이 볼 수 있어요.
            <br />
            어느 앱이나 사이트로 갔는지는 <b>알 수 없고, 기록되지도 않아요.</b>
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="pill pill-primary pill-block"
              onClick={confirmYes}
              disabled={busy}
            >
              네, 맞아요
            </button>
            <button
              type="button"
              className="pill pill-secondary pill-block"
              onClick={confirmNo}
              disabled={busy}
            >
              아니에요
            </button>
          </div>
        </section>
      )}

      {error && (
        <p className="block bg-pink t-body-sm text-center" role="alert">
          {error}
        </p>
      )}

      <footer className="mt-auto flex flex-col items-center gap-2 pt-6 text-center">
        <span className="t-caption">잘 안 되면 손을 들어 선생님께 알려 주세요</span>
        {/* 학생이 자기가 쓰는 서비스의 방침을 직접 열어 보는 것이 9월 개인정보 단원의 실례가 된다 */}
        <span className="flex gap-4 t-caption">
          <Link href="/terms" className="underline underline-offset-4">
            이용약관
          </Link>
          <Link href="/privacy" className="underline underline-offset-4">
            개인정보처리방침
          </Link>
        </span>
      </footer>
    </main>
  );
}
