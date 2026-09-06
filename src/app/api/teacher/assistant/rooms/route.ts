import { fail, guard, ok, readJson } from "@/lib/api";
import {
  getAssistantChat,
  saveAssistantChat,
  type AssistantChatMsg,
  type AssistantChatRoom,
  type AssistantChatSource,
} from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 교사 AI 조교 대화방 저장소 — 교사 계정별로 서버에 둔다.
 *
 * 예전엔 대화방이 브라우저 localStorage 에만 쌓여, 데스크톱에서 만든 대화가 태블릿·휴대폰엔
 * 안 보였다. 이제 교사 uid 로 서버(Firestore)에 담아 어느 기기에서 열어도 같은 방이 뜬다.
 *
 * - GET  : 내 대화방 목록을 돌려준다.
 * - PUT  : 방 목록 전체를 덮어써 저장한다(클라이언트가 목록 전체를 들고 있다).
 *
 * 대화 「내용」은 이 문서에 남지만, 학생 감정·성찰을 외부 AI 로 보낼 때 이름을 가리는 규칙은
 * 그대로다(assistant/route.ts). 여기 저장되는 건 교사 화면에 뜬 그대로의 대화다.
 */

const MAX_ROOMS = 100;
const MAX_MSGS = 400;
const MAX_TEXT = 8000;
const MAX_NAME = 80;
const MAX_SOURCES = 12;
const MAX_LABEL = 200;

interface RoomInput {
  id?: unknown;
  name?: unknown;
  messages?: unknown;
  updatedAt?: unknown;
}
interface Body {
  rooms?: RoomInput[];
  activeId?: unknown;
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : Date.now();
}

function sanitizeSource(raw: unknown): AssistantChatSource | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const label = str(s.label, MAX_LABEL);
  if (!label) return null;
  const source: AssistantChatSource = { label };
  const course = str(s.course, 40);
  const date = str(s.date, 20);
  const sessionId = str(s.sessionId, 120);
  const href = str(s.href, 1000);
  if (course) source.course = course;
  if (date) source.date = date;
  if (sessionId) source.sessionId = sessionId;
  if (href) source.href = href;
  return source;
}

function sanitizeMsg(raw: unknown): AssistantChatMsg | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const text = str(m.text, MAX_TEXT);
  const role = m.role === "assistant" ? "assistant" : "user";
  if (!text) return null;
  const msg: AssistantChatMsg = { role, text };
  if (Array.isArray(m.sources)) {
    const sources = m.sources
      .slice(0, MAX_SOURCES)
      .map(sanitizeSource)
      .filter((s): s is AssistantChatSource => s !== null);
    if (sources.length) msg.sources = sources;
  }
  return msg;
}

function sanitizeRoom(raw: RoomInput): AssistantChatRoom | null {
  const id = str(raw.id, 80);
  if (!id) return null;
  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .slice(0, MAX_MSGS)
        .map(sanitizeMsg)
        .filter((m): m is AssistantChatMsg => m !== null)
    : [];
  return {
    id,
    name: str(raw.name, MAX_NAME) || "새 대화",
    messages,
    updatedAt: num(raw.updatedAt),
  };
}

export async function GET() {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const chat = await getAssistantChat(me.uid);
    return ok({ rooms: chat?.rooms ?? [], activeId: chat?.activeId ?? "" });
  });
}

export async function PUT(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<Body>(request);
    if (!body || !Array.isArray(body.rooms)) {
      return fail("invalid_input", "대화방 목록이 없습니다.");
    }

    const rooms = body.rooms
      .slice(0, MAX_ROOMS)
      .map(sanitizeRoom)
      .filter((r): r is AssistantChatRoom => r !== null);

    const activeId = str(body.activeId, 80);
    const validActive = rooms.some((r) => r.id === activeId) ? activeId : rooms[0]?.id ?? "";

    await saveAssistantChat(me.uid, rooms, validActive);
    return ok({ saved: rooms.length });
  });
}
