"use client";

import { useEffect, useRef, useState } from "react";

import { AiReviewPanel } from "@/components/ai-review-panel";
import { EmotionLensPanel } from "@/components/emotion-lens-panel";
import { EmotionQuiz } from "@/components/emotion-quiz";
import { MoodRecheck } from "@/components/mood-recheck";
import { SubmitPanel, useJumpToField } from "@/components/submit-panel";
import { TeacherNotePanel } from "@/components/teacher-note-panel";
import { ArtifactCanvas } from "@/components/artifact-canvas";
import { TechExampleChips } from "@/components/tech-examples";
import {
  DEFAULT_SOURCE_HINTS,
  TRAITS,
  type Stroke,
  type TextItem,
  type WorksheetQuestion,
} from "@/lib/types";

/**
 * 활동지 — 그린 것을 말로 옮기는 단계.
 *
 * 그림만 그리고 끝나면 "그림 잘 그리는 학생"의 활동이 된다. 무엇을 왜 그렸는지 적게 해야
 * 기술 이야기가 되고, 그게 이 수업의 목적이다.
 *
 * 성찰과 같은 1.5초 자동 임시저장을 쓴다. 30분 수업의 뒷부분이라 종이 울릴 때 쓰던 것이
 * 날아가면 다시 받을 방법이 없다 (PRD 3.4).
 */

const AUTOSAVE_MS = 1500;

/**
 * 마지막으로 자동으로 채워 넣은 글을 적어 두는 자리.
 *
 * 학생이 그 뒤에 손을 댔는지 가리는 데 쓴다 — 지금 칸에 있는 글이 이것과 같으면
 * 손대지 않은 것이다. 문항으로 만들지 않았으므로 화면에는 안 나오고, CSV 내보내기는
 * 성찰만 내보내므로 밖으로도 안 나간다.
 */
function autoKeyOf(key: string): string {
  return `__auto_${key}`;
}

/**
 * `{키}` 를 그 칸의 답으로 바꾼다. 안 쓴 칸이 들어간 줄은 통째로 뺀다.
 *
 * 줄 단위로 빼는 이유: "꼭 필요한 기능은 {mvp_must1} 이야." 에서 기능을 안 썼을 때
 * "꼭 필요한 기능은  이야." 가 남으면, 학생이 그걸 그대로 캔바에 넣는다.
 */
