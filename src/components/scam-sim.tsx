"use client";

import { useEffect, useState } from "react";

import type { ScamScene } from "@/lib/types";

/** 판단하는 장면인가. 직접 당해 보는 장면(login·type)은 점수에 안 넣는다 */
function isJudged(scene: ScamScene): boolean {
  return scene.mode === "compare" || scene.mode === "message";
}

/**
 * 개인정보 침해를 한 장면씩 겪어 보는 체험 (9차시).
 *
 * ## 비밀번호를 받는 칸이 없다
 *
 * 진짜 같은 로그인 창을 만들어 쳐 보게 하는 방식을 쓰지 않는다. 그렇게 만든 것은
 * 그대로 쓸 수 있는 피싱 도구가 되고, 가르치는 교훈도 "화면만 봐서는 못 알아본다" 라
 * 막다른 길이다. 슬라이드가 짚는 것도 화면이 아니라 **주소**다.
 *
 * 그래서 주소창을 화면에서 가장 크게 놓는다. 파밍 장면에만 입력칸이 하나 있는데,
 * 그것은 비밀번호가 아니라 **주소**를 치는 칸이고 어디로도 보내지 않는다.
 *
 * ## 고르기 전에는 답을 안 보여준다
 *
 * 세 장면 모두 "고른다 → 밝힌다" 로 간다. 밝히기 전에 한 번 틀려 보는 것이 이 활동의
 * 전부다 — 설명을 먼저 읽으면 그냥 아는 이야기가 되고 아무것도 안 남는다.
 *
 * ## 저장하는 것은 점수 한 줄뿐이다
 *
 * 무엇을 눌렀는지는 남기지 않는다. 교사가 볼 일이 없고, 틀린 것이 기록으로 남는다고
 * 생각하면 중1은 찍지 않고 옆을 본다.
 */
