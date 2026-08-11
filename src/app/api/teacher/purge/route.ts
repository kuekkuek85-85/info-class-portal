import { fail, guard, ok, readJson } from "@/lib/api";
import { purge, readPurgeLog, recordPurge, type PurgeTarget } from "@/lib/db";
import { isTeacher, requireTeacher } from "@/lib/teacher-guard";

/**
 * 데이터 일괄 삭제 (PRD 5.2).
 *
 * 보관·삭제 정책은 처음부터 넣는다. 나중에 붙이기 훨씬 어렵다.
 * 되돌릴 수 없으므로 확인 문구를 정확히 입력해야 실행된다.
 */

const TARGETS: Record<PurgeTarget, { label: string; confirm: string; note: string }> = {
  moodReasons: {
    label: "감정 — 이유 한 줄",
    confirm: "이유삭제",
    note: "아이콘·색은 남기고 자유서술만 지웁니다. 월 단위로 실행하기를 권합니다.",
  },
  moodEntries: {
    label: "감정 기록 전체",
    confirm: "감정삭제",
    note: "학기 종료 시 실행합니다.",
  },
  reflections: {
    label: "성찰 글 전체",
    confirm: "성찰삭제",
    note: "필요한 기록은 먼저 CSV로 내보내세요.",
  },
  attendance: {
    label: "접속 로그 전체",
    confirm: "출석삭제",
    note: "학기 종료 시 실행합니다.",
  },
  artifacts: {
    label: "작품 전체 (그림·활동지·퀴즈 답·피드백)",
    confirm: "작품삭제",
    note: "학기 종료 시 실행합니다. 그림은 CSV로 내보낼 수 없으니 필요하면 먼저 화면으로 남기세요.",
  },
  students: {
    label: "명렬표(이름) 전체",
    confirm: "명렬표삭제",
    note: "학기 종료 시 실행합니다. 이름이 저장된 유일한 곳입니다.",
  },
};

export async function POST(request: Request) {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const body = await readJson<{ target?: PurgeTarget; confirm?: string }>(request);
    const target = body?.target;
    if (!target || !(target in TARGETS)) {
      return fail("invalid_input", "삭제 대상이 올바르지 않습니다.");
    }

    const spec = TARGETS[target];
    if (body?.confirm?.trim() !== spec.confirm) {
      return fail("invalid_input", `확인을 위해 "${spec.confirm}" 를 정확히 입력해 주세요.`);
    }

    const affected = await purge(target);
    await recordPurge(target, affected);

    return ok({ affected, target, label: spec.label });
  });
}

/** 삭제 대상 목록·확인 문구와 마지막 삭제 일자를 함께 내려준다. */
export async function GET() {
  return guard(async () => {
    const me = await requireTeacher();
    if (!isTeacher(me)) return me;

    const log = await readPurgeLog();

    return ok({
      targets: Object.entries(TARGETS).map(([key, value]) => ({
        key,
        ...value,
        lastPurge: log[key as PurgeTarget] ?? null,
      })),
    });
  });
}
