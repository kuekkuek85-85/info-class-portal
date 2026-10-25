import "server-only";

/**
 * 바이브 코딩 도우미 — 학생이 "완성 게임에 기능 하나 추가"를 말(프롬프트)로 요청하면 Gemini 가
 * 전체 실행 가능한 파이썬 turtle 코드 + 쉬운 설명을 돌려준다 (22차 복습+바이브 코딩).
 *
 * ## 프라이버시 (이 과목의 1순위)
 *
 * - GEMINI 키·시스템 프롬프트는 서버 전용이다. **학번·이름은 Gemini 로 보내지 않는다** — 현재
 *   게임 코드(차시가 준 것)와 학생이 쓴 프롬프트 텍스트만 넘어간다 (comfort-bot·ai-review 와 같은 원칙).
 * - 학생 프롬프트·AI 답(코드·설명)은 학생 activity 아티팩트(answers[key])에 저장되고 교사가 열람한다.
 *   학생 화면에는 "선생님이 볼 수 있어요" 를 항상 띄운다(투명성).
 *
 * `comfort-bot.ts`·`ai-review.ts` 의 raw fetch 방식을 그대로 따른다(새 SDK 없음).
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// 코드가 길면 생성에 시간이 더 걸리므로 타임아웃도 넉넉히(터틀 게임 전체 코드 생성).
const TIMEOUT_MS = 35_000;

/** 저장·전송 방어 상한 (비용·Firestore 문서 1MB). */
const MAX_PROMPT = 500;
const MAX_BASE_CODE = 6000;
// 생성 코드 표시·저장 상한 — 터틀 게임 전체 코드가 잘리지 않게 넉넉히(약 150줄).
const MAX_CODE_OUT = 12000;
const MAX_EXPLAIN_OUT = 3000;

export interface VibeCodeResult {
  /** AI 가 돌려준 전체 파이썬 코드 (거절이면 빈 문자열) */
  code: string;
  /** 무엇을 바꿨는지 쉬운 설명 (거절 사유도 여기로 온다) */
  explanation: string;
}

/** vibe_code 대상 — turtle(22차 똥피하기) / microbit(25차 만보기 MakeCode Python). 안 주면 turtle. */
export type VibeTarget = "turtle" | "microbit";

/**
 * 25차 만보기 기본 코드 — AI가 '여기에 기능을 더한' 전체 프로그램을 만들 바탕 (MakeCode static Python).
 *
 * 흔들면 걸음 수(steps)가 1 늘고 숫자로 보여주는, 미션 1·2 를 합친 완성 만보기다. 차시가 vibeBaseCode 를
 * 안 주면 서버가 이 값을 바탕으로 쓴다. 변수 이름은 영어 `steps`(교사 확정 2026-10-25). makecode.microbit.org
 * '파이썬 보기' 에서 붙여넣기·블록 변환·시뮬레이터 동작 확인됨.
 */
export const MICROBIT_MANBOGI_BASE = `steps = 0

def on_gesture_shake():
    global steps
    steps += 1
    basic.show_number(steps)
input.on_gesture(Gesture.SHAKE, on_gesture_shake)`;

/** 아티팩트 answers[key] 에 저장하는 기록 한 건. */
export interface VibeCodeEntry {
  prompt: string;
  code: string;
  explanation: string;
  at: number;
}

/** 아티팩트 answers[key] 에 JSON 으로 담기는 바이브 코딩 기록 전체. */
export interface VibeCodeLog {
  entries: VibeCodeEntry[];
  updatedAt: number;
}

