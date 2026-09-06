"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useTeacherDate } from "@/lib/teacher-date";
import { setTeacherJump } from "@/lib/teacher-jump";

/**
 * 교사 대시보드 AI 조교 — 우하단 플로팅 버튼 → 채팅 팝업.
 *
 * `TeacherShell` 안에만 붙어서 교사 화면에서만 뜬다(학생 화면엔 없다). 대화는 이 브라우저의
 * localStorage 에만 쌓이고 서버로 저장되지 않는다. 답에 붙는 「출처」 칩을 누르면 그 날짜·
 * 세션으로 대시보드가 열린다(teacher-jump). 앱 링크 출처는 새 창으로 연다.
 */

interface Source {
  label: string;
  course: string;
  date?: string;
  sessionId?: string;
  href?: string;
}
interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: Source[];
}
interface Attachment {
  mimeType: string;
  dataUrl: string;
}

const STORAGE_KEY = "teacher-assistant-chat";
const MAX_STORED = 40;
const MAX_ATTACH = 4;

const EXAMPLES = [
  "8월 31일 무슨 수업을 했어?",
  "인간과 인공지능 화요일 1기 4차시 계획 알려줘",
  "3반 12번 학생 산출물 찾아줘",
];

export function TeacherAssistant() {
  const router = useRouter();
  const [, setDate] = useTeacherDate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // 이력 불러오기 — 마운트 뒤에 읽는다(teacher-date 와 같은 하이드레이션 이유)
  useEffect(() => {
    const restore = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setMessages(JSON.parse(raw) as Msg[]);
      } catch {
        // 저장소를 막아 둔 브라우저 — 빈 대화로 시작하면 된다
      }
      loaded.current = true;
    };
    restore();
  }, []);

  // 이력 저장 (불러오기 전에는 덮어쓰지 않는다)
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch {
      // 저장 실패는 넘어간다 — 이번 세션 대화는 화면에 남아 있다
    }
  }, [messages]);

  // 새 메시지가 오면 목록을 아래로
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open, sending]);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      next.push({ mimeType: file.type, dataUrl });
    }
    setAttachments((prev) => [...prev, ...next].slice(0, MAX_ATTACH));
  }

  async function send() {
    const question = input.trim();
    if (!question || sending) return;

    // 이번 질문 이전까지가 대화 이력
    const history = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", text: m.text }));
    const images = attachments.map((a) => ({ mimeType: a.mimeType, dataBase64: a.dataUrl }));

    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setAttachments([]);
    setSending(true);
    try {
      const response = await fetch("/api/teacher/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history, images }),
      });
      const data = await response.json();
      const text = data?.ok ? String(data.reply ?? "") : String(data?.message ?? "지금은 답을 못 만들었어요.");
      setMessages((prev) => [...prev, { role: "assistant", text, sources: data?.sources ?? [] }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "연결에 문제가 있었어요. 잠시 후 다시 시도해 주세요." }]);
    } finally {
      setSending(false);
    }
  }

  function jump(source: Source) {
    if (source.href) {
      window.open(source.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (source.date) {
      setDate(source.date);
      if (source.sessionId) setTeacherJump({ date: source.date, sessionId: source.sessionId });
    }
    setOpen(false);
    router.push("/teacher/dashboard");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="AI 조교 열기"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-canvas shadow-lg t-body font-bold"
      >
        AI
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex h-[520px] max-h-[calc(100vh-6rem)] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-xl">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="t-card-title">AI 조교</p>
          <p className="t-caption">수업·학생 기록을 물어보세요</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMessages([])} className="pill pill-secondary t-body-sm">
            지우기
          </button>
          <button type="button" onClick={() => setOpen(false)} aria-label="접기" className="pill pill-secondary t-body-sm">
            접기
          </button>
        </div>
      </header>

      <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="t-body-sm text-muted">예를 들어 이렇게 물어보세요:</p>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setInput(example)}
                className="rounded-lg bg-surface px-3 py-2 text-left t-body-sm"
              >
                {example}
              </button>
            ))}
            <p className="t-caption">
              학생 감정·성찰은 이름을 가린 채 AI에 보내고, 화면에만 실명으로 보여줍니다.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[92%]"}
          >
            <div
              className={
                message.role === "user"
                  ? "rounded-2xl bg-ink px-3 py-2 text-canvas t-body-sm whitespace-pre-wrap"
                  : "rounded-2xl bg-surface px-3 py-2 t-body-sm whitespace-pre-wrap"
              }
            >
              {message.text}
            </div>
            {message.sources && message.sources.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1">
                {message.sources.map((source, sourceIndex) => (
                  <button
                    key={sourceIndex}
                    type="button"
                    onClick={() => jump(source)}
                    className="rounded-lg border border-line px-2.5 py-1.5 text-left t-caption hover:bg-surface"
                  >
                    {source.href ? "🔗 " : "📄 "}
                    {source.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {sending && <p className="self-start t-caption text-muted">생각하는 중…</p>}
      </div>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 pt-2">
          {attachments.map((attachment, index) => (
            <span key={index} className="flex items-center gap-1 rounded-lg bg-surface px-2 py-1 t-caption">
              그림 {index + 1}
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                aria-label="첨부 지우기"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-line px-3 py-3">
        <label className="pill pill-secondary t-body-sm shrink-0 cursor-pointer" aria-label="이미지 첨부">
          📎
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="질문을 입력하세요"
          className="field flex-1 resize-none"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="pill pill-primary t-body-sm shrink-0 disabled:opacity-50"
        >
          보내기
        </button>
      </div>
    </div>
  );
}
