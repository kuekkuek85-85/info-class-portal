import { fail, guard, ok } from "@/lib/api";
import { toEmbedUrl } from "@/lib/embed";
import {
  getMoodEntry,
  getQuizAnswer,
  getReflection,
  getSession,
  isSessionClosed,
  listReflections,
  studentNameMap,
} from "@/lib/db";
import { publicQuestions, quizView } from "@/lib/quiz";
import { readStudentSession } from "@/lib/session";
import { answersOf, hasAnswer, quizAnswersOf, type PhaseContent } from "@/lib/types";

/**
 * 오늘 그 교시 수업 화면에 필요한 것 전부를 한 번에 내려준다.
 *
 * 30분 수업에서 요청을 나누면 그만큼 로딩이 늘어난다. 28명 동시 접속을 감안해 왕복을 줄인다.
 * 단계 전환만 따로 /api/student/phase 로 가볍게 확인한다.
 *
 * 내용은 세션에 복사된 스냅샷을 쓴다 — 교사가 다음 반을 위해 차시 계획을 고쳐도 이미 진행 중인
 * 수업의 내용은 바뀌지 않는다 (PRD 5.1).
 */

function present(content: PhaseContent | undefined) {
  /*
   * 새 창으로 여는 링크는 주소를 그대로 보낸다.
   *
   * toEmbedUrl 은 유튜브 주소를 iframe 용으로 바꾸는 함수다. 새 창으로 열 주소까지
   * 바꾸면 학생이 임베드 전용 페이지로 끌려간다.
   */
  const newTab = content?.openInNewTab === true;

  return {
    heading: content?.heading ?? "",
    body: content?.body ?? "",
    url: content?.url ? (newTab ? content.url : toEmbedUrl(content.url)) : "",
    cards: content?.cards ?? [],
    tabs: content?.tabs ?? [],
    openInNewTab: newTab,
  };
}

