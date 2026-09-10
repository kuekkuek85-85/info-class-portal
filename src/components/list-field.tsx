"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 자유서술 반복 입력 — 칸을 늘려 가며 여러 개를 적는다 (11차시 ② 대처방안).
 *
 * ## 왜 긴 글칸 하나가 아닌가
 *
 * "대처방안을 2개 이상" 을 긴 글칸 하나로 받으면, 학생이 스스로 번호를 매기고 나누어야
 * 한다. 몇 개를 썼는지 세기도 어렵고(제출 문턱을 항목 수로 걸 수 없다), 한 칸에 몰아
 * 쓰고 끝내기 쉽다. 칸을 나눠 주면 "여러 개를 적는 자리" 임이 모양으로 보이고, 채워진
 * 칸 수로 문턱을 셀 수 있다 (article-check 의 countListItems).
 *
 * ## 어떻게 저장하는가
 *
 * 답 하나에 문자열 배열을 JSON 으로 담는다 (rows-field 와 같은 방식). 빈 칸만 남으면
 * 답을 통째로 비운다. 깨진 값이 들어와도 죽지 않게, 못 읽으면 빈 목록으로 물러난다.
 *
 * ## 붙여넣기 차단
 *
 * noPaste 면 각 칸의 onPaste·우클릭·드롭·Ctrl/⌘+V 를 막는다 (worksheet-view 의
 * text/long 과 같은 규칙). 오픈북이라 AI 참고는 되지만, 옮길 때 한 번은 자기 손을 거친다.
 */

function parse(raw: string): string[] {
  if (!raw.trim()) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

/** 하나라도 적힌 것이 있는가. 빈 칸만 남으면 답을 통째로 비운다 */
function hasAny(items: string[]): boolean {
  return items.some((v) => v.trim().length > 0);
}

/** 최소 칸 수만큼 빈 칸을 채운다 */
function padded(items: string[], minItems: number): string[] {
  return items.length >= minItems
    ? items
    : [...items, ...Array(minItems - items.length).fill("")];
}

/** 이 컴포넌트가 저장으로 내보내는 형태 — 빈 칸만 남으면 "" */
function serialize(items: string[]): string {
  return hasAny(items) ? JSON.stringify(items) : "";
}

const stop = (event: { preventDefault: () => void }) => event.preventDefault();

export function ListField({
  value,
  minItems,
  maxItems,
  placeholder,
  noPaste,
  disabled,
  onChange,
}: {
  value: string;
  minItems: number;
  maxItems: number;
  placeholder?: string;
  noPaste?: boolean;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  /*
   * 보여줄 칸을 **내부 상태**로 든다. 저장된 값(배열)에서만 칸 수를 도출하면, 빈 칸만
   * 남았을 때 값이 "" 로 저장돼(배열이 사라짐) [칸 추가]로 만든 빈 칸이 바로 사라진다.
   * 그래서 칸 수는 여기서 들고, 저장은 내용이 있을 때만 내보낸다(serialize).
   */
  const [shown, setShown] = useState<string[]>(() => padded(parse(value), minItems));

  /*
   * 밖에서 값이 바뀌면(다시 열기·프리필 등) 맞춘다. 내가 방금 쓴 것과 같으면 건드리지
   * 않는다 — 안 그러면 타이핑 → onChange → 값 변경 → 여기서 되돌림 이 되어 빈 칸이 날아간다.
   */
  useEffect(() => {
    if (value !== serialize(shown)) setShown(padded(parse(value), minItems));
    // shown 은 의도적으로 뺀다 — 밖의 value 변화에만 반응한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, minItems]);

  const write = useCallback(
    (next: string[]) => {
      setShown(next);
      onChange(serialize(next));
    },
    [onChange],
  );

  const pasteProps = noPaste
    ? {
        onPaste: stop,
        onDrop: stop,
        onContextMenu: stop,
        onKeyDown: (event: {
          ctrlKey: boolean;
          metaKey: boolean;
          key: string;
          preventDefault: () => void;
        }) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
            event.preventDefault();
          }
        },
      }
    : {};

  return (
    <div className="flex flex-col gap-2">
      {shown.map((item, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="t-caption text-muted pt-2">{index + 1}</span>
          <textarea
            value={item}
            onChange={(event) =>
              write(shown.map((v, i) => (i === index ? event.target.value : v)))
            }
            rows={2}
            disabled={disabled}
            placeholder={placeholder}
            className="field flex-1 disabled:opacity-60"
            {...pasteProps}
          />
          {/*
            칸이 minItems 를 넘을 때만 지우기를 준다. 최소 칸은 비우면 그만이라 지우기가
            필요 없고, 다 지워 minItems 아래로 내려가면 무엇을 하는 자리인지 안 보인다.
          */}
          {shown.length > minItems && (
            <button
              type="button"
              onClick={() => write(shown.filter((_, i) => i !== index))}
              disabled={disabled}
              className="pill pill-secondary t-caption shrink-0"
            >
              지우기
            </button>
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => write([...shown, ""])}
          disabled={disabled || shown.length >= maxItems}
          className="pill pill-secondary t-body-sm disabled:opacity-35"
        >
          + 칸 추가
        </button>
        {noPaste && (
          <span className="t-caption text-muted">직접 입력하는 활동이에요 — 붙여넣기는 꺼져 있어요.</span>
        )}
      </div>
    </div>
  );
}
