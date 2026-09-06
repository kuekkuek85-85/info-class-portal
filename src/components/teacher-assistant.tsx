"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useTeacherDate } from "@/lib/teacher-date";
import { setTeacherJump } from "@/lib/teacher-jump";

/**
 * 교사 대시보드 AI 조교 — 우하단 플로팅 버튼 → 채팅 팝업.
 *
 * `TeacherShell` 안에만 붙어서 교사 화면에서만 뜬다(학생 화면엔 없다). 대화는 이 브라우저의
 * localStorage 에만 쌓이고 서버로 저장되지 않는다. 답에 붙는 「출처」 칩을 누르면 그 날짜·
 * 세션으로 대시보드가 열린다(teacher-jump). 앱 링크 출처는 새 창으로 연다.
 *
 * ## 대화방
 *
 * 기본 채팅앱처럼 여러 대화방을 둔다. 좌상단 ☰ 로 방 목록을 열어 새 대화·이름 변경·삭제를
 * 한다. 방마다 대화가 따로 저장되고, 보낼 때는 그 방의 이력만 서버로 간다. 예전 단일 대화는
 * 첫 방으로 옮겨 온다(안 사라지게).
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
interface Room {
  id: string;
  name: string;
  messages: Msg[];
  updatedAt: number;
}

/** 방 목록 저장 키. 예전 단일 대화 키는 처음 한 번 여기로 옮긴 뒤 남겨 둔다 */
const STORAGE_KEY = "teacher-assistant-rooms";
const OLD_KEY = "teacher-assistant-chat";
const DEFAULT_NAME = "새 대화";
const MAX_ATTACH = 4;

const EXAMPLES = [
  "8월 31일 무슨 수업을 했어?",
  "인간과 인공지능 화요일 1기 4차시 계획 알려줘",
  "3반 12번 학생 산출물 찾아줘",
];

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  }
}

/** 첫 질문으로 방 이름을 짓는다. 길면 자른다 */
function titleFromText(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t) return DEFAULT_NAME;
  return t.length > 24 ? `${t.slice(0, 24)}…` : t;
}