function renderPrefill(template: string, answers: Record<string, string>): string {
  return template
    .split("\n")
    .map((line) => {
      let missing = false;
      const filled = line.replace(/\{(\w+)\}/g, (_, key: string) => {
        const answer = (answers[key] ?? "").trim();
        if (!answer) missing = true;
        return answer;
      });
      return missing ? "" : filled;
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

export interface WorksheetValue {
  answers: Record<string, string>;
  traits: string[];
  sources: { site: string; ai: string };
}

interface WorksheetViewProps {
  questions: WorksheetQuestion[];
  place: string;
  year: number;
  /**
   * 그리는 차시인가.
   *
   * 아니면 머리글이 통째로 거짓말이 된다 — 4차시(직업 조사)에서 "내 그림 설명하기 /
   * 2040년의 내가 고른 장소 — 무엇을 그렸는지 적어 주세요" 가 떠 있었다.
   * 그린 것도 고른 장소도 없는 화면이다.
   */
  canDraw: boolean;
  /** 출처 두 칸의 예시. 차시가 안 정하면 그림 활동 기준 기본값을 쓴다 */
  sourceHints?: { site: string; ai: string };
  /** 지난 차시에 쓴 답. 활동지 맨 위에 읽기 전용으로 붙는다 */
  carried?: { heading: string; rows: { label: string; value: string }[] } | null;
  /**
   * 제출 단추를 감춘다.
   *
   * 선택과목은 한 시간에 네 단계를 지나는데, 단계마다 "다 했어요" 가 뜨면 문제 정의만
   * 쓰고 끝내는 학생이 나온다. 마지막 단계에서만 띄운다.
   */
  hideSubmit?: boolean;
  /**
   * 출처 두 칸을 아예 안 띄운다.
   *
   * 이 칸은 수행평가1이 "출처 밝히기 태도" 를 평가해서 고정으로 붙여 둔 것이다
   * (PRD 7). 그 평가가 없는 차시에서는 매 화면 끝에 안 쓰는 상자가 하나 더 있는 셈이라
   * 오히려 방해가 된다 — 「인간과 인공지능」 3차시가 그렇다.
   */
  hideSources?: boolean;
  /**
   * 이 학생 이름. 문항 글의 {이름} 자리에 들어간다 (named 참조).
   *
   * 답으로 저장되지도, 어디로 보내지도 않는다 — 자기 화면에 자기 이름을 띄우는 것뿐이다.
   */
  studentName?: string;
  /**
   * 이 학생 학번. 문항 글의 {학교계정} 자리에 학교 계정 주소로 만들어 들어간다 (named 참조).
   *
   * 답으로 저장되지도, 어디로 보내지도 않는다 — studentName 과 같다.
   */
  studentId?: string;
  /**
   * 차시가 정한 활동지 첫 화면 문구. heading 과 기본값 둘 다를 이긴다 (ActivityContent
   * 의 worksheetIntro). 그림을 재료 삼아 다른 글을 쓰는 활동지에서 기본 문구가
   * "무엇을 그렸는지 적어 주세요" 라고 거짓말하는 것을 막는다.
   */
  intro?: { heading: string; body: string } | null;
  /**
   * 오늘 처음 기분 체크에서 고른 낱말. mood_recheck 문항이 나란히 띄운다.
   * 기분 기록은 활동지가 아니라 moodEntries 에 있어서 여기로 받아 온다.
   */
  firstMood?: string;
  /** 맨 위 제목. 안 주면 차시 성격에 따라 "내 그림 설명하기" / "활동지 쓰기" */
  heading?: string;
  strokes: Stroke[];
  texts: TextItem[];
  value: WorksheetValue;
  onChange: (value: WorksheetValue) => void;
  onSubmit: () => Promise<void> | void;
  submitted: boolean;
  submitError: string;
  disabled?: boolean;
}

/** 앞말에 받침이 있을 때 / 없을 때 쓰는 조사 짝 */
const PARTICLE_PAIRS: Record<string, [string, string]> = {
  은: ["은", "는"],
  는: ["은", "는"],
  이: ["이", "가"],
  가: ["이", "가"],
  을: ["을", "를"],
  를: ["을", "를"],
  과: ["과", "와"],
  와: ["과", "와"],
};

/**
 * 문항 글에 박힌 {이름} 을 그 학생 이름으로 바꾼다.
 *
 * 6차시 수행평가 준비에서 "이야기 주인공을 내 이름으로 써라" 를 시킨다. 그때 안내가
 * "내 이름을 넣으세요" 이면 중1은 그냥 "나는" 이라고 쓴다. 예문에 자기 이름이 박혀
 * 나와야 무엇을 하라는 것인지 한 번에 안다.
 *
 * ## 조사까지 같이 고른다
 *
 * "{이름}은" 이라고 적어 두고 이름만 끼워 넣으면 받침 없는 이름에서 "이서은" 이 된다.
 * 자기 이름이 틀린 문장으로 화면에 떠 있으면 중1은 그 지시를 안 믿는다. 그래서
 * 이름 뒤에 붙은 조사도 받침을 보고 고른다 — 한글 음절은 (코드 - 가) % 28 이 0 이
 * 아니면 받침이 있다.
 *
 * 이름을 아직 모르면(불러오는 중) "내 이름" 으로 물러난다. 빈칸으로 두면
 * "2036년, 은 …" 같은 문장이 뜬다.
 */
function named(text: string, studentName: string, studentId = ""): string {
  let out = text;

  if (out.includes("{이름}")) {
    const name = studentName.trim() || "내 이름";
    const last = name.codePointAt(name.length - 1) ?? 0;
    const hasFinal = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;

    out = out.replaceAll(/\{이름\}([은는이가을를과와])?/g, (_match, particle?: string) => {
      const pair = particle ? PARTICLE_PAIRS[particle] : undefined;
      return pair ? name + (hasFinal ? pair[0] : pair[1]) : name;
    });
  }

  /*
   * {학교계정} — 학교 마이크로소프트 계정 주소를 대신 만들어 준다.
   *
   * 「인간과 인공지능」 2차시에서 캔바 로그인에 시간이 제일 많이 갔다. 안내가
   * "26 뒤에 내 학번 5자리를 붙이세요" 였는데, 중1에게 이건 두 가지 일이다 —
   * 규칙을 이해하고, 서른 자짜리 주소를 오타 없이 치는 것. 스물두 명이면 그중 몇은
   * 반드시 틀리고, 틀린 학생은 왜 안 되는지 스스로 못 찾아 손을 든다.
   *
   * 화면이 이미 학번을 알고 있으므로 만들어서 보여준다. 규칙은 계속 옆에 적어 두되
   * 학생이 계산할 필요는 없게 한다.
   *
   * 학번을 아직 모르면(불러오는 중) 원래 안내 문구로 물러난다 — 빈칸이나
   * "26@..." 처럼 반쯤 만들어진 주소를 띄우면 그것을 그대로 쳐 넣는다.
   */
  if (out.includes("{학교계정}")) {
    const id = studentId.trim();
    out = out.replaceAll("{학교계정}", id ? `26${id}@jangpyung.sen.ms.kr` : "26 + 내 학번 5자리 @jangpyung.sen.ms.kr");
  }

  return out;
}

export function WorksheetView({
  questions,
  place,
  year,
  canDraw,
  sourceHints = DEFAULT_SOURCE_HINTS,
  carried,
  hideSubmit,
  hideSources,
  firstMood,
  studentName = "",
  studentId = "",
  intro,
  heading,
  strokes,
  texts,
  value,
  onChange,
  onSubmit,
  submitted,
  submitError,
  disabled,
}: WorksheetViewProps) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(JSON.stringify(value));

  // 입력이 멈추면 조용히 올린다. 학생은 저장 버튼을 누를 생각을 하지 않는다.
  useEffect(() => {
    if (disabled) return;
    const serialized = JSON.stringify(value);
    if (serialized === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      const response = await fetch("/api/student/artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: value.answers,
          traits: value.traits,
          sources: value.sources,
        }),
      });
      const result = await response.json();
      if (result.ok) {
        lastSaved.current = serialized;
        setState("saved");
      } else {
        setState("idle");
      }
    }, AUTOSAVE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, disabled]);

  function setAnswer(key: string, text: string) {
    onChange({ ...value, answers: { ...value.answers, [key]: text } });
  }

  /**
   * 앞 답으로 칸을 미리 채운다. 그리고 **앞 답이 바뀌면 따라서 고쳐 준다.**
   *
   * 읽기 전용으로 옆에 보여주기만 하면 학생은 그것을 손으로 옮겨 적는다. 45분에 뽑기까지
   * 가야 하는 수업에서 그 시간이 아깝고, 옮겨 적다가 내용이 달라지기도 한다.
   *
   * ## 되돌아가서 고친 것이 따라와야 한다
   *
   * 되돌아가기로 "꼭 필요한 기능" 을 고쳐 놓고 만들기 화면에 오면, 프롬프트는 옛 기능이
   * 적힌 채 그대로였다. 학생은 고쳤다고 생각하고 그대로 캔바에 넣는다 — 고친 것이
   * 결과물에 반영이 안 된다.
   *
   * 그렇다고 무조건 덮으면 학생이 프롬프트를 손봐 둔 것을 날린다. 그래서 **우리가 채워
   * 넣은 글 그대로인지** 를 기준으로 가른다 (`__auto_키` 에 마지막으로 채운 글을 남겨 둔다).
   *  · 손대지 않았으면 → 조용히 다시 만든다. 학생은 늘 최신 프롬프트를 본다
   *  · 손댔으면 → 덮지 않고, 아래에 "다시 만들기" 단추만 띄운다 (canRefresh)
   *
   * 일부러 지운 칸도 되살리지 않는다 — 지웠는데 다음 렌더에서 살아나면 지울 수가 없다.
   */
  useEffect(() => {
    if (disabled) return;

    const next: Record<string, string> = {};
    for (const question of questions) {
      if (!question.prefillTemplate) continue;

      const fresh = renderPrefill(question.prefillTemplate, value.answers);
      if (!fresh) continue;

      const current = value.answers[question.key] ?? "";
      const auto = value.answers[autoKeyOf(question.key)] ?? "";

      // 아직 한 번도 안 채웠고 칸이 비어 있다 → 처음 채운다
      const firstFill = !current.trim() && !auto;
      // 우리가 채운 그대로다 → 앞 답이 바뀌었으면 따라서 고친다
      const untouched = current === auto && current !== fresh;

      if (!firstFill && !untouched) continue;
      next[question.key] = fresh;
      next[autoKeyOf(question.key)] = fresh;
    }

    if (Object.keys(next).length > 0) {
      onChange({ ...value, answers: { ...value.answers, ...next } });
    }
  }, [questions, value, disabled, onChange]);

  /**
   * "다시 만들기" 단추를 띄울 칸인가.
   *
   * 앞 답이 바뀌었는데 **자동 갱신이 안 되는** 경우에만 뜬다 — 학생이 직접 손봤거나
   * 일부러 지운 칸이다. 손대지 않은 칸은 위 effect 가 알아서 고치므로 여기서 걸리지 않는다.
   */
  function canRefresh(question: WorksheetQuestion): boolean {
    if (!question.prefillTemplate || disabled) return false;
    const fresh = renderPrefill(question.prefillTemplate, value.answers);
    if (!fresh) return false;
    const current = value.answers[question.key] ?? "";
    return fresh !== current && current !== (value.answers[autoKeyOf(question.key)] ?? "");
  }

  /** 학생이 손본 프롬프트를 앞 답으로 다시 만든다 (canRefresh 일 때만 단추가 보인다) */
  function refreshPrefill(question: WorksheetQuestion) {
    const fresh = renderPrefill(question.prefillTemplate ?? "", value.answers);
    if (!fresh) return;
    onChange({
      ...value,
      answers: {
        ...value.answers,
        [question.key]: fresh,
        [autoKeyOf(question.key)]: fresh,
      },
    });
  }

  /** 7차시 제출 칸의 「그 칸으로」 가 쓴다 */
  const jumpToField = useJumpToField();

  /** 방금 복사한 칸 — 눌렀는데 아무 일도 안 일어난 것처럼 보이면 또 누른다 */
  const [copied, setCopied] = useState("");

  /**
   * @param mark  「복사됐어요」를 어느 단추에 띄울지. 한 문항에 단추가 둘일 수 있다
   * @param text  복사할 글
   * @param fieldId  복사가 막혔을 때 대신 골라 줄 칸
   */
  async function copy(mark: string, text: string, fieldId: string) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(mark);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      /*
       * 클립보드가 막히는 경우가 있다 (창이 포커스를 안 받았거나 브라우저 설정).
       *
       * 그냥 삼키면 학생 눈에는 **눌렀는데 아무 일도 안 일어난 것**으로 보이고,
       * 그러면 계속 누른다. 대신 칸의 글자를 통째로 선택해 준다 —
       * 그 상태에서 Ctrl+C 한 번이면 되고, 무엇을 하라는지도 눈에 보인다.
       */
      const field = document.getElementById(fieldId);
      if (field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement) {
        field.focus();
        field.select();
      }
      setCopied(`${mark}__manual`);
      setTimeout(() => setCopied(""), 4000);
    }
  }

  function toggleTrait(trait: string) {
    const next = value.traits.includes(trait)
      ? value.traits.filter((item) => item !== trait)
      : [...value.traits, trait];
    onChange({ ...value, traits: next });
  }

  return (
    <section className="flex flex-col gap-6">
      {/*
        머리글은 셋 중 하나다.
         · 차시가 정한 문구 (intro) — 그림을 재료로 다른 글을 쓰는 활동지가 있다
         · 단계 이름 (heading) — 한 시간에 여러 활동지를 지나는 선택과목
         · 기본값 — 그림을 설명하는 활동지
      */}
      <div>
        <h2 className="t-display">
          {intro?.heading ?? heading ?? (canDraw ? "내 그림 설명하기" : "활동지 쓰기")}
        </h2>
        <p className="t-body mt-2 whitespace-pre-line">
          {intro?.body ??
            (canDraw
              ? `${year}년의 ${place || "내가 고른 장소"} — 무엇을 그렸는지 적어 주세요.`
              : "아래 질문에 차례로 답해 주세요. 쓰는 동안 자동으로 저장돼요.")}
        </p>
      </div>

      {/*
        그림을 위에 띄워 둔다. 자기가 뭘 그렸는지 보면서 써야 답이 구체적으로 나온다.

        높이를 화면의 3분의 1로 묶는다. 폭에만 맞추면 넓은 화면에서 미리보기 하나가
        976px을 먹어(1366×768에서 실측) 첫 질문조차 보이지 않는다. 여기서는 그리는 게
        아니라 보고 쓰는 것이므로, 그림보다 질문이 보이는 편이 낫다.
      */}
      {/*
        지난 차시에 쓴 답. 고쳐 쓰는 칸이 아니라 **보고 이어 쓰라고** 띄운다.
        5차시가 "내 희망 직업" 에서 출발하는데 그 답은 4차시에 이미 있다.
      */}
      {carried && carried.rows.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg bg-cream px-4 py-3">
          <p className="t-caption">{carried.heading}</p>
          {carried.rows.map((row) => (
            <p key={row.label} className="t-body-sm">
              <span className="font-semibold">{row.label} · </span>
              {row.value}
            </p>
          ))}
        </div>
      )}

      {/* 그림이 없는 차시(4차시 직업 조사)에서는 빈 흰 상자만 남는다 — 아예 뺀다 */}
      {(strokes.length > 0 || texts.length > 0) && (
        <div className="flex justify-center rounded-lg border border-line p-2">
          <ArtifactCanvas
            strokes={strokes}
            texts={texts}
            pixelWidth={640}
            className="h-auto max-h-[32dvh] w-auto max-w-full rounded bg-white"
          />
        </div>
      )}

      {/*
        id 를 문항 래퍼에 붙인다.
        7차시 제출 칸의 「그 칸으로」 가 이것으로 찾아간다 (submit-panel 의 useJumpToField).
        안쪽에서 쓰는 `ws-` 접두사와 겹치지 않게 `q-` 로 둔다.
      */}
      {questions.map((question) => (
        <div key={question.key} id={`q-${question.key}`} className="flex flex-col gap-2">
          {/*
            note 는 답할 것이 없다. label 로 두면 눌렀을 때 엉뚱한 칸에 커서가 가고,
            읽는 프로그램에는 "답이 없는 입력칸" 으로 들린다.
          */}
          {question.kind === "note" ? (
            <p className="block bg-cream t-subhead">
              {named(question.label, studentName, studentId)}
            </p>
          ) : /* 제목 없이 답만 다시 보여주는 경우가 있다 (앞 문항 바로 아래에 붙일 때) */
          question.kind === "echo" && !question.label ? null : (
            <label htmlFor={`ws-${question.key}`} className="block bg-cream t-subhead">
              {named(question.label, studentName, studentId)}
            </label>
          )}
          {question.hint && (
            <p className="t-note whitespace-pre-line">
              {named(question.hint, studentName, studentId)}
            </p>
          )}

          {/*
            정해진 글을 복사하게 한다 (학교 계정 주소).

            읽기 전용 칸으로 함께 그리는 이유가 둘이다. 하나는 복사가 막히는 기기에서
            이 칸을 골라 주는 것으로 물러날 수 있다는 것 (아래 copy 의 폴백).
            다른 하나는 무엇이 복사됐는지 눈에 보인다는 것 — 안 보이면 눌러 놓고도
            제대로 됐는지 몰라서 또 누른다.

            치환을 여기서도 건다. 그래야 학생마다 자기 계정 주소가 복사된다.
          */}
          {question.copyText && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={`ws-copy-${question.key}`}
                type="text"
                readOnly
                value={named(question.copyText, studentName, studentId)}
                onFocus={(event) => event.currentTarget.select()}
                className="field t-body-sm min-w-0 flex-1 font-semibold"
              />
              <button
                type="button"
                onClick={() =>
                  void copy(
                    `${question.key}__text`,
                    named(question.copyText ?? "", studentName, studentId),
                    `ws-copy-${question.key}`,
                  )
                }
                className="pill pill-secondary t-body-sm shrink-0"
              >
                {copied === `${question.key}__text`
                  ? "복사됐어요"
                  : copied === `${question.key}__text__manual`
                    ? "골라 뒀어요 — Ctrl+C"
                    : "복사하기"}
              </button>
            </div>
          )}

          {/*
            주소를 글자로 보여주지 않고 누를 수 있게 한다. 캔바 초대 주소는 토큰이 붙어
            100자가 넘어서, 옮겨 적으라고 하면 그 자리에서 수업이 멈춘다.
            새 창으로 연다 — 같은 창에서 나가면 쓰던 답이 날아간다.
          */}
          {question.linkUrl && (
            <a
              href={question.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="pill pill-primary pill-block text-center"
            >
              {question.linkLabel || "열기"}
            </a>
          )}

          {/*
            낱말 보기. 힌트 한 줄로는 모자란 질문에만 붙는다.
            힌트 **아래** 입력칸 **위** 자리다 — 읽고 나서 바로 쓰게 된다.
          */}
          {question.examples && question.examples.length > 0 && (
            <TechExampleChips items={question.examples} note={question.examplesNote} />
          )}

          {question.kind === "note" ? null : question.kind === "echo" ? (
            /*
              앞 단계에서 쓴 답. 고치는 칸이 아니라 **보고 옮겨 적으라고** 띄운다.
              한 시간에 여러 단계를 지나면 앞 단계 답이 화면에서 사라지는데,
              되돌아가기가 꺼진 수업에서는 학생이 볼 방법이 아예 없다.
            */
            <div className="flex flex-col gap-1 rounded-lg bg-cream px-4 py-3">
              {(question.echoKeys ?? []).map((row) => {
                const written = (value.answers[row.key] ?? "").trim();
                return (
                  <p key={row.key} className="t-body-sm">
                    <span className="font-semibold">{row.label} · </span>
                    {/* 안 쓴 칸은 비워 두지 않는다 — 빈 줄만 보면 고장으로 읽는다 */}
                    {!written && <span className="text-muted">(아직 안 썼어요)</span>}
                    {/*
                      주소는 눌러서 열 수 있게 한다. "만든 화면을 띄워 놓고 답해 주세요" 라고
                      해 놓고 주소를 글자로만 보여주면 학생이 손으로 옮겨 적는다.
                      새 창으로 연다 — 여기서 나가면 쓰던 답이 날아간다.
                    */}
                    {written &&
                      (/^https?:\/\//.test(written) ? (
                        <a
                          href={written}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all underline"
                        >
                          {written}
                        </a>
                      ) : (
                        written
                      ))}
                  </p>
                );
              })}
            </div>
          ) : question.kind === "submit" ? (
            <SubmitPanel
              question={question}
              selfCheck={value.answers.news_check2 ?? ""}
              templateChoice={value.answers.news_template ?? ""}
              /*
                지면 재료. 저장을 기다리지 않고 지금 화면의 값을 그대로 넘긴다 —
                최종 제출 직후에 뜨는 것이라 방금 고친 문장이 반영돼야 한다.
              */
              paper={{
                title: value.answers.news_title ?? "",
                scene: value.answers.news_scene ?? "",
                change: value.answers.news_change ?? "",
                real: value.answers.news_real ?? "",
                interview: named(value.answers.news_interview ?? "", studentName),
                caption: value.answers.news_caption ?? "",
                strokes,
                texts,
                // 임시 번호로 들어온 참가자는 이름이 없다. 그때는 서명 줄을 뺀다
                reporter: studentName.trim(),
              }}
              onJump={jumpToField}
              disabled={disabled}
            />
          ) : question.kind === "ai_review" ? (
            <AiReviewPanel
              questionKey={question.key}
              raw={value.answers[question.key] ?? ""}
              onResult={(raw) => setAnswer(question.key, raw)}
              disabled={disabled}
            />
          ) : question.kind === "teacher_note" ? (
            /*
              선생님 말은 답이 아니라 받아 보는 것이라 answers 에 안 담는다.
              화면이 직접 조회해서 그린다 (teacher-note-panel).
            */
            <TeacherNotePanel />
          ) : question.kind === "emotion_lens" ? (
            <EmotionLensPanel
              questionKey={question.key}
              raw={value.answers[question.key] ?? ""}
              onResult={(raw) => setAnswer(question.key, raw)}
              disabled={disabled}
            />
          ) : question.kind === "emotion_quiz" ? (
            <EmotionQuiz
              question={question}
              raw={value.answers[question.key] ?? ""}
              onResult={(raw) => setAnswer(question.key, raw)}
              disabled={disabled}
            />
          ) : question.kind === "mood_recheck" ? (
            <MoodRecheck
              value={value.answers[question.key] ?? ""}
              firstMood={firstMood ?? ""}
              onChange={(mood) => setAnswer(question.key, mood)}
              disabled={disabled}
            />
          ) : question.kind === "traits" ? (
            <div className="flex flex-wrap gap-2" id={`ws-${question.key}`}>
              {TRAITS.map((trait) => {
                const on = value.traits.includes(trait);
                return (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleTrait(trait)}
                    aria-pressed={on}
                    disabled={disabled}
                    className={`pill t-body ${on ? "pill-primary" : "pill-secondary"}`}
                  >
                    {trait}
                  </button>
                );
              })}
            </div>
          ) : question.kind === "multi" ? (
            /*
              보기 중 여럿. 고른 것들을 " · " 로 이어 한 칸에 담는다.

              traits 를 못 쓴다. 그쪽은 미래 특성 다섯 개에 고정돼 있고 답이 answers 가
              아니라 artifacts.traits 로 따로 간다 — 차시마다 다른 보기를 줄 수가 없다.

              하나만 고르게 하면 "이것도 저것도 나 같은데" 에서 학생이 멈춘다. 감정은
              원래 섞여 있어서, 섞어서 고르는 것이 오히려 정확한 답이다.
            */
            (() => {
              const picked = (value.answers[question.key] ?? "")
                .split(" · ")
                .map((s) => s.trim())
                .filter(Boolean);
              return (
                <div className="flex flex-wrap gap-2" id={`ws-${question.key}`}>
                  {(question.choices ?? []).map((choice) => {
                    const on = picked.includes(choice);
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => {
                          // 고른 차례가 아니라 **보기 차례**로 담는다. 답이 늘 같은 순서로 읽힌다
                          const next = (question.choices ?? []).filter((c) =>
                            c === choice ? !on : picked.includes(c),
                          );
                          setAnswer(question.key, next.join(" · "));
                        }}
                        aria-pressed={on}
                        disabled={disabled}
                        className={`pill t-body ${on ? "pill-primary" : "pill-secondary"}`}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              );
            })()
          ) : question.kind === "choice" ? (
            /*
              보기 중 하나. 고른 문구가 그대로 답이 된다.
              보기 안에 판단 근거가 들어 있어서(types.ts 의 choices 참조) 고르는 순간
              이유를 함께 고르게 된다 — 그래서 짧은 라벨로 줄이지 않는다.
            */
            <div className="flex flex-col gap-2" id={`ws-${question.key}`}>
              {(question.choices ?? []).map((choice) => {
                const on = (value.answers[question.key] ?? "") === choice;
                return (
                  <button
                    key={choice}
                    type="button"
                    // 누른 것을 다시 누르면 고른 것이 풀린다. 잘못 눌러 놓고 못 바꾸면 답답하다
                    onClick={() => setAnswer(question.key, on ? "" : choice)}
                    aria-pressed={on}
                    disabled={disabled}
                    className={`rounded-lg border-2 px-4 py-3 text-left t-body-sm transition active:scale-[0.99] ${
                      on ? "border-ink bg-ink text-canvas" : "border-line bg-canvas"
                    }`}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          ) : question.kind === "long" ? (
            <textarea
              id={`ws-${question.key}`}
              value={value.answers[question.key] ?? ""}
              onChange={(event) => setAnswer(question.key, event.target.value)}
              rows={3}
              maxLength={question.maxLength || 500}
              disabled={disabled}
              className="field disabled:opacity-60"
              placeholder="여기에 적어 주세요"
            />
          ) : (
            <>
              <input
                id={`ws-${question.key}`}
                value={value.answers[question.key] ?? ""}
                onChange={(event) => setAnswer(question.key, event.target.value)}
                maxLength={question.maxLength || 200}
                disabled={disabled}
                className="field disabled:opacity-60"
                placeholder="여기에 적어 주세요"
              />
              {question.maxLength > 0 && question.maxLength <= 80 && (
                <span className="t-caption self-end">
                  {(value.answers[question.key] ?? "").length} / {question.maxLength}자
                </span>
              )}
            </>
          )}

          {/*
            앞 답을 고쳤는데 이 칸은 학생이 손봐 둔 경우.

            손본 것을 말없이 덮으면 안 되고, 그렇다고 옛 내용인 채로 두면 고친 것이
            결과물에 반영이 안 된다. 그래서 알려만 주고 고를 수 있게 한다.
            손대지 않은 칸은 저절로 갱신되므로 여기까지 오지 않는다.
          */}
          {canRefresh(question) && (
            <div className="flex flex-col gap-2 rounded-lg bg-cream px-4 py-3">
              <p className="t-body-sm">
                앞에서 고친 내용이 이 칸에는 아직 안 들어갔어요. 직접 고친 글이라 그대로
                두었습니다.
              </p>
              <button
                type="button"
                onClick={() => refreshPrefill(question)}
                disabled={disabled}
                className="pill pill-secondary t-body-sm self-start"
              >
                앞 답으로 다시 만들기
              </button>
            </div>
          )}

          {/*
            다른 곳에 붙여 넣을 값이면 복사 단추를 준다. 긁어서 복사하는 것은 태블릿에서
            잘 안 된다 — 손가락으로 끝을 맞추다 글자가 지워지기도 한다.
          */}
          {question.copyable && (
            <button
              type="button"
              onClick={() =>
                void copy(question.key, value.answers[question.key] ?? "", `ws-${question.key}`)
              }
              disabled={disabled || !(value.answers[question.key] ?? "").trim()}
              className="pill pill-secondary t-body-sm self-start disabled:opacity-35"
            >
              {copied === question.key
                ? "복사됐어요"
                : copied === `${question.key}__manual`
                  ? "글자를 골라 뒀어요 — Ctrl+C 를 누르세요"
                  : "복사하기"}
            </button>
          )}
        </div>
      ))}

      {/*
        출처 두 칸은 고정이다. 수행평가1이 "출처 밝히기 태도"를 평가하므로,
        쓸 자리가 없어서 못 썼다는 상황을 만들지 않는다 (PRD 7).

        단계를 쪼개 쓰는 차시에서는 마지막 단계에만 붙인다 — 문제 정의 칸 아래에도
        "어디에서 찾아봤나요" 가 나오면 매 단계 같은 상자를 지나야 한다.
      */}
      <div
        className="flex flex-col gap-3 rounded-lg border border-line p-4"
        hidden={hideSubmit || hideSources}
      >
        <h3 className="t-subhead">어디에서 찾아봤나요?</h3>
        <p className="t-note">안 찾아봤으면 비워 둬도 됩니다. 찾아봤으면 꼭 적어 주세요.</p>

        <label className="flex flex-col gap-1">
          <span className="t-body-sm">인터넷에서 찾은 곳</span>
          <input
            value={value.sources.site}
            onChange={(event) =>
              onChange({ ...value, sources: { ...value.sources, site: event.target.value } })
            }
            maxLength={300}
            disabled={disabled}
            placeholder={sourceHints.site}
            className="field disabled:opacity-60"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="t-body-sm">AI에게 물어봤다면</span>
          <input
            value={value.sources.ai}
            onChange={(event) =>
              onChange({ ...value, sources: { ...value.sources, ai: event.target.value } })
            }
            maxLength={300}
            disabled={disabled}
            placeholder={sourceHints.ai}
            className="field disabled:opacity-60"
          />
        </label>
      </div>

      <span className="t-caption" aria-live="polite">
        {state === "saving" && "저장 중…"}
        {state === "saved" && "자동 저장됨"}
        {state === "idle" && "쓰는 동안 자동으로 저장돼요"}
      </span>

      {submitError && <p className="rounded-md bg-pink px-4 py-3 t-body-sm">{submitError}</p>}

      {!hideSubmit && (
        <>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={disabled}
            className="pill pill-primary pill-block"
          >
            {/*
              그림은 그리는 순간 이미 갤러리에 올라간다. 이 버튼은 "다 했어요" 표시라,
              문구도 그렇게 바꾼다 — 누르지 않으면 안 보인다고 오해하면 조급해진다.
            */}
            {submitted ? "다시 냈어요" : "다 했어요 — 선생님께 알리기"}
          </button>

          {submitted && (
            <p className="t-body-sm text-center">
              선생님께 알렸어요. 수업이 끝나기 전까지는 계속 고칠 수 있습니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}