/** 22차 turtle 똥피하기용 시스템 프롬프트 (OneCompiler 터틀 전체 코드). */
function buildTurtleSystem(baseCode: string): string {
  return [
    "너는 중학교 1학년 학생이 파이썬 turtle '똥피하기' 게임에 기능 하나를 추가하도록 돕는 도우미다.",
    "아래 '현재 코드' 에, 학생이 말한 기능을 더해 전체가 실행 가능한 파이썬 코드를 만들어 준다.",
    "",
    "규칙:",
    "- 반드시 전체 코드를 한 번에 준다(일부만 주거나 생략하지 않는다). OneCompiler 터틀에서 그대로 돌아가야 한다.",
    "- 화면에 쓰는 글씨(write)는 영어로 한다 — 온라인 터틀이 한글을 네모로 깨뜨린다. 주석(#)은 한국어로 써도 된다.",
    "- 중학교 1학년이 이해할 수 있게, 너무 어려운 문법은 피하고 현재 코드의 틀을 최대한 그대로 둔다.",
    "- 게임과 상관없는 요청, 또는 부적절한(폭력·혐오·개인정보·욕설 등) 요청은 코드를 주지 말고 정중히 거절한다.",
    "- 아래 출력 형식을 반드시 지켜라:",
    "    먼저 코드 한 덩어리를 ```python 과 ``` 사이에 넣는다.",
    "    그다음 줄에 '설명:' 으로 시작해, 무엇을 어떻게 바꿨는지 2~4문장으로 쉽게 설명한다.",
    "    (거절할 때는 코드 블록 없이 '설명:' 뒤에 왜 도와줄 수 없는지 한두 문장만 적는다.)",
    "",
    "현재 코드:",
    "```python",
    baseCode.slice(0, MAX_BASE_CODE),
    "```",
  ].join("\n");
}

/**
 * 25차 마이크로비트 만보기용 시스템 프롬프트 (MakeCode static Python 전체 코드).
 *
 * 핵심: MicroPython(from microbit import *, display.show …)·turtle 이 아니라 **MakeCode static Python**
 * 이다. makecode.microbit.org '파이썬 보기' 에 그대로 붙여 블록으로도 변환·실행돼야 한다. 아래 API·관례는
 * 2026-10-25 에 실제 에디터에서 붙여넣기·블록 변환·시뮬레이터 동작을 확인한 것만 쓰게 못 박았다.
 */
function buildMicrobitSystem(baseCode: string): string {
  return [
    "너는 중학교 1학년 학생이 마이크로비트(micro:bit) '만보기' 프로그램에 기능 하나를 추가하도록 돕는 도우미다.",
    "아래 '현재 코드'(흔들면 걸음이 1 늘고 화면에 숫자로 보여주는 만보기)에, 학생이 말한 기능을 더한",
    "**전체 프로그램**을 만들어 준다. 추가한 부분만이 아니라, 처음부터 끝까지 그대로 실행되는 완성 코드를 준다.",
    "",
    "가장 중요한 규칙 — 이 코드는 반드시 **MakeCode(makecode.microbit.org)의 static Python** 이어야 한다:",
    "- MicroPython 이 아니다. 'from microbit import *', 'display.show', 'Image', 'while True:', 'import' 를 절대 쓰지 마라.",
    "- turtle·pygame·input()·print() 같은 PC용 코드도 쓰지 마라. 오직 micro:bit MakeCode API 만 쓴다.",
    "- 아래 '현재 코드' 에 이미 있는 'steps' 변수를 그대로 쓴다(걸음 수). 함수 안에서 steps 를 바꾸려면 그 함수 첫 줄에 'global steps' 을 넣는다.",
    "",
    "쓸 수 있는 MakeCode API (아래 것들만, 실제 에디터에서 동작 확인됨):",
    "- 화면: basic.show_number(값) · basic.show_icon(IconNames.HEART) · basic.show_string(\"HI\") · basic.clear_screen() · basic.pause(밀리초)",
    "  (IconNames 예: HEART, SMALL_HEART, YES, NO, HAPPY, SAD, ASLEEP, DUCK, GHOST. show_string 의 글씨는 영어로.)",
    "- 입력(이벤트): 함수를 def 로 정의한 뒤 아래처럼 등록한다.",
    "    흔들기 → input.on_gesture(Gesture.SHAKE, 함수)",
    "    버튼  → input.on_button_pressed(Button.A, 함수) / Button.B / Button.AB (A+B 동시)",
    "    핀 터치 → input.on_pin_pressed(TouchPin.P0, 함수)",
    "- 반복: def on_forever(): ... 뒤에 basic.forever(on_forever)",
    "- 소리(micro:bit v2): music.play(music.tone_playable(262, music.beat(BeatFraction.WHOLE)), music.PlaybackMode.UNTIL_DONE)",
    "  (음 높이는 숫자 Hz. 262=도, 294=레, 330=미, 392=솔. 더 간단히는 그냥 이 한 줄을 그대로 쓴다.)",
    "- 변수 증감: steps += 1 (늘리기) · steps = 0 (초기화)",
    "",
    "그 밖의 규칙:",
    "- 중학교 1학년이 이해할 수 있게 짧고 쉽게. 현재 코드의 틀(steps 변수, 흔들기로 1 늘리기)은 최대한 그대로 두고 요청 기능만 더한다.",
    "- 들여쓰기는 공백 4칸. 파이썬 문법에 맞게(콜론·들여쓰기) 정확히 쓴다.",
    "- 만보기·마이크로비트와 상관없는 요청, 또는 부적절한(폭력·혐오·개인정보·욕설 등) 요청은 코드를 주지 말고 정중히 거절한다.",
    "- 아래 출력 형식을 반드시 지켜라:",
    "    먼저 코드 한 덩어리를 ```python 과 ``` 사이에 넣는다.",
    "    그다음 줄에 '설명:' 으로 시작해, 무엇을 어떻게 바꿨는지 2~4문장으로 쉽게 설명한다.",
    "    (거절할 때는 코드 블록 없이 '설명:' 뒤에 왜 도와줄 수 없는지 한두 문장만 적는다.)",
    "",
    "현재 코드:",
    "```python",
    baseCode.slice(0, MAX_BASE_CODE),
    "```",
  ].join("\n");
}