function titleFromMessages(messages: Msg[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  return firstUser ? titleFromText(firstUser.text) : DEFAULT_NAME;
}

function emptyRoom(): Room {
  return { id: newId(), name: DEFAULT_NAME, messages: [], updatedAt: Date.now() };
}

/**
 * 조교 답의 가벼운 마크다운 표시 — 굵게·글머리·번호 목록만.
 *
 * 모델이 `**굵게**` 나 `* 목록` 을 쓰는데 순수 텍스트로 그리면 별표가 그대로 보인다.
 * 큰 라이브러리를 붙이는 대신 이만큼만 처리한다. HTML 을 만들지 않고 React 요소로 조립해
 * (dangerouslySetInnerHTML 없이) 안전하다.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let bold = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(<strong key={`${keyPrefix}-b${bold++}`}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>);
    blocks.push(
      list.type === "ol" ? (
        <ol key={`l${blocks.length}`} className="flex list-decimal flex-col gap-0.5 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={`l${blocks.length}`} className="flex list-disc flex-col gap-0.5 pl-5">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  lines.forEach((line, idx) => {
    const t = line.trim();
    const ulMatch = t.match(/^[*\-•]\s+(.*)$/);
    const olMatch = t.match(/^\d+\.\s+(.*)$/);
    if (ulMatch) {
      if (!list || list.type !== "ul") {
        flush();
        list = { type: "ul", items: [] };
      }
      list.items.push(ulMatch[1]);
      return;
    }
    if (olMatch) {
      if (!list || list.type !== "ol") {
        flush();
        list = { type: "ol", items: [] };
      }
      list.items.push(olMatch[1]);
      return;
    }
    flush();
    if (t === "") return; // 빈 줄은 아래 gap 으로 대신한다
    // 머리표(#)만 있는 강조 줄은 굵게로 눕힌다
    const heading = t.match(/^#{1,6}\s+(.*)$/);
    blocks.push(<p key={`p${idx}`}>{renderInline(heading ? `**${heading[1]}**` : t, `p${idx}`)}</p>);
  });
  flush();

  return <div className="flex flex-col gap-1.5">{blocks}</div>;
}

export function TeacherAssistant() {
  const router = useRouter();
  const [, setDate] = useTeacherDate();
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  const activeRoom = rooms.find((r) => r.id === activeId) ?? null;
  const messages = useMemo(
    () => rooms.find((r) => r.id === activeId)?.messages ?? [],
    [rooms, activeId],
  );

  // 방 목록 불러오기 — 마운트 뒤에 읽는다(teacher-date 와 같은 하이드레이션 이유)
  useEffect(() => {
    const restore = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { rooms?: Room[]; activeId?: string };
          if (parsed.rooms && parsed.rooms.length > 0) {
            setRooms(parsed.rooms);
            const valid = parsed.activeId && parsed.rooms.some((r) => r.id === parsed.activeId);
            setActiveId(valid ? parsed.activeId! : parsed.rooms[0].id);
            loaded.current = true;
            return;
          }
        }
        // 예전 단일 대화를 첫 방으로 옮긴다
        let old: Msg[] = [];
        try {
          const rawOld = localStorage.getItem(OLD_KEY);
          if (rawOld) old = JSON.parse(rawOld) as Msg[];
        } catch {
          old = [];
        }
        const first: Room = {
          id: newId(),
          name: old.length ? titleFromMessages(old) : DEFAULT_NAME,
          messages: old,
          updatedAt: Date.now(),
        };
        setRooms([first]);
        setActiveId(first.id);
      } catch {
        const first = emptyRoom();
        setRooms([first]);
        setActiveId(first.id);
      }
      loaded.current = true;
    };
    restore();
  }, []);

  // 방 목록 저장 (불러오기 전에는 덮어쓰지 않는다)
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rooms, activeId }));
    } catch {
      // 저장 실패는 넘어간다 — 이번 세션 대화는 화면에 남아 있다
    }
  }, [rooms, activeId]);

  // 새 메시지가 오면 목록을 아래로
  useEffect(() => {
    if (open) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open, sending]);

  function patchRoom(id: string, updater: (room: Room) => Room) {
    setRooms((prev) => prev.map((r) => (r.id === id ? updater(r) : r)));
  }

  function newRoom() {
    const room = emptyRoom();
    setRooms((prev) => [room, ...prev]);
    setActiveId(room.id);
    setSidebarOpen(false);
    setRenamingId(null);
  }

  function switchRoom(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
  }

  function deleteRoom(id: string) {
    const next = rooms.filter((r) => r.id !== id);
    if (next.length === 0) {
      const room = emptyRoom();
      setRooms([room]);
      setActiveId(room.id);
    } else {
      setRooms(next);
      if (id === activeId) setActiveId(next[0].id);
    }
    if (renamingId === id) setRenamingId(null);
  }

  function startRename(room: Room) {
    setRenamingId(room.id);
    setRenameText(room.name);
  }

  function commitRename() {
    if (renamingId) {
      const name = renameText.trim() || DEFAULT_NAME;
      patchRoom(renamingId, (r) => ({ ...r, name }));
    }
    setRenamingId(null);
    setRenameText("");
  }

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
    if (!question || sending || !activeRoom) return;
    const roomId = activeRoom.id;

    // 이번 질문 이전까지가 대화 이력
    const history = messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", text: m.text }));
    const images = attachments.map((a) => ({ mimeType: a.mimeType, dataBase64: a.dataUrl }));
    const isFirst = messages.length === 0;

    patchRoom(roomId, (r) => ({
      ...r,
      messages: [...r.messages, { role: "user", text: question }],
      // 첫 메시지면 방 이름을 질문으로 짓는다 (아직 기본 이름일 때만)
      name: isFirst && r.name === DEFAULT_NAME ? titleFromText(question) : r.name,
      updatedAt: Date.now(),
    }));
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
      patchRoom(roomId, (r) => ({
        ...r,
        messages: [...r.messages, { role: "assistant", text, sources: data?.sources ?? [] }],
        updatedAt: Date.now(),
      }));
    } catch {
      patchRoom(roomId, (r) => ({
        ...r,
        messages: [...r.messages, { role: "assistant", text: "연결에 문제가 있었어요. 잠시 후 다시 시도해 주세요." }],
        updatedAt: Date.now(),
      }));
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
      <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="대화방 목록"
            className="pill pill-secondary t-body-sm shrink-0"
          >
            ☰
          </button>
          <div className="overflow-hidden">
            <p className="t-card-title truncate">{activeRoom?.name || "AI 조교"}</p>
            <p className="t-caption">AI 조교 · 수업·학생 기록</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="접기" className="pill pill-secondary t-body-sm shrink-0">
          접기
        </button>
      </header>

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* 대화방 목록 — ☰ 로 열면 채팅 위를 덮는다 (좁은 팝업이라 서랍보다 전체 덮기가 깔끔) */}
        {sidebarOpen && (
          <div className="absolute inset-0 z-10 flex flex-col bg-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="t-card-title">대화방</p>
              <button type="button" onClick={() => setSidebarOpen(false)} className="pill pill-secondary t-body-sm">
                닫기
              </button>
            </div>
            <div className="px-3 py-3">
              <button type="button" onClick={newRoom} className="pill pill-primary t-body-sm w-full">
                + 새 대화
              </button>
            </div>
            <ul className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-3">
              {rooms.map((room) => (
                <li
                  key={room.id}
                  className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${room.id === activeId ? "bg-surface" : ""}`}
                >
                  {renamingId === room.id ? (
                    <input
                      value={renameText}
                      onChange={(event) => setRenameText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setRenamingId(null);
                      }}
                      onBlur={commitRename}
                      autoFocus
                      className="field flex-1"
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => switchRoom(room.id)}
                        className="flex-1 truncate text-left t-body-sm"
                      >
                        {room.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => startRename(room)}
                        aria-label="이름 변경"
                        className="shrink-0 px-1 t-body-sm"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteRoom(room.id)}
                        aria-label="삭제"
                        className="shrink-0 px-1 t-body-sm"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

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
                    : "rounded-2xl bg-surface px-3 py-2 t-body-sm"
                }
              >
                {message.role === "user" ? message.text : <Markdown text={message.text} />}
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
