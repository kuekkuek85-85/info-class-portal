"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { drawArtifact } from "@/components/artifact-canvas";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  PALETTE,
  SIMPLIFY_EPSILON,
  STROKE_WIDTHS,
  TEXT_SIZES,
  UNDO_LIMIT,
  simplifyPoints,
} from "@/lib/drawing";
import type { Stroke, TextItem } from "@/lib/types";

/**
 * 2040년 그림판.
 *
 * 그리기는 2차시 10분 + 3차시 9분으로 쪼개진다. 그래서 **저장은 반드시 서버**다.
 * 브라우저에만 두면 태블릿이 꺼지는 순간 사라지고, 3차시에 이어 그릴 수도 없다.
 *
 * 저장 방식:
 *  · 획이 멈추면 4초 뒤 **새로 그은 획만** 보낸다 (append). 매번 전체를 보내면
 *    30분쯤 지났을 때 요청 하나가 수백 KB가 된다.
 *  · 지우개·되돌리기로 획이 **줄어든** 경우는 이어 붙이기로 표현할 수 없어 통째로 보낸다.
 *  · 60초마다 한 번은 통째로 맞춘다. 중간에 요청 하나가 실패해도 다음 동기화에서 복구된다.
 */

export interface DrawBoardProps {
  initialStrokes: Stroke[];
  initialTexts: TextItem[];
  /** 서버가 마지막으로 받아들인 저장 순번. 여기서 이어 센다 */
  initialRev: number;
  places: string[];
  place: string;
  year: number;
  onPlaceChange: (place: string) => void;
  /**
   * 화면을 떠날 때 지금 그림을 부모에게 넘긴다.
   *
   * 교사가 그리기 → 활동지로 넘기면 이 컴포넌트는 사라지고, 활동지 화면은 그림 미리보기를
   * 띄운다. 그때 서버에서 다시 받아 오려 하면 마지막 저장이 끝나기 전이라 방금 그린 것이
   * 빠진 그림이 뜬다. 떠나면서 직접 건네주는 쪽이 확실하다.
   */
  onExit?: (strokes: Stroke[], texts: TextItem[], rev: number) => void;
  /** 수업이 끝났으면 읽기 전용 */
  disabled?: boolean;
}

type Tool = "pen" | "eraser" | "text";

/** 되돌리기 한 단계. 무엇을 했는지 기록해 두어야 그것을 정확히 되돌릴 수 있다 */
type UndoAction =
  | { type: "addStroke" }
  | { type: "addText" }
  | { type: "eraseStroke"; index: number; stroke: Stroke }
  | { type: "eraseText"; index: number; text: TextItem }
  | { type: "clear"; strokes: Stroke[]; texts: TextItem[] };

/**
 * 획이 멈춘 뒤 이만큼 지나면 저장한다.
 *
 * 4초에서 늘렸다. 저장 버튼이 따로 있으므로 자동저장은 "안 눌러도 남는다"는 안전망 역할만
 * 하면 되고, 간격을 늘린 만큼 쓰기 횟수가 줄어든다 (Spark 쓰기 한도 하루 2만 건).
 */
const AUTOSAVE_MS = 12_000;
/** 이 주기로 한 번은 통째로 맞춘다 */
const FULL_SYNC_MS = 60_000;
/** 연속 실패가 이만큼 이어지면 자동 재시도를 멈춘다 (저장 버튼은 계속 쓸 수 있다) */
const MAX_RETRIES = 5;
/** 순번이 밀려 되돌아온 요청을 이만큼까지만 자동으로 다시 보낸다 */
const MAX_STALE_RESENDS = 3;

/**
 * keepalive 요청 본문 상한(브라우저 공통 64KiB)에 대한 여유분.
 *
 * 화면이 완전히 닫히는 순간에는 keepalive 없이는 요청이 중간에 잘린다. 그런데 이 한도를
 * 넘겨 보내면 요청 자체가 거절된다 — 큰 그림일수록 저장이 필요한데 그때 실패한다.
 * 그래서 작을 때만 keepalive 를 쓰고, 클 때는 평범한 요청으로 보낸다(닫히는 중이면 실패할
 * 수 있지만, 아예 거절당하는 것보다 낫다).
 */
const KEEPALIVE_LIMIT_BYTES = 56_000;

/** 직접 적는 장소 이름의 길이 상한. 서버도 같은 값으로 자른다 */
const MAX_PLACE_LENGTH = 12;

type SaveState = "idle" | "saving" | "saved" | "error";

