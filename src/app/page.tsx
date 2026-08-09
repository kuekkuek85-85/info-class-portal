"use client";

import { useCallback, useState } from "react";
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
              <b className="font-bold">1학년 {codeInfo.classNo}반</b> · {codeInfo.lessonNo}차시{" "}
              {codeInfo.title}
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

      <footer className="mt-auto pt-6 text-center">
        <span className="t-caption">잘 안 되면 손을 들어 선생님께 알려 주세요</span>
      </footer>
    </main>
  );
}