export function ScamSim({
  scenes,
  value,
  onChange,
  disabled,
}: {
  scenes: ScamScene[];
  /** "2/3" 꼴로 저장된 지난 결과 */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  /** 장면별로 밝혀졌는가, 그리고 맞혔는가 */
  const [opened, setOpened] = useState<Record<number, boolean>>({});
  const [correct, setCorrect] = useState<Record<number, boolean>>({});

  /** 점수에 넣는 장면 수. 직접 당해 보는 장면은 세지 않는다 */
  const judgedTotal = scenes.filter(isJudged).length;

  function reveal(index: number, ok: boolean) {
    if (disabled || opened[index]) return;
    const nextOpened = { ...opened, [index]: true };
    const nextCorrect = { ...correct, [index]: ok };
    setOpened(nextOpened);
    setCorrect(nextCorrect);

    const got = Object.values(nextCorrect).filter(Boolean).length;
    // 판단하는 장면이 하나도 없으면 점수를 남기지 않는다 (0/0 을 피한다)
    if (judgedTotal > 0) onChange(`${got}/${judgedTotal}`);
  }

  return (
    <div className="flex flex-col gap-6">
      {scenes.map((scene, index) => {
        // info 모드는 겪을 것이 없다 — 개념 카드라 늘 펼쳐져 있다
        const shown = scene.mode === "info" || opened[index];
        return (
          <section
            key={scene.title}
            className="flex flex-col gap-3 rounded-lg border-2 border-ink p-4"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <h3 className="t-headline">{scene.title}</h3>
              {opened[index] &&
                scene.mode !== "info" &&
                (isJudged(scene) ? (
                  <span className="t-body-sm font-bold">
                    {correct[index] ? "맞혔어요" : "속았어요"}
                  </span>
                ) : (
                  <span className="t-body-sm font-bold">당했어요</span>
                ))}
            </div>
            {scene.mode !== "info" && <p className="t-body">{scene.prompt}</p>}

            {scene.mode === "login" && (
              <LoginScene scene={scene} done={opened[index]} onPhished={() => reveal(index, false)} />
            )}
            {scene.mode === "compare" && (
              <CompareScene scene={scene} done={opened[index]} onPick={(ok) => reveal(index, ok)} />
            )}
            {scene.mode === "type" && (
              <TypeScene scene={scene} done={opened[index]} onDone={() => reveal(index, false)} />
            )}
            {scene.mode === "message" && (
              <MessageScene scene={scene} done={opened[index]} onPick={(ok) => reveal(index, ok)} />
            )}

            {/* 겪은 뒤에 뜨는 "무엇을 봤어야 했나" — 이 장면에서만 통하는 구체적 단서 */}
            {opened[index] && scene.mode !== "info" && (
              <div className="flex flex-col gap-2 rounded-lg bg-cream p-3">
                <p className="t-body-lg">{scene.answer}</p>
                {(scene.clues?.length ?? 0) > 0 && (
                  <>
                    <p className="t-eyebrow">무엇을 보고 알 수 있었나</p>
                    <ul className="flex flex-col gap-1">
                      {scene.clues!.map((clue) => (
                        <li key={clue} className="t-body">
                          · {clue}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* 개념과 수칙 — 선생님이 짚어 가며 설명하는 자리 (겪은 뒤에 뜬다) */}
            {shown && (scene.concept || (scene.rules?.length ?? 0) > 0) && (
              <div className="flex flex-col gap-2 rounded-lg border-2 border-ink p-3">
                {scene.concept && (
                  <>
                    <p className="t-eyebrow">개념</p>
                    <p className="t-body whitespace-pre-line">{scene.concept}</p>
                  </>
                )}
                {(scene.rules?.length ?? 0) > 0 && (
                  <>
                    <p className="t-eyebrow">이렇게 막아요</p>
                    <ul className="flex flex-col gap-1">
                      {scene.rules!.map((rule) => (
                        <li key={rule} className="t-body">
                          · {rule}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {scene.videoUrl && (
                  <a
                    href={scene.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="pill pill-secondary self-start t-body-sm"
                  >
                    {scene.videoLabel ?? "영상 보기"}
                  </a>
                )}
              </div>
            )}
          </section>
        );
      })}

      {value && <p className="t-caption">지금까지 {value} 맞혔어요.</p>}
    </div>
  );
}

/**
 * 직접 당해 보기 — 가짜 로그인 화면에 실제로 쳐 본다.
 *
 * ## 왜 iframe 인가
 *
 * 로그인 화면은 public 의 정적 파일이다 (phish-demo/naver-login.html). 학생이 친 것을
 * **어디로도 안 보내고** 알림창으로만 되돌린다 — 그 파일에 서버로 보내는 코드가 한 줄도
 * 없다. 여기서는 그 화면을 액자에 넣어 띄우기만 한다.
 *
 * 위에 주소창을 크게 얹는다. 이 활동이 가르치려는 것이 그 한 줄이기 때문이다 — 화면은
 * 진짜 같아도 주소가 가짜다. 학생은 대개 그것을 안 보고 비밀번호부터 친다. 그게 요점이다.
 *
 * 알림창이 뜨면 그 안의 화면이 부모 창(이곳)에 "당했다" 신호를 보내고, 그때 아래 설명이
 * 펼쳐진다. 값은 안 온다 — 신호 한 마디뿐이다.
 */
function LoginScene({
  scene,
  done,
  onPhished,
}: {
  scene: ScamScene;
  done?: boolean;
  onPhished: () => void;
}) {
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.data === "phish-demo:submitted") onPhished();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onPhished]);

  return (
    <div className="flex flex-col gap-3">
      {scene.shownUrl && <AddressBar url={scene.shownUrl} />}
      <div className="overflow-hidden rounded-lg border-2 border-ink">
        <iframe
          src={scene.embedUrl}
          title="가짜 로그인 화면 (수업용)"
          className="h-[420px] w-full"
          // 로그인만 되고 다른 데로 못 튀게 막는다. 스크립트는 알림·부모 신호에 필요하다
          sandbox="allow-scripts allow-forms allow-modals"
        />
      </div>
      {!done && <p className="t-caption">아무 아이디·비밀번호나 넣고 로그인을 눌러 보세요.</p>}
    </div>
  );
}

/**
 * 주소창.
 *
 * 이 활동에서 학생이 봐야 하는 것은 이것 하나다. 그래서 페이지 그림을 그리지 않고
 * 주소창만 크게 그린다 — 아래에 그럴듯한 화면을 붙이면 시선이 그리로 간다.
 *
 * ## 표시는 주소에서만 뽑는다
 *
 * 처음에는 "가짜인가" 로 자물쇠와 경고를 갈랐다. 그러면 **고르기 전에 답이 보인다** —
 * 한쪽에만 ⚠️ 가 붙어 있으니 주소를 안 읽고 그것만 누른다. 활동이 통째로 무의미해진다.
 *
 * 그래서 https 인지만 보고 고른다. 브라우저가 하는 일과 같고, 그것 자체가 오늘 가르칠
 * 단서 중 하나다 (슬라이드 11의 "https 확인하기"). 경고 표시도 ⚠️ 대신 ⓘ 로 둔다 —
 * ⚠️ 는 너무 커서 그것만 보인다.
 */
function AddressBar({ url }: { url: string }) {
  const secure = url.startsWith("https://");
  return (
    <div className="flex items-center gap-2 rounded-lg border-2 border-ink bg-canvas px-3 py-2">
      <span aria-hidden className="t-body">
        {secure ? "🔒" : "ⓘ"}
      </span>
      <span className="t-body-lg break-all font-mono">{url}</span>
    </div>
  );
}

/** 피싱 — 두 주소를 나란히 놓고 가짜를 고른다 */
function CompareScene({
  scene,
  done,
  onPick,
}: {
  scene: ScamScene;
  done?: boolean;
  onPick: (ok: boolean) => void;
}) {
  const sites = scene.sites ?? [];
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {sites.map((site) => (
        <button
          key={site.url}
          type="button"
          disabled={done}
          onClick={() => onPick(site.fake)}
          className={`flex flex-1 flex-col gap-2 rounded-lg border-2 p-3 text-left transition ${
            done && site.fake ? "border-ink bg-pink" : "border-line"
          } ${done ? "cursor-default" : "active:scale-[0.99]"}`}
        >
          <span className="t-caption">{site.caption}</span>
          <AddressBar url={site.url} />
          {done && <span className="t-body-sm font-bold">{site.fake ? "이쪽이 가짜" : "이쪽이 진짜"}</span>}
        </button>
      ))}
    </div>
  );
}

/**
 * 파밍 — 맞는 주소를 직접 치는데도 다른 곳이 열린다.
 *
 * 여기서만 결과가 늘 "당했어요" 다. 맞는 주소를 치는 것이 곧 당하는 길이라는 것이
 * 파밍의 정의이기 때문이다 — 그 배신감이 이 장면의 전부다.
 *
 * ## 리다이렉션을 눈으로 보여준다
 *
 * 링크를 누르는 것이 아니라 **주소를 직접 친다.** 정확히 쳐야 「들어가기」 가 열린다 —
 * 대충 치고 넘어가면 "주소를 잘못 쳐서 그런 거 아냐?" 하고 빠져나갈 구멍이 생긴다.
 *
 * 들어가기를 누르면 "접속 중" 을 잠깐 보여준 뒤, 친 주소가 아니라 **다른 곳**이 열린다.
 * hosts 파일이 바뀌면 실제로 이렇게 된다 — 브라우저는 시킨 대로 갔는데 도착지가 다르다.
 */
function TypeScene({
  scene,
  done,
  onDone,
}: {
  scene: ScamScene;
  done?: boolean;
  onDone: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const expect = scene.expect ?? "";
  const matches = typed.trim().toLowerCase() === expect.toLowerCase();

  function go() {
    // 진짜로 이동하는 것처럼 한 박자 기다렸다가 도착지를 뒤집는다
    setLoading(true);
    setTimeout(onDone, 900);
  }

  return (
    <div className="flex flex-col gap-3">
      {!done ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="t-body-sm">
              주소창에 <b>{expect}</b> 를 정확히 쳐 보세요
            </span>
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder="주소를 입력하세요"
              className="field font-mono"
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
            />
          </label>
          {loading ? (
            <p className="t-body">{expect} 접속 중…</p>
          ) : (
            <>
              <button
                type="button"
                onClick={go}
                disabled={!matches}
                className="pill pill-primary self-start disabled:opacity-35"
              >
                들어가기
              </button>
              {typed.trim() && !matches && <p className="t-caption">정확히 똑같이 쳐 주세요.</p>}
            </>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <span className="t-caption">내가 친 주소</span>
            <AddressBar url={`https://${expect}`} />
          </div>
          <p className="text-center t-headline" aria-hidden="true">
            ↓
          </p>
          <div className="flex flex-col gap-1">
            <span className="t-caption">그런데 열린 곳</span>
            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <AddressBar url={`http://${scene.redirectUrl ?? ""}`} />
              </div>
              {/*
                정말로 그리로 열리는지 눌러서 확인한다 — 이 링크는 진짜 학교 홈페이지로
                간다. 시뮬레이션이 아니라 실제 이동이라, 새 창으로 열어 수업 화면을 두고
                간다 (같은 창에서 나가면 활동으로 돌아올 길이 없다).
              */}
              {scene.redirectUrl && (
                <a
                  href={`https://${scene.redirectUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="pill pill-primary flex shrink-0 items-center"
                >
                  들어가기
                </a>
              )}
            </div>
          </div>
          <p className="t-body-lg">
            {expect} 를 쳤는데 엉뚱한 곳이 열렸습니다. 이것이 파밍이에요.
          </p>
        </>
      )}
    </div>
  );
}

/** 스미싱 — 문자가 오고, 링크를 누르기 전에 판단한다 */
function MessageScene({
  scene,
  done,
  onPick,
}: {
  scene: ScamScene;
  done?: boolean;
  onPick: (ok: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-canvas p-3">
        <p className="t-caption">{scene.sender}</p>
        <p className="t-body whitespace-pre-line">{scene.body}</p>
        <p className="t-body-lg break-all font-mono underline">{scene.linkText}</p>
      </div>

      {!done ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {/*
            누르는 쪽을 먼저 놓는다. 실제로 손이 먼저 가는 쪽이 그쪽이고, 안전한 답을
            앞에 두면 고르기 전에 정답이 무엇인지 알아버린다.
          */}
          <button
            type="button"
            onClick={() => onPick(false)}
            className="pill pill-secondary flex-1"
          >
            눌러 본다
          </button>
          <button type="button" onClick={() => onPick(true)} className="pill pill-secondary flex-1">
            안 누른다
          </button>
        </div>
      ) : (
        scene.linkUrl && (
          <>
            <p className="t-body-sm">눌렀다면 이런 곳으로 갑니다 —</p>
            <AddressBar url={scene.linkUrl} />
          </>
        )
      )}
    </div>
  );
}