export function DrawBoard({
  initialStrokes,
  initialTexts,
  initialRev,
  places,
  place,
  year,
  onPlaceChange,
  onExit,
  disabled,
}: DrawBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 그리는 동안 매 프레임 React 상태를 갱신하면 28명 태블릿에서 눈에 띄게 끊긴다.
  // 캔버스에 직접 그리고, 획이 끝났을 때만 상태를 올린다.
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const textsRef = useRef<TextItem[]>(initialTexts);
  const currentRef = useRef<number[] | null>(null);
  const pointerRef = useRef<number | null>(null);

  const [strokeCount, setStrokeCount] = useState(initialStrokes.length);
  const [textCount, setTextCount] = useState(initialTexts.length);

  /**
   * 되돌리기 기록.
   *
   * 그린 것·지운 것·전부 지운 것을 모두 담는다. 이전에는 "마지막 획을 뺀다"였는데,
   * 그러면 글자를 넣고 되돌리기를 눌렀을 때 글자는 그대로 있고 엉뚱한 선이 사라졌다.
   */
  const historyRef = useRef<UndoAction[]>([]);
  const [historyCount, setHistoryCount] = useState(0);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(0);
  const [width, setWidth] = useState(1);
  const [textSize, setTextSize] = useState(1);
  const [penOnly, setPenOnly] = useState(false);
  /** 펜 전용 모드 때문에 손가락 입력이 막혔다 — 왜 안 그려지는지 알려 주기 위해 */
  const [penOnlyBlocked, setPenOnlyBlocked] = useState(false);

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [sizeWarn, setSizeWarn] = useState(false);
  const [rejected, setRejected] = useState(false);

  /** 서버에 이미 올라간 획 개수. 여기부터 뒤가 아직 안 보낸 부분이다 */
  const syncedRef = useRef(initialStrokes.length);
  /** 획이 줄어들었다 — 이어 붙이기로는 안 되고 통째로 보내야 한다 */
  const needsReplaceRef = useRef(false);
  const dirtyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef(false);
  /**
   * 예약된 타이머가 부를 최신 save.
   *
   * save 와 scheduleSave 는 서로를 부른다(저장이 끝나면 다시 예약, 예약이 끝나면 저장).
   * 함수끼리 직접 참조하면 순환이 되므로 한쪽을 ref 로 끊는다.
   */
  const saveRef = useRef<((full: boolean) => void) | null>(null);
  /** 저장 순번. 서버가 마지막으로 받아들인 값에서 이어 센다 */
  const saveRevRef = useRef(initialRev);
  /** 연속 실패 횟수 — 재시도 간격을 늘리는 데 쓴다 */
  const failCountRef = useRef(0);
  /** 용량 초과로 거부당한 시점의 변경 번호. 그림이 바뀌기 전에는 다시 보내지 않는다 */
  const rejectedAtRef = useRef(-1);
  /** 순번이 밀려 되돌아온 횟수 — 몇 번을 넘으면 자동 재전송을 멈춘다 */
  const staleCountRef = useRef(0);

  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customPlace, setCustomPlace] = useState("");

  function confirmCustomPlace() {
    const value = customPlace.replace(/\s+/g, " ").trim().slice(0, MAX_PLACE_LENGTH);
    if (!value) return;
    setCustomOpen(false);
    onPlaceChange(value);
  }

  // ------------------------------------------------------------- 그리기

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    drawArtifact(ctx, strokesRef.current, textsRef.current);

    // 그리는 중인 획은 아직 배열에 없으므로 따로 얹는다
    const points = currentRef.current;
    if (points && points.length >= 2) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = PALETTE[color];
      ctx.lineWidth = STROKE_WIDTHS[width];
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (let i = 2; i + 1 < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
      ctx.stroke();
      ctx.restore();
    }
  }, [color, width]);

  useEffect(() => {
    redraw();
  }, [redraw, strokeCount, textCount]);

  /** 화면 좌표 → 논리 좌표(1600×1200) */
  function toLogical(event: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return [x, y];
  }

  /** 그림이 바뀌었다 — 변경 번호를 올리고 저장을 예약한다 */
  function markDirty() {
    dirtyRef.current = true;
    revisionRef.current += 1;
    // 새로 그린 것은 새 시도다. 앞서 순번이 밀려 멈춰 있었더라도 여기서 다시 연다.
    staleCountRef.current = 0;
    scheduleSave();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;

    /*
     * 손바닥이 화면에 닿아 생기는 선을 막는 모드.
     *
     * **손가락(touch)만 막는다.** 예전에는 "펜이 아니면 전부 막기"였는데, 그러면
     * 스타일러스 없는 태블릿이나 노트북에서 이걸 켠 학생은 아예 못 그리게 된다.
     * 체크박스 하나 때문이라는 걸 학생은 알아채지 못하고 "안 그려져요"만 반복한다.
     * 막아야 할 것은 손바닥이지 마우스가 아니다.
     */
    if (penOnly && event.pointerType === "touch") {
      setPenOnlyBlocked(true);
      return;
    }
    // 펜이나 마우스로 다시 그리기 시작하면 안내를 치운다. 잘 되고 있는데 경고가 남아
    // 있으면 학생은 계속 뭔가 잘못된 줄 안다.
    if (penOnlyBlocked) setPenOnlyBlocked(false);

    const [x, y] = toLogical(event);

    if (tool === "text") {
      setTextDraft({ x, y, value: "" });
      return;
    }

    if (tool === "eraser") {
      eraseAt(x, y);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = event.pointerId;
    currentRef.current = [x, y];
    redraw();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current !== event.pointerId) return;
    const points = currentRef.current;
    if (!points) return;

    const [x, y] = toLogical(event);

    // 1px도 안 움직인 이벤트까지 담으면 점만 수천 개가 된다
    const lastX = points[points.length - 2];
    const lastY = points[points.length - 1];
    if (Math.abs(x - lastX) < 1 && Math.abs(y - lastY) < 1) return;

    points.push(x, y);
    redraw();
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    if (pointerRef.current !== event.pointerId) return;
    pointerRef.current = null;

    const points = currentRef.current;
    currentRef.current = null;
    if (!points || points.length < 2) {
      redraw();
      return;
    }

    // 손으로 그은 곡선은 점이 촘촘하다. 눈에 같은 모양을 유지하면서 점을 크게 줄인다.
    const simplified = simplifyPoints(
      points.map((value) => Math.round(value)),
      SIMPLIFY_EPSILON,
    );

    strokesRef.current = [...strokesRef.current, { c: color, w: width, p: simplified }];
    setStrokeCount(strokesRef.current.length);
    pushHistory({ type: "addStroke" });
    markDirty();
  }

  /**
   * 누른 지점의 글자나 획 하나를 지운다.
   *
   * 글자를 먼저 검사한다. 글자는 획 위에 그려지므로 눈에도 위에 있고, 글자를 지우려고
   * 눌렀는데 밑에 깔린 선이 지워지면 학생은 지우개가 고장 난 줄 안다.
   */
  function eraseAt(x: number, y: number) {
    const texts = textsRef.current;
    for (let i = texts.length - 1; i >= 0; i -= 1) {
      if (!hitsText(texts[i], x, y)) continue;

      pushHistory({ type: "eraseText", index: i, text: texts[i] });
      textsRef.current = texts.filter((_, index) => index !== i);
      setTextCount(textsRef.current.length);
      needsReplaceRef.current = true;
      markDirty();
      return;
    }

    const strokes = strokesRef.current;
    // 위에 그린 것부터 검사한다 — 눈에 보이는 것이 먼저 지워져야 자연스럽다
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      const stroke = strokes[i];
      const tolerance = STROKE_WIDTHS[stroke.w] / 2 + 14;
      if (!hitsStroke(stroke.p, x, y, tolerance)) continue;

      pushHistory({ type: "eraseStroke", index: i, stroke });
      strokesRef.current = strokes.filter((_, index) => index !== i);
      setStrokeCount(strokesRef.current.length);
      needsReplaceRef.current = true;
      markDirty();
      return;
    }
  }

  /**
   * 마지막에 한 일을 되돌린다.
   *
   * 예전에는 "마지막 획을 뺀다"였다. 그래서 글자를 넣고 되돌리기를 누르면 글자는 그대로
   * 있고 엉뚱한 선이 사라졌다. 무엇을 했는지 기록해 두고 그것을 되돌린다.
   */
  function undo() {
    const action = historyRef.current.pop();
    if (!action) return;

    switch (action.type) {
      case "addStroke":
        strokesRef.current = strokesRef.current.slice(0, -1);
        break;
      case "addText":
        textsRef.current = textsRef.current.slice(0, -1);
        break;
      case "eraseStroke":
        // 지웠던 자리에 되돌려 넣는다. 맨 뒤에 붙이면 그리는 순서가 바뀌어 겹침이 달라진다.
        strokesRef.current = [
          ...strokesRef.current.slice(0, action.index),
          action.stroke,
          ...strokesRef.current.slice(action.index),
        ];
        break;
      case "eraseText":
        textsRef.current = [
          ...textsRef.current.slice(0, action.index),
          action.text,
          ...textsRef.current.slice(action.index),
        ];
        break;
      case "clear":
        strokesRef.current = action.strokes;
        textsRef.current = action.texts;
        break;
    }

    setStrokeCount(strokesRef.current.length);
    setTextCount(textsRef.current.length);
    needsReplaceRef.current = true;
    // 되돌리기 자체는 기록하지 않는다 — 그러면 되돌리기를 되돌리는 무한 왕복이 된다
    dirtyRef.current = true;
    revisionRef.current += 1;
    staleCountRef.current = 0;
    scheduleSave();
    setHistoryCount(historyRef.current.length);
  }

  function clearAll() {
    if (!confirm("그림을 전부 지울까요? 되돌리기로 한 번은 되살릴 수 있어요.")) return;

    pushHistory({ type: "clear", strokes: strokesRef.current, texts: textsRef.current });
    strokesRef.current = [];
    textsRef.current = [];
    setStrokeCount(0);
    setTextCount(0);
    needsReplaceRef.current = true;
    markDirty();
  }

  /** 되돌릴 수 있는 일 하나를 쌓는다. 오래된 것부터 버린다 */
  function pushHistory(action: UndoAction) {
    historyRef.current = [...historyRef.current, action].slice(-UNDO_LIMIT);
    setHistoryCount(historyRef.current.length);
  }

  function commitText() {
    const draft = textDraft;
    setTextDraft(null);
    if (!draft?.value.trim()) return;

    textsRef.current = [
      ...textsRef.current,
      { x: draft.x, y: draft.y, size: TEXT_SIZES[textSize], content: draft.value.trim() },
    ];
    setTextCount(textsRef.current.length);
    pushHistory({ type: "addText" });
    markDirty();
  }

  // ------------------------------------------------------------- 저장

  /*
   * 저장이 어긋나지 않게 하는 두 가지 장치.
   *
   * ① revision — 그림이 바뀔 때마다 1씩 올린다. 요청을 보내기 직전 값을 기억해 두었다가,
   *    응답이 왔을 때 값이 그대로면 "요청이 나가 있는 동안 아무 일도 없었다"는 뜻이다.
   *    값이 달라졌으면 플래그를 내리지 않는다.
   *
   *    이게 없으면 이런 일이 생긴다: 획 10개를 보내는 중에 학생이 되돌리기를 눌러 9개가
   *    되면, 뒤늦게 도착한 성공 응답이 "통째로 다시 보내야 함" 표시를 지우고 저장된 개수를
   *    10으로 기록한다. 다음부터는 9개짜리 배열에서 "10번째부터"를 보내려 하니 영원히
   *    아무것도 안 올라간다. 화면에는 계속 "저장됨"이 뜬 채로.
   *
   * ② pending — 저장 중에 또 저장이 필요해지면 표시해 두고, 끝나자마자 한 번 더 돈다.
   *    예약된 타이머를 그냥 흘려보내면 마지막 획이 영영 안 올라간다.
   */
  const revisionRef = useRef(0);
  const pendingRef = useRef(false);
  const pendingFullRef = useRef(false);

  /**
   * 서버에 아직 안 올라간 것이 있는가.
   *
   * 이 판단이 없으면 "아무것도 안 한 화면"이 주기적으로 자기 상태를 올려보내고,
   * 그게 다른 기기에서 그린 최신 그림을 덮어쓴다.
   */
  const hasUnsavedWork = useCallback(() => {
    // 용량을 넘겨 거절당한 그대로면 다시 보내도 또 거절당한다. 그림이 바뀌면 revision 이
    // 올라가면서 이 조건이 풀린다.
    if (rejectedAtRef.current === revisionRef.current) return false;
    if (dirtyRef.current || needsReplaceRef.current) return true;
    return syncedRef.current !== strokesRef.current.length;
  }, []);

  const scheduleSave = useCallback((full = false, delay = AUTOSAVE_MS) => {
    if (full) pendingFullRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const wantFull = pendingFullRef.current;
      pendingFullRef.current = false;
      void saveRef.current?.(wantFull);
    }, delay);
  }, []);

  const save = useCallback(
    async (full: boolean) => {
      // 이미 하나가 날아가고 있으면 끝난 뒤에 반드시 한 번 더 돈다
      if (savingRef.current) {
        pendingRef.current = true;
        if (full) pendingFullRef.current = true;
        return;
      }

      const startRevision = revisionRef.current;
      const all = strokesRef.current;
      const replace = full || needsReplaceRef.current;
      const payload = replace ? all : all.slice(syncedRef.current);

      /*
       * 올릴 것이 없으면 아무것도 보내지 않는다. 전체 동기화라도 마찬가지다.
       *
       * 그냥 낭비를 줄이는 문제가 아니다. 태블릿을 켜 둔 채 폰으로 이어 그리는 학생이
       * 있는데, 켜져 있는 태블릿이 60초마다 "내가 가진 옛 그림"을 통째로 올리면
       * 폰에서 그린 것이 지워진다. 보낼 것이 없을 때 조용히 있는 것이 그 사고를 막는다.
       */
      if (!hasUnsavedWork()) return;
      if (!replace && payload.length === 0 && !dirtyRef.current) return;

      savingRef.current = true;
      setSaveState("saving");

      /** 망이 끊겨 실패했다 — 간격을 벌려 다시 시도한다 */
      let retry = false;
      /** 순번이 밀려 버려졌다 — 실패는 아니므로 곧바로 다시 보낸다 */
      let resend = false;

      try {
        const response = await fetch("/api/student/artifact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: replace ? "replace" : "append",
            strokes: payload,
            texts: textsRef.current,
            rev: (saveRevRef.current += 1),
          }),
        });
        const result = await response.json();

        if (!result.ok) {
          // 세션 만료처럼 다시 보내도 소용없는 실패다. 자동 재시도를 걸지 않는다.
          setSaveState("error");
        } else if (result.stale) {
          /*
           * 더 최신 저장이 이미 서버에 들어가 있어 이 요청은 버려졌다.
           * 서버 순번에 맞춘 뒤, 우리가 가진 것을 통째로 다시 올린다.
           *
           * 그리기 화면을 닫았다 다시 열면 순번이 처음 값부터 시작하는데, 이 보정이
           * 없으면 서버 순번을 따라잡을 때까지 저장이 계속 버려진다.
           */
          /*
           * 서버 값에 **맞춘다**. 더 큰 쪽을 남기면 안 된다 —
           * 순번이 서버보다 터무니없이 앞서 있어 거절당한 경우, 큰 값을 그대로 들고
           * 다시 보내면 또 거절당한다. 300ms 마다 영원히 반복된다.
           */
          saveRevRef.current = Number(result.serverRev) || 0;
          needsReplaceRef.current = true;
          staleCountRef.current += 1;
          resend = staleCountRef.current <= MAX_STALE_RESENDS;
          setSaveState(resend ? "saving" : "error");
        } else if (result.rejected) {
          /*
           * 용량 초과로 서버가 새 획을 받지 않았다. **성공으로 처리하면 안 된다.**
           * 서버가 실제로 가진 개수까지만 동기화된 것으로 되돌리고, 다음에는 통째로
           * 다시 시도하도록 표시해 둔다. 여기서 저장 완료로 기록해 버리면 거부된 획이
           * 영영 다시 올라가지 않는다.
           */
          syncedRef.current = Math.min(
            typeof result.strokeCount === "number" ? result.strokeCount : syncedRef.current,
            all.length,
          );
          needsReplaceRef.current = true;
          /*
           * 거절당한 것은 **보낼 때의** 그림이다. 지금 값(revisionRef.current)을 적으면
           * 안 된다 — 요청이 날아가는 동안 학생이 지우개로 정리했다면, 작아진 그림까지
           * "이미 거절당한 것"으로 취급해 저장이 막힌다.
           */
          rejectedAtRef.current = startRevision;
          setSizeWarn(true);
          setRejected(true);
          setSaveState("error");
          // 지우개로 정리하기 전에는 다시 보내도 또 거부당한다. 재시도를 걸지 않는다.
        } else {
          // 몇 개까지 올라갔는지는 서버 답을 그대로 믿는다 — 우리가 센 값과 어긋날 수 없게
          syncedRef.current =
            typeof result.strokeCount === "number" ? result.strokeCount : all.length;

          // 요청이 나가 있는 동안 아무 변화가 없었을 때만 플래그를 내린다
          if (revisionRef.current === startRevision) {
            needsReplaceRef.current = false;
            dirtyRef.current = false;
          }
          failCountRef.current = 0;
          staleCountRef.current = 0;
          rejectedAtRef.current = -1;
          setSizeWarn(Boolean(result.warn));
          setRejected(false);
          setSaveState("saved");
        }
      } catch {
        /*
         * 학교 와이파이는 종종 끊긴다. 보낸 것이 서버에 닿았는지 알 수 없으므로
         * 다음에는 통째로 다시 맞춘다 — replace 는 몇 번을 보내도 결과가 같아서
         * 획이 두 번 붙는 일이 없다.
         */
        needsReplaceRef.current = true;
        failCountRef.current += 1;
        retry = failCountRef.current <= MAX_RETRIES;
        setSaveState("error");
      } finally {
        savingRef.current = false;

        // 저장 중에 생긴 변화나 요청은 여기서 반드시 이어받는다
        const changedDuringFlight = revisionRef.current !== startRevision;
        if (pendingRef.current || changedDuringFlight || retry || resend) {
          pendingRef.current = false;
          // 계속 실패하면 간격을 벌린다. 28명이 3초마다 재시도하면 끊긴 망을 더 막는다.
          const delay = retry
            ? Math.min(3000 * 2 ** (failCountRef.current - 1), 30_000)
            : resend
              ? 300
              : 500;
          scheduleSave(pendingFullRef.current, delay);
        }
      }
    },
    [scheduleSave, hasUnsavedWork],
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // 주기적 전체 동기화 — 중간에 실패한 요청이 있어도 여기서 맞춰진다
  useEffect(() => {
    if (disabled) return;
    const timer = setInterval(() => void save(true), FULL_SYNC_MS);
    return () => clearInterval(timer);
  }, [disabled, save]);

  /*
   * 화면이 가려질 때 저장한다.
   *
   * 태블릿에서 홈 버튼을 누르거나 화면이 잠기는 순간이 가장 흔한 유실 지점이다.
   * 그 뒤 브라우저가 통째로 정리되면 다음 자동저장은 오지 않는다.
   */
  useEffect(() => {
    if (disabled) return;

    function onHidden() {
      if (document.visibilityState !== "hidden") return;
      // 화면이 가려졌을 뿐 페이지는 살아 있다 — 평범한 저장 경로로 충분하다
      void save(true);
    }
    function onPageHide() {
      // 여기서부터는 페이지가 정리될 수 있다. 직렬화를 기다릴 여유가 없으므로 바로 보낸다.
      if (!hasUnsavedWork()) return;
      sendFinalSave(strokesRef.current, textsRef.current, (saveRevRef.current += 1));
    }

    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [disabled, save, hasUnsavedWork]);

  // 화면을 벗어날 때 마지막으로 한 번. 교사가 단계를 넘기면 이 컴포넌트가 사라진다.
  // 정리 함수가 옛 onExit 을 붙잡지 않도록 ref 로 최신 값을 들고 있는다.
  const exitRef = useRef(onExit);
  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);

      /*
       * 교사가 단계를 넘기면 이 컴포넌트는 그 자리에서 사라진다. 이게 그림판을 떠나는
       * 가장 흔한 경로다.
       *
       * save() 를 부르지 않고 직접 보낸다. 마침 저장이 진행 중이면 save() 는 그냥
       * 돌아가 버리고, 이어서 예약될 재시도는 컴포넌트가 없어 실행되지 않는다 —
       * 그 사이에 그은 획이 통째로 사라진다.
       *
       * keepalive 를 붙여 화면이 사라진 뒤에도 요청이 끝까지 가게 한다. 항상 전체를
       * 보내므로(replace) 앞선 요청과 겹쳐도 결과가 어긋나지 않는다.
       */
      const strokes = strokesRef.current;
      const texts = textsRef.current;
      let rev = saveRevRef.current;

      if (hasUnsavedWork()) {
        rev = saveRevRef.current += 1;
        sendFinalSave(strokes, texts, rev);
      }

      // 순번도 함께 넘긴다. 다시 그리기로 돌아왔을 때 0부터 세면 저장이 한동안
      // "옛 요청"으로 버려진다.
      exitRef.current?.(strokes, texts, rev);
    };
  }, [hasUnsavedWork]);

  // ------------------------------------------------------------- 장소 선택

  if (!place) {
    return (
      <section className="flex flex-col gap-5">
        <div>
          <h2 className="t-display">어디를 그릴까요?</h2>
          <p className="t-body mt-2">{year}년의 모습을 상상해서 그릴 장소를 하나 고르세요.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {places.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => onPlaceChange(item)}
              className={`block t-subhead py-8 text-center ${
                ["bg-lime", "bg-mint", "bg-cream", "bg-lilac", "bg-pink"][index % 5]
              }`}
            >
              {item}
            </button>
          ))}

          {/*
            목록에 없는 곳을 그리고 싶은 학생이 반드시 나온다. 열 곳으로 상상을 가두면
            "고를 게 없어요"에서 5분이 지나간다.
          */}
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            className="block t-subhead border-2 border-dashed border-ink bg-canvas py-8 text-center"
          >
            기타
            <span className="t-caption mt-1 block">직접 적기</span>
          </button>
        </div>
        <p className="t-caption text-center">한 번 고르면 수업 중에는 바꾸지 않아요.</p>

        {customOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="custom-place-label"
          >
            <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-canvas p-5">
              <label id="custom-place-label" htmlFor="custom-place" className="t-subhead">
                어디를 그릴 건가요?
              </label>
              <p className="t-caption">예) 도서관, 지하철역, 우리 집 옥상</p>
              <input
                id="custom-place"
                autoFocus
                value={customPlace}
                maxLength={MAX_PLACE_LENGTH}
                onChange={(event) => setCustomPlace(event.target.value)}
                onKeyDown={(event) => {
                  // 한글을 조합하는 중에 누르는 Enter 는 "글자 확정"이지 제출이 아니다.
                  // 거르지 않으면 "도서" 까지만 적힌 채로 넘어간다.
                  if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                    confirmCustomPlace();
                  }
                  if (event.key === "Escape") setCustomOpen(false);
                }}
                className="field"
                placeholder={`${MAX_PLACE_LENGTH}자까지`}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmCustomPlace}
                  disabled={!customPlace.trim()}
                  className="pill pill-primary flex-1"
                >
                  이걸로 할래요
                </button>
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  className="pill pill-secondary flex-1"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  // --------------------------------------------------------------- 화면

  return (
    <section className="flex flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="t-headline">
          {year}년의 {place}
        </h2>

        <div className="flex items-center gap-3">
          <span className="t-caption" aria-live="polite">
            {saveState === "saving" && "저장 중…"}
            {saveState === "saved" && "저장됨"}
            {saveState === "error" && "아직 저장 안 됨 — 저장을 눌러 주세요"}
            {saveState === "idle" && "가끔 저장을 눌러 주세요"}
          </span>
          {/*
            자동저장이 있는데도 버튼을 두는 이유:
            학생에게 "내가 저장했다"는 확신을 주고, 교사가 "저장 눌러"라고 말할 수 있게 한다.
            반대로 버튼만 두지는 않는다 — 중1은 누르지 않고, 안 누른 채 태블릿이 꺼진다.
          */}
          <button
            type="button"
            onClick={() => void save(true)}
            disabled={disabled || saveState === "saving"}
            className="pill pill-primary t-body-sm"
          >
            저장
          </button>
        </div>
      </header>

      {rejected && (
        <p className="rounded-md bg-pink px-4 py-3 t-body-sm">
          그림이 너무 복잡해서 더 저장하지 못했어요. 지우개로 조금 정리하면 다시 저장됩니다.
        </p>
      )}
      {!rejected && sizeWarn && (
        <p className="rounded-md bg-cream px-4 py-3 t-body-sm">
          그림이 꽤 복잡해졌어요. 안 쓰는 선을 지우개로 정리해 주세요.
        </p>
      )}

      {/*
        캔버스와 도구를 나란히 둔다.
        아래에 쌓으면 노트북·태블릿에서 도구가 화면 밖으로 밀려나 스크롤해야 보인다.
        30분 수업에서 "지우개가 어디 있어요"로 몇 번을 부르게 된다.

        캔버스 높이를 화면 기준으로 묶어 두는 것이 핵심이다. 폭에만 맞추면 세로가
        그만큼 길어져(4:3) 또 도구가 밀려난다.
      */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border-2 border-line bg-white">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            // 손가락으로 그을 때 화면이 함께 스크롤되면 그림이 그어지지 않는다
            style={{ touchAction: "none" }}
            className="mx-auto block max-h-[46vh] w-auto max-w-full sm:max-h-[52vh] lg:max-h-[68vh]"
          />
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:w-64">
          <div className="grid grid-cols-3 gap-2">
            <ToolButton active={tool === "pen"} onClick={() => setTool("pen")} label="펜" />
            <ToolButton
              active={tool === "eraser"}
              onClick={() => setTool("eraser")}
              label="지우개"
            />
            <ToolButton active={tool === "text"} onClick={() => setTool("text")} label="글자" />
          </div>

          {/* 색은 6칸씩 두 줄. 폰에서도 한눈에 들어오고 세로를 적게 먹는다 */}
          <div className="grid grid-cols-6 gap-2">
            {PALETTE.map((hex, index) => (
              <button
                key={hex}
                type="button"
                aria-label={`색 ${index + 1}`}
                aria-pressed={color === index}
                onClick={() => {
                  setColor(index);
                  setTool("pen");
                }}
                style={{ background: hex }}
                className={`aspect-square w-full rounded-full border-2 ${
                  color === index ? "border-ink ring-2 ring-ink" : "border-line"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="t-caption w-9 shrink-0">굵기</span>
            {STROKE_WIDTHS.map((value, index) => (
              <button
                key={value}
                type="button"
                aria-pressed={width === index}
                onClick={() => setWidth(index)}
                className={`flex h-10 flex-1 items-center justify-center rounded-lg border-2 ${
                  width === index ? "border-ink bg-surface" : "border-line"
                }`}
              >
                <span
                  className="rounded-full bg-ink"
                  style={{ width: 4 + index * 6, height: 4 + index * 6 }}
                />
              </button>
            ))}
          </div>

          {tool === "text" && (
            <div className="flex items-center gap-2">
              <span className="t-caption w-9 shrink-0">글자</span>
              {TEXT_SIZES.map((value, index) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={textSize === index}
                  onClick={() => setTextSize(index)}
                  className={`h-10 flex-1 rounded-lg border-2 text-sm ${
                    textSize === index ? "border-ink bg-surface" : "border-line"
                  }`}
                >
                  {["작게", "보통", "크게"][index]}
                </button>
              ))}
            </div>
          )}

          {/* 여기도 .pill 을 쓰지 않는다 — 좁은 칸에서 글자가 접힌다 (ToolButton 주석 참조) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={undo}
              disabled={historyCount === 0 || disabled}
              className="h-11 rounded-full border-2 border-line bg-canvas px-1 text-base font-semibold disabled:opacity-35"
            >
              되돌리기
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled || (strokeCount === 0 && textCount === 0)}
              className="h-11 rounded-full border-2 border-line bg-canvas px-1 text-base font-semibold disabled:opacity-35"
            >
              전부 지우기
            </button>
          </div>

          <label className="flex items-start gap-2 t-body-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={penOnly}
              onChange={(event) => {
                setPenOnly(event.target.checked);
                setPenOnlyBlocked(false);
              }}
            />
            <span>펜으로만 그리기 (손바닥이 닿아도 안 그려져요)</span>
          </label>

        {/*
          켜 둔 채 손가락으로 그으면 아무 일도 안 일어난다. 왜 안 되는지 말해 주지 않으면
          학생은 태블릿이 고장 난 줄 안다.
        */}
          {penOnlyBlocked && (
            <p className="rounded-md bg-cream px-3 py-2 t-body-sm">
              펜으로만 그리기가 켜져 있어요. 손가락으로 그리려면 위 체크를 꺼 주세요.
            </p>
          )}

          <p className="t-caption">
            {tool === "eraser"
              ? "지우고 싶은 선이나 글자를 톡 누르세요. 하나가 통째로 지워져요."
              : tool === "text"
                ? "글자를 넣고 싶은 자리를 톡 누르세요. 지우개로 다시 지울 수 있어요."
                : `되돌리기는 ${UNDO_LIMIT}번까지 눌러도 됩니다.`}
          </p>
        </div>
      </div>

      {textDraft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-canvas p-5">
            <label htmlFor="draw-text" className="t-subhead">
              무슨 글자를 넣을까요?
            </label>
            <input
              id="draw-text"
              autoFocus
              value={textDraft.value}
              maxLength={60}
              onChange={(event) =>
                setTextDraft((draft) => (draft ? { ...draft, value: event.target.value } : draft))
              }
              onKeyDown={(event) => {
                // 한글 조합 중의 Enter 는 글자 확정이다 (위 장소 입력과 같은 이유)
                if (event.key === "Enter" && !event.nativeEvent.isComposing) commitText();
                if (event.key === "Escape") setTextDraft(null);
              }}
              className="field"
              placeholder="예) 자동 배달 로봇"
            />
            <div className="flex gap-2">
              <button type="button" onClick={commitText} className="pill pill-primary flex-1">
                넣기
              </button>
              <button
                type="button"
                onClick={() => setTextDraft(null)}
                className="pill pill-secondary flex-1"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * 화면을 떠나는 순간의 마지막 저장.
 *
 * `save()` 를 거치지 않는다. 마침 저장이 진행 중이면 save() 는 그냥 돌아가 버리고,
 * 이어서 예약될 재시도는 컴포넌트가 없어 실행되지 않는다 — 그 사이에 그은 획이 사라진다.
 *
 * 항상 전체를 보내고(replace) 가장 큰 순번을 붙이므로, 앞서 출발한 요청이 뒤늦게
 * 도착해도 서버가 그것을 버린다. 순서가 뒤집혀도 결과가 어긋나지 않는다.
 */
function sendFinalSave(strokes: Stroke[], texts: TextItem[], rev: number): void {
  const body = JSON.stringify({ mode: "replace", strokes, texts, rev });

  // 한도는 문자 수가 아니라 바이트 수다. 한글은 한 글자가 3바이트라, 글자 수로 재면
  // 한도를 넘긴 요청에 keepalive 를 붙여 통째로 거절당한다.
  const bytes = new TextEncoder().encode(body).byteLength;

  void fetch("/api/student/artifact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    // 64KiB 를 넘으면 keepalive 요청은 아예 거절된다. 큰 그림일수록 저장이 급한데
    // 그때 실패하므로, 클 때는 평범한 요청으로 보낸다.
    keepalive: bytes <= KEEPALIVE_LIMIT_BYTES,
  }).catch(() => undefined);
}

/**
 * 도구 열 전용 버튼.
 *
 * `.pill` 을 쓰지 않는다. 그 클래스는 좌우 여백이 24px씩이라 좁은 열(약 80px 칸)에서
 * "지우개"가 두 줄로 접히고, 글자 크기도 1.125rem 으로 고정돼 있어 압축이 안 된다.
 * 게다가 `.pill` 은 Tailwind 레이어 밖에 있어서 유틸리티로 덮어쓸 수도 없다.
 */
function ToolButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-11 rounded-full border-2 px-1 text-base font-semibold transition active:scale-[0.97] ${
        active ? "border-ink bg-ink text-canvas" : "border-line bg-canvas text-ink"
      }`}
    >
      {label}
    </button>
  );
}

/** 누른 지점이 이 획 위에 있는가 — 선분마다 거리 검사 */
function hitsStroke(points: number[], x: number, y: number, tolerance: number): boolean {
  if (points.length === 2) {
    return Math.hypot(points[0] - x, points[1] - y) <= tolerance;
  }

  for (let i = 0; i + 3 < points.length; i += 2) {
    if (distanceToSegment(x, y, points[i], points[i + 1], points[i + 2], points[i + 3]) <= tolerance) {
      return true;
    }
  }
  return false;
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);

  // 선분 위로 투영한 위치를 0~1 로 자른다 — 선분 밖이면 끝점까지의 거리가 된다
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * 글자의 실제 폭을 잰다.
 *
 * 글자 수 × 크기 × 0.6 으로 어림하면 안 된다. 그 값은 영문 기준이고, 한글은 한 글자가
 * 거의 정사각형이라 실제 폭의 60% 밖에 안 된다 — "자동 배달 로봇"의 오른쪽 절반을
 * 눌러도 안 지워진다. 그리는 데 쓰는 것과 같은 폰트로 직접 잰다.
 */
let measureCanvas: CanvasRenderingContext2D | null = null;

function measureTextWidth(text: TextItem): number {
  if (!measureCanvas) {
    measureCanvas = document.createElement("canvas").getContext("2d");
  }
  // 못 재면 넉넉하게 잡는다. 좁게 잡아 안 지워지는 쪽이 훨씬 답답하다.
  if (!measureCanvas) return text.content.length * text.size;

  // artifact-canvas.tsx 의 drawArtifact 와 같은 폰트여야 한다
  measureCanvas.font = `bold ${text.size}px sans-serif`;
  return measureCanvas.measureText(text.content).width;
}

/**
 * 누른 지점이 이 글자 위에 있는가.
 *
 * 캔버스에 그린 글자는 클릭 판정이 없어서 직접 상자를 계산한다. 사방에 여유를 조금 둬서
 * 살짝 빗나가도 지워지게 한다 — 지우려고 세 번 누르는 것보다 한 번에 지워지는 쪽이 낫다.
 */
function hitsText(text: TextItem, x: number, y: number): boolean {
  const width = measureTextWidth(text);
  const padding = 12;
  return (
    x >= text.x - padding &&
    x <= text.x + width + padding &&
    // 캔버스에 textBaseline="top" 으로 그리므로 y 가 글자의 위쪽이다
    y >= text.y - padding &&
    y <= text.y + text.size + padding
  );
}