export async function GET() {
  return guard(async () => {
    const me = await readStudentSession();
    if (!me) return fail("session_expired");

    const session = await getSession(me.sessionId);
    if (!session) return fail("session_expired");

    const questions = session.reflectionQuestions ?? [];

    const [mood, reflection, quizAnswer] = await Promise.all([
      getMoodEntry(session.id, me.studentId),
      getReflection(session.id, me.studentId),
      getQuizAnswer(session.id, me.studentId),
    ]);

    // 다른 학생 글 공개는 차시별 교사 설정. 기본값은 비공개 (PRD 3.4)
    let peers: { name: string; answers: string[] }[] = [];
    if (session.reflectionPublic) {
      const rows = (await listReflections(session.id)).filter(
        // 제출한 글만 보여준다. draft 는 아직 쓰는 중인 자동 임시저장본이라,
        // 고치다 만 문장이 실명과 함께 반 전체에 뜨면 안 된다.
        (row) => !row.draft && hasAnswer(row) && row.studentId !== me.studentId,
      );
      const names = await studentNameMap(rows.map((row) => row.studentId));
      peers = rows.map((row) => ({
        name: names.get(row.studentId)?.name || "친구",
        answers: answersOf(row),
      }));
    }

    return ok({
      me: { studentId: me.studentId, name: me.name, classNo: me.classNo },
      session: {
        id: session.id,
        phase: session.phase,
        closed: isSessionClosed(session),
        lessonNo: session.lessonNo,
        title: session.title,
        /*
          분반으로 여는 수업이면 그 이름 ("화요일 1기").
          학생 화면 머리글이 "1학년 1반" 이라고 찍고 있었는데, 이 수업에는 1반이라는 것이
          없다 — 22명이 5~8반에서 모여 앉는다. 반 번호는 데이터 통 번호일 뿐이다.
        */
        groupLabel: session.groupLabel ?? "",
        moodCheckEnabled: session.moodCheckEnabled,
        game: present(session.game),
        gameExplainer: present(session.gameExplainer),
        progress: present(session.progress),
        assessment: present(session.assessment),
        // 영상 주소는 학생에게 내려보내지 않는다. 전자칠판으로 같이 보는 구조라
        // 태블릿에 주소가 있으면 각자 다른 지점을 보거나 유튜브로 빠져나간다 (PRD 3.2).
        video: { heading: session.video?.heading ?? "", body: session.video?.body ?? "", url: "" },
        // 영상 볼 때 띄울 "생각할 것". 비어 있으면 화면이 성찰 질문으로 물러난다
        videoPrompts: session.videoPrompts ?? [],
        reflectionQuestions: questions,
        reflectionPublic: session.reflectionPublic,
        freeNavigation: session.freeNavigation ?? false,
        phaseLabels: session.phaseLabels ?? {},
        // 문항과 선지만. 정답·해설은 교사가 공개한 뒤 /api/student/phase 로 따로 내려간다.
        quizQuestions: publicQuestions(session),
        // 활동지·장소 선택지. 그림 자체는 /api/student/artifact 로 따로 받는다.
        activity: session.activity
          ? {
              activityId: session.activity.activityId,
              places: session.activity.places ?? [],
              year: session.activity.year ?? 2040,
              /*
                분반별 주소 표는 학생에게 내려보내지 않는다.

                수업을 만들 때 이미 그 분반 것만 남기고 지우지만(db.ts 의 snapshotOf),
                그 전에 만들어진 수업 문서에는 표가 그대로 남아 있다. 활동지는 여기서
                통째로 내려가므로, 한 줄이 빠지면 화요일 1기 학생의 브라우저에
                목요일 2기 캔바 초대 토큰이 실려 간다.
              */
              worksheet: (session.activity.worksheet ?? []).map((q) => {
                if (!q.linkUrlByGroup) return q;
                const rest = { ...q };
                delete rest.linkUrlByGroup;
                return rest;
              }),
              /*
                여기 빠뜨리면 그림판에 "기술 예시" 단추가 조용히 안 생긴다.
                이 자리에서 필드를 하나씩 골라 내보내고 있어서, 활동에 값을 넣어도
                학생 화면까지 오지 않는다 — 4차시 openInNewTab 이 그렇게 사라졌었다.
              */
              techExamples: session.activity.techExamples ?? [],
              // 그리기 첫 화면 문구. 안 보내면 학생이 "어디를 그릴까요?" 만 보고
              // 3차시처럼 아무 미래 도시를 그린다 (types.ts 의 drawPrompt)
              drawPrompt: session.activity.drawPrompt ?? null,
              // 활동지 첫 화면 문구. 안 보내면 "무엇을 그렸는지 적어 주세요" 가 그대로
              // 뜨고, 그림 설명이 아닌 활동지(6차시 기사 쓰기)에서 거짓말이 된다
              worksheetIntro: session.activity.worksheetIntro ?? null,
              sourceHints: session.activity.sourceHints ?? null,
              /*
                출처 두 칸을 아예 안 띄우는 차시가 있다.

                바로 위 galleryEnabled 와 같은 함정이다 — 이 줄을 빠뜨리면 화면 쪽에서
                undefined 가 되어 "안 적혔으니 띄운다" 로 읽힌다. 계획에 false 를
                적어 두어도 학생 화면에는 그대로 뜬다.
              */
              sourcesEnabled: session.activity.sourcesEnabled ?? true,
              /*
                감정을 쓰는 차시는 서로 구경하기를 막는다. 이 줄을 빠뜨리면 화면 쪽에서
                값이 undefined 가 되어 "안 적혔으니 연다" 로 읽히고, 마음 이야기가
                반 전체에 걸린다 — 빠뜨렸을 때 조용히 열리는 쪽이라 특히 위험하다.
              */
              galleryEnabled: session.activity.galleryEnabled ?? true,
              galleryNoun: session.activity.galleryNoun ?? "",
            }
          : null,
        date: session.date,
        period: session.period,
        classNo: session.classNo,
      },
      quiz: quizView(session),
      myQuizAnswers: quizAnswersOf(quizAnswer),
      mood: mood ? { mood: mood.mood, reason: mood.reason } : null,
      reflection: reflection
        ? { answers: answersOf(reflection), draft: reflection.draft }
        : null,
      peers,
    });
  });
}
