"use client";

import { useCallback } from "react";

import type { RowColumn } from "@/lib/types";

/**
 * 줄을 늘려 가며 적는 칸.
 *
 * ## 왜 긴 글칸으로는 안 되는가
 *
 * "장소마다 내 마음을 적어 주세요 — 세 곳 이상" 을 긴 글칸 하나로 받았더니, 학생이
 * 형식을 스스로 지켜야 했다. 「장소 — 감정 — 이모지」 를 세 번 반복해 치는 일은
 * 중1에게 활동이 아니라 타자 연습이고, 형식이 흐트러지면 나중에 셀 수도 없다.
 *
 * 칸을 나눠 주면 무엇을 적어야 하는지가 칸 모양으로 보이고, 모아 놓으면 반 전체에서
 * "어느 장소가 힘든가" 를 셀 수 있다.
 *
 * ## 어떻게 저장하는가
 *
 * 답 하나에 JSON 배열로 담는다. 서버는 문항의 maxLength 로 자를 뿐이라 형식을 모른다 —
 * ai_review·emotion_lens 가 결과를 담는 방식과 같다.
 *
 * 깨진 값이 들어와도 화면이 죽지 않게, 못 읽으면 빈 목록으로 물러난다. 학기 중에
 * 문항을 고쳤을 때 옛 형식이 남아 있을 수 있다.
 */

type Row = Record<string, string>;

function parse(raw: string): Row[] {
  if (!raw.trim()) return [];
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((r): r is Row => typeof r === "object" && r !== null);
  } catch {
    return [];
  }
}

/** 한 줄이라도 적힌 것이 있는가. 빈 줄만 남으면 답을 통째로 비운다 */
function hasAny(rows: Row[]): boolean {
  return rows.some((row) => Object.values(row).some((v) => String(v ?? "").trim()));
}

export function RowsField({
  value,
  columns,
  maxRows,
  onChange,
  disabled,
}: {
  value: string;
  columns: RowColumn[];
  maxRows: number;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const rows = parse(value);
  /* 처음 열면 빈 줄 하나를 보여준다. 「추가」부터 눌러야 하면 무엇을 하는 칸인지 안 보인다 */
  const shown = rows.length > 0 ? rows : [{}];

  const write = useCallback(
    (next: Row[]) => onChange(hasAny(next) ? JSON.stringify(next) : ""),
    [onChange],
  );

  function setCell(index: number, key: string, cell: string) {
    write(shown.map((row, i) => (i === index ? { ...row, [key]: cell } : row)));
  }

  return (
    <div className="flex flex-col gap-3">
      {shown.map((row, index) => (
        <div
          key={index}
          className="flex flex-col gap-2 rounded-lg border border-line p-3"
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="t-caption text-muted">{index + 1}</span>
            {/*
              줄이 하나뿐일 때는 지우기를 막는다. 다 지우고 나면 무엇을 하는 칸인지
              모르는 빈 화면이 남는다 — 그때는 칸을 비우면 그만이다.
            */}
            {shown.length > 1 && (
              <button
                type="button"
                onClick={() => write(shown.filter((_, i) => i !== index))}
                disabled={disabled}
                className="pill pill-secondary t-caption"
              >
                이 줄 지우기
              </button>
            )}
          </div>

          {columns.map((column) =>
            column.emojis && column.emojis.length > 0 ? (
              <div key={column.key} className="flex flex-col gap-1">
                <span className="t-caption">{column.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {column.emojis.map((emoji) => {
                    const on = (row[column.key] ?? "") === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setCell(index, column.key, on ? "" : emoji)}
                        disabled={disabled}
                        className={`h-11 w-11 rounded-lg border text-2xl ${
                          on ? "border-ink border-2 bg-surface" : "border-line bg-canvas"
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <label key={column.key} className="flex flex-col gap-1">
                <span className="t-caption">{column.label}</span>
                <input
                  value={row[column.key] ?? ""}
                  onChange={(event) => setCell(index, column.key, event.target.value.slice(0, 40))}
                  placeholder={column.placeholder}
                  disabled={disabled}
                  className="field t-body-sm disabled:opacity-60"
                />
              </label>
            ),
          )}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => write([...shown, {}])}
          disabled={disabled || shown.length >= maxRows}
          className="pill pill-secondary t-body-sm disabled:opacity-35"
        >
          + 줄 추가
        </button>
        <span className="t-caption text-muted">
          {shown.length} / {maxRows}
        </span>
      </div>
    </div>
  );
}
