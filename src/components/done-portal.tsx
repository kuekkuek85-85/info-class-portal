"use client";

/**
 * 수행평가를 끝낸 학생이 보는 화면.
 *
 * ## 왜 활동지를 통째로 대신하는가
 *
 * 선생님이 「통과」를 준 학생은 이 수행평가에서 더 할 일이 없다. 그런데 활동지가
 * 그대로 열려 있으면 다 낸 글을 계속 만지게 되고, 만지다 보면 고쳐 놓은 것을
 * 무너뜨린다. 끝난 사람에게는 끝난 화면을 준다.
 *
 * 「고치기」를 받은 학생에게는 안 뜬다 — 그 학생은 고쳐서 다시 내야 한다.
 *
 * ## 선생님이 남긴 말을 위에 둔다
 *
 * 게임이 먼저 보이면 무엇 때문에 통과했는지 안 읽고 지나간다. 통과의 근거가
 * 그 한 줄이라, 게임보다 위에 있어야 한 번은 눈에 걸린다.
 */

export interface DonePortalGame {
  label: string;
  url: string;
  hint?: string;
}

export function DonePortal({
  games,
  feedback,
}: {
  games: DonePortalGame[];
  feedback: { chips: string[]; note: string } | null;
}) {
  const hasWord =
    feedback && (feedback.chips.length > 0 || feedback.note.trim().length > 0);

  return (
    <section className="flex flex-col gap-5">
      <div className="block flex flex-col gap-2 bg-lime">
        <p className="t-display">다 했어요 ✓</p>
        <p className="t-body-lg">
          선생님이 확인했습니다. 이 수행평가는 여기서 끝이에요.
        </p>
      </div>

      {hasWord && (
        <div className="flex flex-col gap-2 rounded-lg border-2 border-ink bg-canvas p-4">
          <p className="t-eyebrow">선생님이 남긴 말</p>
          {feedback!.chips.map((chip) => (
            <p key={chip} className="t-headline">
              · {chip}
            </p>
          ))}
          {feedback!.note && (
            <p className="t-body-lg whitespace-pre-line">{feedback!.note}</p>
          )}
        </div>
      )}

      {games.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="t-headline">남은 시간에 할 수 있는 것</h2>
          <p className="t-note">
            선생님이 정보 시간에 쓰려고 만든 게임이에요. 새 창으로 열립니다.
            선생님이 부르면 돌아오세요.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {games.map((game) => (
              <a
                key={game.url}
                href={game.url}
                target="_blank"
                rel="noreferrer"
                className="card flex flex-1 flex-col gap-1 text-center transition active:scale-[0.99]"
              >
                <span className="t-card-title">{game.label}</span>
                {game.hint && <span className="t-body-sm text-muted">{game.hint}</span>}
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
