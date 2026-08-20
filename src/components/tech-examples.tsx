"use client";

import { useEffect } from "react";

/**
 * "첨단 기술이 뭔데요?" 에 답하는 낱말 보기.
 *
 * 3차시에서 그림에 첨단 기술을 넣고 그 이름을 적게 했더니, 중1이 **첨단 기술이라는 말
 * 자체를 몰라** 손을 놓았다. 힌트 한 줄("예) 자동 배달 로봇")로는 모자랐다 — 예시 하나는
 * 그것만 베끼게 만들고, 고를 수 있는 목록이 있어야 자기 것을 고른다.
 *
 * ## 눌러도 칸에 안 들어간다
 *
 * 답으로 원하는 것은 "로봇"이 아니라 "음식을 나르는 로봇"이다. 눌러서 넣게 하면 낱말만
 * 남고 생각이 빠진다. 그래서 보기는 읽는 것으로만 두고, 낱말을 문장으로 만드는 법을
 * 아래에 한 줄로 적어 둔다.
 */

/** 낱말 목록 자체. 두 화면(그림판 · 활동지)이 같은 모양으로 쓴다 */
export function TechExampleChips({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-cream px-4 py-3">
      <p className="t-body-sm">
        <b>첨단 기술</b>이란 이런 것들이에요. 이 중에서 골라 보세요.
      </p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item} className="rounded-full bg-canvas px-3 py-1.5 t-body-sm">
            {item}
          </li>
        ))}
      </ul>
      {/*
        낱말만 적고 끝내는 것을 막는 한 줄.
        "로봇" 은 기술 분야이지 그림에 그릴 수 있는 물건이 아니다.
      */}
      <p className="t-caption">
        고른 낱말에 <b>무엇을 해 주는지</b>를 붙이면 그릴 수 있는 것이 돼요.
        <br />
        로봇 → <b>음식을 나르는</b> 로봇 · 생체인식 → <b>얼굴로 문을 여는</b> 출입문
      </p>
    </div>
  );
}

/**
 * 그림판에서 단추로 여는 판.
 *
 * 그림판은 세로가 빠듯하다 — 캔버스가 화면에 들어가도록 남은 높이를 재서 쓰고 있어서,
 * 목록을 늘 펼쳐 두면 그만큼 캔버스가 줄어든다. 필요할 때만 띄운다.
 */
export function TechExampleModal({ items, onClose }: { items: string[]; onClose: () => void }) {
  // 그리다가 열었을 것이다. 손이 키보드에 없을 수도 있으니 Escape 도 열어 둔다.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tech-examples-title"
      // 바깥을 눌러도 닫힌다. 중1은 닫기 단추를 찾기 전에 화면 아무 데나 누른다.
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-3 rounded-lg bg-canvas p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="tech-examples-title" className="t-subhead">
          무엇을 그릴지 막혔나요?
        </h2>
        <TechExampleChips items={items} />
        <button type="button" onClick={onClose} className="pill pill-primary">
          닫고 그리러 가기
        </button>
      </div>
    </div>
  );
}