function buildSystem(baseCode: string, target: VibeTarget): string {
  return target === "microbit" ? buildMicrobitSystem(baseCode) : buildTurtleSystem(baseCode);
}

/** ```python ...``` 코드 블록과 그 뒤 '설명:' 을 갈라낸다. 형식이 어긋나도 최대한 건진다. */
function parseOutput(text: string): VibeCodeResult {
  const fence = text.match(/```(?:python|py)?\s*\n([\s\S]*?)```/i);
  let code = "";
  let rest = text;
  if (fence) {
    code = fence[1].trim();
    rest = (text.slice(0, fence.index) + text.slice((fence.index ?? 0) + fence[0].length)).trim();
  }
  // '설명:' 뒤만 설명으로. 없으면 코드 블록 밖 텍스트 전부를 설명으로.
  const marker = rest.indexOf("설명:");
  const explanation = (marker >= 0 ? rest.slice(marker + 3) : rest).trim();
  return {
    code: code.slice(0, MAX_CODE_OUT),
    explanation: (explanation || "설명을 받지 못했어요. 코드를 실행해 보고, 안 되면 다시 요청해 보세요.").slice(
      0,
      MAX_EXPLAIN_OUT,
    ),
  };
}

/**
 * 학생 프롬프트로 코드를 생성한다. 실패(키 없음·시간초과·네트워크·빈 응답)하면 null —
 * 라우트가 안내를 띄운다. 학번·이름은 넘기지 않는다(baseCode·prompt 만).
 */
export async function vibeCodeGenerate(input: {
  baseCode: string;
  prompt: string;
  /** turtle(22차, 기본) / microbit(25차 만보기). 대상별 시스템 프롬프트를 고른다 */
  target?: VibeTarget;
}): Promise<VibeCodeResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const system = buildSystem(input.baseCode, input.target ?? "turtle");
  const userText = `추가하고 싶은 기능: ${input.prompt.trim().slice(0, MAX_PROMPT)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        // 키는 헤더로 — URL 은 프록시·로그에 남기 쉽다 (comfort-bot 과 같은 이유).
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: userText }] }],
          // 코드가 1400 토큰에서 잘리던 문제 — 전체 코드+설명이 들어가게 넉넉히(flash 출력 상한).
          generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = (payload.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return null;
    return parseOutput(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
