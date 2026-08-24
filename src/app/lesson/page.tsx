"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ContentView, type Content } from "@/components/content-view";
import { DrawBoard } from "@/components/draw-board";
import { GalleryView } from "@/components/gallery-view";
import { MoodPicker } from "@/components/mood-picker";
import { QuizView, type QuizState } from "@/components/quiz-view";
import { ReviewView } from "@/components/review-view";
import { SiteFooter } from "@/components/site-footer";
import { useFocusTracker } from "@/hooks/use-focus-tracker";
import { WorksheetView, type WorksheetValue } from "@/components/worksheet-view";
import {
  LESSON_PHASES,
  PHASE_LABELS,
  type LessonPhase,
  type Stroke,
  type TextItem,
  type WorksheetQuestion,
} from "@/lib/types";

/**
 * 오늘 수업 화면.
 *
 * 학생은 화면을 스스로 옮기지 못한다. 지금 어느 단계인지는 교사가 정하고, 학생 화면은
 * 그것을 따라간다. 30명이 제각각 다른 화면에 가 있으면 수업을 끌고 갈 수 없고,
 * 중1은 화면당 할 일이 하나여야 한다 (PRD 1, 3.2).
 */

export interface ActivityInfo {
  activityId: string;
  places: string[];
  year: number;
  worksheet: WorksheetQuestion[];
  /** 그림판에서 열어 보는 첨단 기술 낱말. 비면 단추가 안 생긴다 */
  techExamples?: string[];
  /** 출처 두 칸의 예시. 비면 활동지가 기본값(그림 활동 기준)을 쓴다 */
  sourceHints?: { site: string; ai: string } | null;
}

interface LessonData {
  me: { studentId: string; name: string; classNo: number };
  session: {
    id: string;
    phase: LessonPhase;
    closed: boolean;
    lessonNo: number;
    title: string;
    moodCheckEnabled: boolean;
    game: Content;
    gameExplainer: Content;
    progress: Content;
    assessment: Content;
    video: Content;
    reflectionQuestions: string[];
    reflectionPublic: boolean;
    /** 학생이 지나온 단계로 되돌아갈 수 있는가 */
    freeNavigation?: boolean;
    /** 이 차시에서만 쓰는 단계 이름 (되돌아가기 줄에 쓴다) */
    phaseLabels?: Partial<Record<LessonPhase, string>>;
    /** 문항과 선지만. 정답은 교사가 공개할 때 따로 내려온다 */
    quizQuestions: { prompt: string; choices: string[] }[];
    activity: ActivityInfo | null;
    date: string;
    period: number;
    classNo: number;
  };
  quiz: QuizState | null;
  myQuizAnswers: number[];
  mood: { mood: string; reason: string } | null;
  reflection: { answers: string[]; draft: boolean } | null;
  peers: { name: string; answers: string[] }[];
}

/** 입력이 멈춘 뒤 이만큼 지나면 임시저장한다. 종이 울려도 쓰던 내용이 남아야 한다. */
const AUTOSAVE_DELAY_MS = 1500;
/** 교사가 단계를 넘긴 것을 학생 화면이 알아채는 주기 */
const PHASE_POLL_MS = 4000;

export default function LessonPage() {
  const router = useRouter();
  const [data, setData] = useState<LessonData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState<LessonPhase>("waiting");
  const [closed, setClosed] = useState(false);
  const [showExplainer, setShowExplainer] = useState(false);
  const previousPhase = useRef<LessonPhase>("waiting");
  const explainerShown = useRef(false);

  const [mood, setMood] = useState("");
  const [moodReason, setMoodReason] = useState("");
  const [moodSaving, setMoodSaving] = useState(false);
  const [moodSaved, setMoodSaved] = useState(false);

  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSaving, setQuizSaving] = useState(false);

  /**
   * 그림·활동지. 그리기 단계에 들어갈 때 한 번만 받아 온다.
   *
   * 수업 화면을 열 때 같이 받지 않는 이유: 그림은 획이 수천 개라 응답이 커진다.
   * 퀴즈만 하는 차시에서까지 그걸 내려받을 이유가 없다.
   */
  const [artifact, setArtifact] = useState<{
    place: string;
    year: number;
    strokes: Stroke[];
    texts: TextItem[];
    status: string;
    /** 서버가 마지막으로 받아들인 저장 순번 */
    saveRev: number;
  } | null>(null);
  const [worksheet, setWorksheet] = useState<WorksheetValue>({
    answers: {},
    traits: [],
    sources: { site: "", ai: "" },
  });
  const [submitError, setSubmitError] = useState("");
  /** 지난 차시에 쓴 답. 활동지 위에 읽기 전용으로 뜬다 (5차시가 4차시 답에서 출발한다) */
  const [carried, setCarried] = useState<{
    heading: string;
    rows: { label: string; value: string }[];
  } | null>(null);
  const artifactLoaded = useRef(false);

  /**
   * 그리기 · 활동지 · 작품 감상 중 학생이 지금 보고 있는 쪽.
   *
   * 이 셋은 학생마다 진도가 다르다. 그림을 오래 그리는 학생이 있고, 글을 쓰다가
   * "아 그걸 안 그렸네" 하고 돌아가는 학생이 있고, 일찍 끝내고 남의 작품을 볼 학생이 있다.
   * 교사가 한꺼번에 넘기면 그중 한쪽은 반드시 끊긴다.
   *
   * 교사가 단계를 바꾸면 그쪽으로 옮겨 가고(수업 신호), 그 뒤로는 학생이 직접 오간다.
   */
  const [workTab, setWorkTab] = useState<"draw" | "worksheet" | "gallery">("draw");

  const [answers, setAnswers] = useState<string[]>([]);
  const [reflectionState, setReflectionState] = useState<"idle" | "saving" | "saved" | "done">(
    "idle",
  );
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef("");
  const submitted = useRef(false);
  /** 성찰 공개 여부가 바뀌었는지 보려고 직전 값을 들고 있는다 */
  const wasPublic = useRef<boolean | null>(null);

  /** 교사가 "되돌아가기"를 켜 두었는가 */
  const [freeNav, setFreeNav] = useState(false);
  /**
   * 학생이 지금 보고 있는 단계.
   *
   * 기본은 교사가 정한 단계와 같다. 되돌아가기가 켜져 있을 때만 지나온 단계로 옮길 수
   * 있고, 그 뒤에도 교사가 단계를 넘기면 **따라가던 학생만** 함께 넘어간다.
   * 되돌아가서 보완하는 중인 학생을 끌고 가면 하던 일이 끊긴다.
   */
  const [viewPhase, setViewPhase] = useState<LessonPhase>("waiting");

  /*
   * 화면을 벗어난 시간을 잰다. 수업이 끝난 뒤에는 세지 않는다.
   *
   * 배너를 띄우는 것이 이 기능 효과의 대부분이다 — "기록되고 있다"를 학생이 체감하는
   * 순간 이탈 자체가 준다. 그래서 문구를 비난조로 쓰지 않는다. 감시가 아니라 피드백이다.
   */
  /** 이 차시에서만 이탈을 세지 않을 단계 (4차시 AI 관상 체험처럼 새 창으로 나가는 활동) */
  const [focusExempt, setFocusExempt] = useState<LessonPhase[]>([]);
  const awayNotice = useFocusTracker(phase, !closed, focusExempt);
  /** 이미 닫은 배너의 일련번호. 렌더 중에 계산하고, 효과는 시간이 지나면 닫기만 한다 */
  const [awayDismissed, setAwayDismissed] = useState(0);
  const awayShown =
    awayNotice && awayNotice.seq > awayDismissed ? awayNotice.ms : null;

  useEffect(() => {
    if (!awayNotice || awayNotice.seq <= awayDismissed) return;
    const timer = setTimeout(() => setAwayDismissed(awayNotice.seq), 6000);
    return () => clearTimeout(timer);
  }, [awayNotice, awayDismissed]);

  /**
   * 친구들 성찰만 다시 받아 온다.
   *
   * 수업 내용을 통째로 다시 불러오면(load) 지금 쓰고 있는 답까지 서버 값으로 덮인다.
   * 여기서는 공개 여부와 친구 글만 갈아 끼운다.
   */
  const refreshPeers = useCallback(async () => {
    const response = await fetch("/api/student/lesson");
    const result = await response.json();
    if (!result.ok) return;

    setData((prev) =>
      prev
        ? {
            ...prev,
            peers: result.peers ?? [],
            session: { ...prev.session, reflectionPublic: result.session.reflectionPublic },
          }
        : prev,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const response = await fetch("/api/student/lesson");
      const result = await response.json();
      if (cancelled) return;

      if (!result.ok) {
        // 세션 만료 — 코드부터 다시 받는다
        router.replace("/");
        setLoadError(result.message ?? "");
        return;
      }

      const payload = result as LessonData;
      setData(payload);
      setPhase(payload.session.phase);
      setViewPhase(payload.session.phase);
      setFreeNav(Boolean(payload.session.freeNavigation));
      if (payload.session.phase === "worksheet") setWorkTab("worksheet");
      if (payload.session.phase === "gallery") setWorkTab("gallery");
      previousPhase.current = payload.session.phase;
      setClosed(payload.session.closed);
      setMood(payload.mood?.mood ?? "");
      setMoodReason(payload.mood?.reason ?? "");
      setMoodSaved(Boolean(payload.mood));
      setQuiz(payload.quiz);
      setQuizAnswers(payload.myQuizAnswers ?? []);

      const count = payload.session.reflectionQuestions.length;
      const initial = Array.from({ length: count }, (_, i) => payload.reflection?.answers[i] ?? "");
      setAnswers(initial);
      lastSaved.current = JSON.stringify(initial);
      if (payload.reflection && !payload.reflection.draft) {
        submitted.current = true;
        setReflectionState("done");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 교사가 넘긴 단계를 따라간다
  useEffect(() => {
    if (!data) return;
    let cancelled = false;

    async function tick() {
      const response = await fetch("/api/student/phase");
      const result = await response.json();
      if (cancelled || !result.ok) return;

      const next = result.phase as LessonPhase;
      // 대기(게임)에서 수업으로 넘어가는 순간 한 번만 원리 설명을 띄운다.
      // 게임으로만 끝나면 남는 게 없다.
      if (previousPhase.current === "waiting" && next !== "waiting" && !explainerShown.current) {
        explainerShown.current = true;
        setShowExplainer(true);
      }
      /*
       * 교사가 그리기·활동지·작품 감상 사이를 옮기면 학생 화면도 그쪽을 편다.
       * 그 뒤로는 학생이 알아서 오간다 — 신호는 주되 붙잡아 두지는 않는다.
       */
      if (
        next !== previousPhase.current &&
        (next === "draw" || next === "worksheet" || next === "gallery")
      ) {
        setWorkTab(next);
      }
      /*
       * 따라가던 학생만 함께 넘어간다.
       *
       * 되돌아가서 보완하는 중인 학생을 끌고 가면 하던 일이 그 자리에서 끊긴다.
       * 대신 화면에 "선생님은 지금 ○○" 를 띄워 두어 언제든 따라붙을 수 있게 한다.
       */
      setViewPhase((current) => (current === previousPhase.current ? next : current));
      previousPhase.current = next;

      // 되돌아가기가 꺼지면 모두 교사 단계로 모인다
      const free = Boolean(result.freeNavigation);
      if (!free) setViewPhase(next);
      setFreeNav(free);
      setFocusExempt((result.focusExempt as LessonPhase[] | undefined) ?? []);

      setPhase(next);
      setClosed(Boolean(result.closed));
      // 문항 이동·정답 공개도 같은 응답에 실려 온다 (퀴즈 전용 폴링을 만들지 않는다)
      setQuiz((result.quiz as QuizState | null) ?? null);

      /*
       * 교사가 "성찰 서로 공개"를 켜는 순간 친구들 글을 받아 온다.
       *
       * 예전에는 이 값이 첫 화면을 열 때 한 번만 내려와서, 교사가 공개를 눌러도 학생이
       * 새로고침하기 전에는 아무 일도 일어나지 않았다. 30분 수업에서 28명에게
       * "새로고침하세요"를 시키는 것은 사실상 그 활동을 접는 것과 같다.
       *
       * 친구 글 자체를 4초마다 받지는 않는다 — 그러면 성찰 문서를 분당 만 건씩 읽는다.
       * 켜지고 꺼지는 순간에만 한 번 받아 온다.
       */
      const nowPublic = Boolean(result.reflectionPublic);
      if (wasPublic.current !== null && wasPublic.current !== nowPublic) {
        void refreshPeers();
      }
      wasPublic.current = nowPublic;
    }

    const timer = setInterval(() => void tick(), PHASE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [data, refreshPeers]);

  const saveReflection = useCallback(async (next: string[], submit: boolean) => {
    // 예약된 자동저장을 먼저 취소한다. 제출 직후 늦게 도착한 임시저장이
    // 제출 완료 상태를 초안으로 되돌리는 것을 막는다.
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    if (submit) submitted.current = true;

    setReflectionState("saving");
    const response = await fetch("/api/student/reflection", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: next, draft: !submitted.current }),
    });
    const result = await response.json();

    if (result.ok) {
      lastSaved.current = JSON.stringify(next);
      setReflectionState(result.draft ? "saved" : "done");
    } else {
      setReflectionState("idle");
    }
  }, []);

  // 입력 중 자동 임시저장 (PRD 3.4)
  useEffect(() => {
    if (!data || closed) return;
    if (JSON.stringify(answers) === lastSaved.current) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void saveReflection(answers, false);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [answers, closed, data, saveReflection]);

  /*
   * 그림·활동지를 처음 필요할 때 받아 온다 (한 번만).
   *
   * **교사 단계가 아니라 학생이 보고 있는 단계로 판단한다.** 예전에는 교사가 그리기나
   * 활동지 단계를 켜 두었을 때만 받았는데, 감상 단계에서는 그림·활동지 탭이 그대로
   * 보인다(isWorkPhase 에 gallery 가 들어 있다). 그래서 감상 중에 자기 활동지로
   * 돌아간 학생에게 "활동지를 준비하고 있어요" 가 영원히 떠 있었다 —
   * 받아 오는 요청이 아예 나가지 않으니 기다려도 바뀌지 않는다.
   *
   * 되돌아가기를 켜 두면 성찰 단계에서도 활동지로 갈 수 있으므로, 단계 이름을 하나씩
   * 나열하는 대신 "그리기 이후" 로 잡는다. 그 앞 단계(퀴즈·영상)에서는 여전히 안 받는다.
   */
  useEffect(() => {
    if (!data?.session.activity) return;
    /*
     * 기준점이 "그리기" 가 아니라 "문제 정의" 다. 선택과목 단계(problem·mvp·build·grill)가
     * 그리기보다 앞에 있어서, 그리기를 기준으로 두면 그 단계들에서 활동지를 안 받아 온다.
     */
    const reached = (item: LessonPhase) =>
      LESSON_PHASES.indexOf(item) >= LESSON_PHASES.indexOf("problem");
    if (!reached(phase) && !reached(viewPhase)) return;
    if (artifactLoaded.current) return;
    artifactLoaded.current = true;

    let cancelled = false;
    async function loadArtifact() {
      const response = await fetch("/api/student/artifact");
      const result = await response.json();
      if (cancelled || !result.ok) return;

      setArtifact({
        place: result.artifact.place,
        year: result.artifact.year,
        strokes: result.artifact.strokes,
        texts: result.artifact.texts,
        status: result.artifact.status,
        saveRev: result.artifact.saveRev ?? 0,
      });
      setWorksheet({
        answers: result.artifact.answers ?? {},
        traits: result.artifact.traits ?? [],
        sources: result.artifact.sources ?? { site: "", ai: "" },
      });
      setCarried(result.carried ?? null);
    }

    void loadArtifact();
    return () => {
      cancelled = true;
    };
  }, [data, phase, viewPhase]);

  async function choosePlace(place: string) {
    setArtifact((prev) => (prev ? { ...prev, place } : prev));
    await fetch("/api/student/artifact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place }),
    });
  }

  async function submitArtifact() {
    setSubmitError("");
    const response = await fetch("/api/student/artifact/submit", { method: "POST" });
    const result = await response.json();

    if (!result.ok) {
      setSubmitError(result.message ?? "제출하지 못했어요.");
      return;
    }
    setArtifact((prev) => (prev ? { ...prev, status: "submitted" } : prev));
  }

  async function pickQuizChoice(choiceIndex: number) {
    if (!quiz) return;
    const questionIndex = quiz.index;
    // 이미 고른 문항이면 아무 일도 하지 않는다 (서버에서도 다시 막는다)
    if ((quizAnswers[questionIndex] ?? -1) >= 0) return;

    // 화면을 먼저 잠근다. 응답을 기다리는 1초 사이에 다른 선지를 누르는 일이 잦다.
    setQuizAnswers((prev) => {
      const next = [...prev];
      while (next.length <= questionIndex) next.push(-1);
      next[questionIndex] = choiceIndex;
      return next;
    });
    setQuizSaving(true);

    const response = await fetch("/api/student/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex, choiceIndex }),
    });
    const result = await response.json();
    setQuizSaving(false);

    // 저장이 실패했으면 잠금을 풀어 다시 고를 수 있게 한다
    if (!result.ok) {
      setQuizAnswers((prev) => {
        const next = [...prev];
        next[questionIndex] = -1;
        return next;
      });
    }
  }

  async function submitMood() {
    setMoodSaving(true);
    const response = await fetch("/api/student/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, reason: moodReason }),
    });
    const result = await response.json();
    setMoodSaving(false);
    if (result.ok) setMoodSaved(true);
  }

  if (loadError) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">
        {loadError}
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
        불러오는 중…
      </main>
    );
  }

  const { session, me } = data;

  /*
   * 학생이 스스로 오갈 수 있는 구간.
   *
   * 교사가 셋 중 어느 단계를 켜 두었든 학생은 그림 · 활동지 · 작품 감상을 오간다.
   * 빨리 끝낸 학생을 붙잡아 두면 떠들고, 아직 그리는 학생을 갤러리로 끌고 가면 못 끝낸다.
   */
  const isWorkPhase =
    viewPhase === "draw" || viewPhase === "worksheet" || viewPhase === "gallery";

  /** 이 차시에 그리기가 있는가. 장소가 하나도 없으면 글만 쓰는 활동이다 */
  const canDraw = (session.activity?.places.length ?? 0) > 0;

  /*
   * 실제로 보여 줄 탭.
   *
   * 그리기가 없는 차시에서는 그리기 탭에 머무를 수 없다. 교사가 "그리기" 단계를 눌러도
   * 마찬가지다 — 4차시처럼 글만 쓰는 활동에서 그리기로 보내면 고를 장소가 없는 빈
   * 화면이 뜬다. 렌더할 때 걸러 내는 편이 상태를 고쳐 쓰는 것보다 단순하다.
   */
  const activeTab = !canDraw && workTab === "draw" ? "worksheet" : workTab;

  /*
   * 그림이 없는 차시에서는 "작품" 대신 "활동지"라고 부른다.
   * 글만 쓰는 활동인데 "작품 감상"이라고 하면 학생이 그림을 찾는다.
   */
  const workNoun = canDraw ? "작품" : "활동지";

  /**
   * 단계 하나에서 보여줄 활동지 문항.
   *
   * 선택과목은 한 시간에 문제 정의 · MVP · 만들기 · AI 검토를 차례로 지난다. 문항에
   * 적힌 단계가 지금 보고 있는 단계와 같은 것만 남긴다 — 활동지 하나에 다 넣으면
   * 학생이 첫 칸에서 붙잡혀 끝까지 못 간다.
   *
   * 단계를 안 적은 문항은 지금까지처럼 활동지 단계에 나온다.
   */
  const questionsFor = (item: LessonPhase) =>
    (session.activity?.worksheet ?? []).filter(
      (q) => (q.phase ?? "worksheet") === item,
    );
  /** 선택과목이 쓰는 단계. 활동지 화면을 그 단계 문항만으로 다시 쓴다 */
  const STEP_PHASES: LessonPhase[] = ["problem", "mvp", "build", "grill"];
  const stepQuestions = STEP_PHASES.includes(viewPhase) ? questionsFor(viewPhase) : [];

  /**
   * 되돌아갈 수 있는 단계 목록 — 교사가 있는 곳까지, 그리고 이 차시에 실제로 쓰는 것만.
   *
   * 대기·마침은 뺀다. 되돌아가서 할 일이 없는 화면이고, 대기로 가면 게임이 떠서
   * 수업 중에 그리로 도망갈 구멍이 된다.
   */
  const backPhases: LessonPhase[] = LESSON_PHASES.slice(
    0,
    LESSON_PHASES.indexOf(phase) + 1,
  ).filter((item) => {
    if (item === "waiting" || item === "done") return false;
    if (item === "mood") return session.moodCheckEnabled;
    if (item === "quiz") return session.quizQuestions.length > 0;
    /*
     * 그리기·활동지·감상은 한 묶음이라 안에서 이미 오갈 수 있다. 목록에는 하나만 둔다.
     * 대표는 보통 "그리기"인데, 그리기가 없는 차시에서는 "활동지"가 그 자리를 맡는다.
     */
    if (item === "gallery") return false;
    // 선택과목 단계 — 그 단계에 쓸 문항이 있을 때만 버튼에 남는다
    if (STEP_PHASES.includes(item)) return questionsFor(item).length > 0;
    if (item === "worksheet") {
      return (
        (session.activity?.places.length ?? 0) === 0 &&
        questionsFor("worksheet").length > 0
      );
    }
    // 활동이 있어도 그리기가 없는 차시가 있다 (4차시 직업 조사) — 장소로 판단한다
    if (item === "draw") return (session.activity?.places.length ?? 0) > 0;
    if (item === "reflection") return session.reflectionQuestions.length > 0;

    const content =
      item === "progress"
        ? session.progress
        : item === "assessment"
          ? session.assessment
          : session.video;
    return Boolean(
      content &&
        (content.heading?.trim() ||
          content.body?.trim() ||
          content.url?.trim() ||
          content.cards?.length ||
          content.tabs?.length),
    );
  });
  const answered = answers.filter((a) => a.trim()).length;
  const total = session.reflectionQuestions.length;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/*
        돌아온 순간 한 번 띄운다.

        본문 안에 끼워 넣지 않고 화면 위에 띄우는 이유가 둘이다.
         ① 본문에 넣으면 뜰 때 캔버스가 밀리고 사라질 때 다시 올라온다 — 그리는 도중에
            화면이 두 번 움직인다
         ② 활동지·감상에서 아래로 스크롤한 채 돌아오면 위쪽 배너는 화면 밖이라 안 보인다.
            "기록되고 있다"를 체감시키는 것이 이 기능 효과의 대부분인데 그게 사라진다

        pointer-events-none 을 반드시 둔다. 그리는 중에 떠서 획을 가로채면 안 된다.
        문구는 비난조로 쓰지 않는다 — 감시가 아니라 피드백이다.
      */}
      {awayShown !== null && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 top-4 z-40 flex justify-center px-4"
        >
          <p className="animate-[fadeIn_150ms_ease-out] rounded-full border-2 border-ink bg-canvas px-5 py-3 text-center t-body shadow-lg">
            🕐 {formatAway(awayShown)} 동안 자리를 비웠어요
          </p>
        </div>
      )}

      <header className="sticky top-0 z-10 border-b border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="t-body-sm truncate font-bold">
              {session.lessonNo}차시 · {session.title}
            </p>
            <p className="t-caption mt-0.5">
              1학년 {me.classNo}반 {me.name || "(임시 번호)"} · {PHASE_LABELS[phase]}
            </p>
          </div>
          <Link href="/lesson/history" className="pill pill-secondary t-body-sm shrink-0">
            내 기록
          </Link>
        </div>
      </header>

      {/*
        읽는 화면은 폭을 좁게 묶는다 — 글줄이 길면 중1이 눈으로 따라가지 못한다.

        그림을 보는 화면은 예외다. 그리기는 캔버스가 화면 한구석의 작은 상자가 되고,
        작품 감상은 왼쪽 필터를 빼고 나면 격자에 530px밖에 남지 않아 썸네일이
        엄지손톱만 해진다. 둘 다 폭이 곧 쓸모인 화면이다.
      */}
      <main
        className={`mx-auto w-full flex-1 px-4 py-5 ${
          viewPhase === "draw" || viewPhase === "worksheet" || viewPhase === "gallery"
            ? "max-w-[1600px]"
            : "max-w-3xl"
        }`}
      >
        {/*
          되돌아가기 — 교사가 켰을 때만 나온다.

          **지나온 단계만** 나열한다. 아직 안 한 퀴즈를 미리 열어 보거나 남의 작품을
          먼저 들여다보면 수업을 끌고 갈 수가 없다.

          지금 교사가 있는 단계를 늘 오른쪽 끝에 두고, 학생이 뒤로 가 있으면 그 칸이
          "선생님은 여기"로 보인다 — 언제든 한 번에 따라붙을 수 있어야 한다.
        */}
        {freeNav && backPhases.length > 1 && (
          <nav className="mb-5 flex flex-wrap items-center gap-2">
            <span className="t-caption">되돌아가기</span>
            {backPhases.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setViewPhase(item)}
                className={`pill t-body-sm ${
                  viewPhase === item ? "pill-primary" : "pill-secondary"
                }`}
              >
                {/* 차시가 단계 이름을 바꿔 쓰는 경우가 있다 (4차시 진도 안내 → AI 관상 체험) */}
                {session.phaseLabels?.[item] ?? PHASE_LABELS[item]}
                {item === phase && viewPhase !== item && " ← 선생님"}
              </button>
            ))}
          </nav>
        )}

        {closed && (
          <p className="mb-5 rounded-md bg-surface px-4 py-3 text-center t-body-sm">
            이 수업은 끝났어요. 내가 쓴 것은 볼 수 있지만 더 저장되지는 않아요.
          </p>
        )}

        {viewPhase === "waiting" &&
          (session.game.url ? (
            /*
              먼저 온 학생이 5분을 기다리기도 한다 (태블릿 부팅, 주소 오타).
              그 시간에 게임을 띄운다. 수업이 시작되면 화면이 저절로 넘어가므로
              학생이 게임을 끄고 나올 필요가 없다.
            */
            <section className="flex flex-col gap-4">
              <div className="block bg-lime">
                <h2 className="t-headline">{session.game.heading || "기다리는 동안"}</h2>
                {session.game.body && (
                  <p className="t-body mt-2 whitespace-pre-wrap">{session.game.body}</p>
                )}
                <p className="t-body-sm mt-3">
                  선생님이 수업을 시작하면 이 화면은 저절로 넘어가요.
                </p>
              </div>

              <div className="overflow-hidden rounded-lg border border-line">
                <iframe
                  src={session.game.url}
                  title={session.game.heading || "대기 중 게임"}
                  className="h-[70vh] w-full"
                  allow="fullscreen"
                />
              </div>
            </section>
          ) : (
            <Placeholder
              title="잠시만 기다려 주세요"
              description="선생님이 시작하면 화면이 저절로 바뀝니다."
            />
          ))}

        {viewPhase === "done" && (
          <Placeholder title="오늘 수업 끝!" description="고생했어요. 태블릿을 정리해 주세요." />
        )}

        {viewPhase === "mood" && session.moodCheckEnabled && (
          <>
            <MoodPicker
              value={mood}
              reason={moodReason}
              onChange={setMood}
              onReasonChange={setMoodReason}
              onSubmit={submitMood}
              saving={moodSaving}
              saved={moodSaved}
              disabled={closed}
            />
            {/*
              기분 체크를 마친 학생에게만 이어서 복습을 편다.

              단계를 따로 만들지 않은 이유: 기분 체크가 끝나는 시각은 학생마다 다르고,
              먼저 끝낸 학생은 2~3분을 그냥 앉아 있다. 교사가 버튼을 한 번 더 누르는
              방식이면 그 빈 시간이 그대로 남는다. 여기서는 끝낸 사람부터 알아서 넘어간다.
            */}
            {moodSaved && <ReviewView disabled={closed} />}
          </>
        )}

        {viewPhase === "quiz" && quiz && (
          <QuizView
            question={session.quizQuestions[quiz.index]}
            state={quiz}
            picked={quizAnswers[quiz.index] ?? -1}
            onPick={pickQuizChoice}
            saving={quizSaving}
            disabled={closed}
          />
        )}

        {viewPhase === "progress" && <ContentView content={session.progress} fallback="진도 안내" />}
        {viewPhase === "assessment" && (
          <ContentView content={session.assessment} fallback="평가 안내" />
        )}

        {/*
          영상은 교실 앞 전자칠판으로 다 같이 본다. 태블릿에는 영상을 띄우지 않고,
          시청 중에 생각할 질문만 크게 보여준다. 화면을 꽉 채워 다른 데로 눈이 가지 않게 한다.
        */}
        {viewPhase === "video" && (
          <section className="flex flex-col gap-6">
            <div className="block bg-navy text-center text-inverse-ink">
              <p className="t-display">📺 영상 시청 중</p>
              <p className="t-body-lg mt-3">앞 화면을 봐 주세요. 태블릿은 잠시 내려놓아도 됩니다.</p>
              {session.video.body && (
                <p className="t-body-sm mt-5 whitespace-pre-wrap text-left opacity-80">
                  {session.video.body}
                </p>
              )}
            </div>

            {session.reflectionQuestions.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="t-eyebrow text-center">영상을 보면서 생각할 것</h2>
                {session.reflectionQuestions.map((question, index) => (
                  <div key={index} className="block bg-lime t-subhead">
                    <span className="mr-2 font-bold">{index + 1}.</span>
                    {question}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/*
          그리기와 활동지는 학생이 스스로 오간다.
          다른 단계와 달리 여기서는 진도가 사람마다 다르다 — 그림을 오래 그리는 학생도
          있고, 글을 쓰다가 "아 그걸 안 그렸네" 하고 돌아가는 학생도 있다. 교사가 한꺼번에
          넘겨 버리면 둘 중 한쪽은 반드시 끊긴다.

          교사가 단계를 바꾸면 화면은 그쪽으로 따라가되(수업 신호), 그 뒤로는 학생이
          자유롭게 오갈 수 있다.
        */}
        {/*
          선택과목 단계 — 문제 정의 · MVP 기획 · 만들기 · AI 검토.
          같은 활동지 화면을 쓰되 그 단계 문항만 보여준다. 교사가 단계를 넘겨야 다음 칸이
          열리므로 시간을 끌고 갈 수 있다 (한 화면에 다 넣으면 첫 칸에서 붙잡힌다).
        */}
        {STEP_PHASES.includes(viewPhase) &&
          (session.activity && artifact && stepQuestions.length > 0 ? (
            <WorksheetView
              questions={stepQuestions}
              place={artifact.place}
              year={artifact.year}
              canDraw={false}
              sourceHints={session.activity.sourceHints ?? undefined}
              carried={carried}
              strokes={[]}
              texts={[]}
              value={worksheet}
              onChange={setWorksheet}
              onSubmit={submitArtifact}
              submitted={artifact.status === "submitted"}
              submitError={submitError}
              disabled={closed}
              /*
                제출 단추는 마지막 단계에서만 띄운다. 문제 정의를 쓰자마자 "다 했어요" 가
                보이면 거기서 끝내는 학생이 나온다.
              */
              hideSubmit={viewPhase !== "grill"}
              heading={session.phaseLabels?.[viewPhase] ?? PHASE_LABELS[viewPhase]}
            />
          ) : (
            <Placeholder title="준비하고 있어요" description="잠시만 기다려 주세요." />
          ))}

        {isWorkPhase && session.activity && (
          <div className="mb-5 flex gap-2">
            {/*
              그리기가 없는 차시도 있다 (4차시 직업 조사처럼 글만 쓰는 활동).
              장소 목록이 비어 있으면 그리기 탭 자체를 만들지 않는다 — 눌러 봐야
              고를 장소가 없는 빈 화면이 나온다.
            */}
            {canDraw && (
              <button
                type="button"
                onClick={() => setWorkTab("draw")}
                className={`pill flex-1 ${activeTab === "draw" ? "pill-primary" : "pill-secondary"}`}
              >
                그림 그리기
              </button>
            )}
            <button
              type="button"
              onClick={() => setWorkTab("worksheet")}
              disabled={session.activity.worksheet.length === 0}
              className={`pill flex-1 ${
                activeTab === "worksheet" ? "pill-primary" : "pill-secondary"
              }`}
            >
              활동지 쓰기
            </button>
            {/*
              먼저 끝낸 학생이 갈 곳. 그림은 그리는 순간 갤러리에 올라가므로
              (gallery.ts 의 isVisible) 아직 그리는 중인 반에서도 볼 것이 있다.
            */}
            <button
              type="button"
              onClick={() => setWorkTab("gallery")}
              className={`pill flex-1 ${activeTab === "gallery" ? "pill-primary" : "pill-secondary"}`}
            >
              {workNoun} 감상
            </button>
          </div>
        )}

        {isWorkPhase &&
          activeTab === "draw" &&
          (session.activity && artifact ? (
            <DrawBoard
              key={session.activity.activityId}
              initialStrokes={artifact.strokes}
              initialTexts={artifact.texts}
              initialRev={artifact.saveRev}
              places={session.activity.places}
              place={artifact.place}
              year={artifact.year}
              techExamples={session.activity.techExamples}
              onPlaceChange={choosePlace}
              onExit={(strokes, texts, saveRev) =>
                setArtifact((prev) => (prev ? { ...prev, strokes, texts, saveRev } : prev))
              }
              disabled={closed}
            />
          ) : (
            <Placeholder title="그림을 준비하고 있어요" description="잠시만 기다려 주세요." />
          ))}

        {isWorkPhase &&
          activeTab === "worksheet" &&
          (session.activity && artifact ? (
            <WorksheetView
              questions={session.activity.worksheet}
              place={artifact.place}
              year={artifact.year}
              canDraw={canDraw}
              sourceHints={session.activity.sourceHints ?? undefined}
              carried={carried}
              strokes={artifact.strokes}
              texts={artifact.texts}
              value={worksheet}
              onChange={setWorksheet}
              onSubmit={submitArtifact}
              submitted={artifact.status === "submitted"}
              submitError={submitError}
              disabled={closed}
            />
          ) : (
            <Placeholder title="활동지를 준비하고 있어요" description="잠시만 기다려 주세요." />
          ))}

        {isWorkPhase && activeTab === "gallery" && (
          <GalleryView disabled={closed} noun={workNoun} />
        )}

        {viewPhase === "reflection" && (
          <section className="flex flex-col gap-6">
            <div>
              <h2 className="t-display">오늘의 성찰</h2>
              <p className="t-body mt-2">
                {total}개 질문에 모두 답해 주세요. ({answered}/{total} 작성)
              </p>
            </div>

            {session.reflectionQuestions.map((question, index) => (
              <div key={index} className="flex flex-col gap-3">
                {/* 질문에 예시를 줄 바꿔 붙이는 경우가 있다. 안 그러면 한 줄로 뭉친다 */}
                <label
                  htmlFor={`answer-${index}`}
                  className="block bg-cream t-subhead whitespace-pre-wrap"
                >
                  <span className="mr-2 font-bold">{index + 1}.</span>
                  {question}
                </label>
                <textarea
                  id={`answer-${index}`}
                  value={answers[index] ?? ""}
                  onChange={(event) =>
                    setAnswers((prev) =>
                      prev.map((value, i) => (i === index ? event.target.value : value)),
                    )
                  }
                  rows={3}
                  maxLength={1000}
                  disabled={closed}
                  placeholder="여기에 적어 주세요"
                  className="field disabled:opacity-60"
                />
              </div>
            ))}

            <span className="t-caption" aria-live="polite">
              {reflectionState === "saving" && "저장 중…"}
              {reflectionState === "saved" && "자동 저장됨"}
              {reflectionState === "done" && "제출 완료"}
              {reflectionState === "idle" && "쓰는 동안 자동으로 저장돼요"}
            </span>

            <button
              type="button"
              onClick={() => saveReflection(answers, true)}
              disabled={answered === 0 || reflectionState === "saving" || closed}
              className="pill pill-primary pill-block"
            >
              {reflectionState === "done" ? "다시 제출하기" : "제출하기"}
            </button>

            {answered < total && answered > 0 && (
              <p className="t-body-sm text-center">
                아직 답하지 않은 질문이 {total - answered}개 있어요.
              </p>
            )}

            {session.reflectionPublic && (
              <section className="mt-2 flex flex-col gap-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="t-eyebrow">친구들의 성찰</h3>
                  {/*
                    친구 글은 공개를 켜는 순간 한 번 받아 온다. 그 뒤에 낸 친구 글은
                    이 버튼을 눌러야 들어온다 — 4초마다 다 읽으면 읽기가 감당이 안 된다.
                  */}
                  <button
                    type="button"
                    onClick={() => void refreshPeers()}
                    className="pill pill-secondary t-body-sm"
                  >
                    새로 온 글 보기
                  </button>
                </div>

                {data.peers.length === 0 && (
                  <p className="t-body">
                    아직 낸 친구가 없어요. 잠시 뒤 <b>새로 온 글 보기</b>를 눌러 보세요.
                  </p>
                )}

                <ul className="flex flex-col gap-3">
                  {data.peers.map((peer, index) => (
                    <li key={index} className="card">
                      <span className="t-body-sm font-bold">{peer.name}</span>
                      {peer.answers.map(
                        (answer, i) =>
                          answer.trim() && (
                            <p key={i} className="t-body mt-2 whitespace-pre-wrap">
                              <span className="font-bold">{i + 1}. </span>
                              {answer}
                            </p>
                          ),
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
        )}
      </main>

      {/*
        수업 화면에도 방침 링크를 둔다. 다만 그리기 화면에서는 감춘다 —
        캔버스가 남은 세로를 재서 크기를 정하는데, 아래에 줄이 하나 붙으면 그만큼
        그리는 면이 줄어든다. 수업 중에 약관을 읽을 일은 없고, 진입 화면에 늘 있다.
      */}
      {!isWorkPhase && <SiteFooter />}

      {/* 게임으로만 끝나지 않게 — 수업이 시작되는 순간 원리를 한 번 짚어 준다 */}
      {showExplainer && (
        <ExplainerModal
          content={session.gameExplainer}
          onClose={() => setShowExplainer(false)}
        />
      )}
    </div>
  );
}

function ExplainerModal({ content, onClose }: { content: Content; onClose: () => void }) {
  const hasAnything =
    content.heading || content.body || content.cards?.length || content.tabs?.length;
  if (!hasAnything) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="explainer-title"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-lg bg-canvas p-6 sm:rounded-lg">
        <p className="t-eyebrow">방금 한 게임의 원리</p>
        <h2 id="explainer-title" className="t-display mt-2">
          {content.heading}
        </h2>

        {content.body && <p className="t-body-lg mt-4 whitespace-pre-wrap">{content.body}</p>}

        {content.cards && content.cards.length > 0 && (
          <div className="mt-5 flex flex-col gap-3">
            {content.cards.map((card, index) => (
              <article
                key={index}
                className={`block ${["bg-lime", "bg-mint", "bg-cream", "bg-lilac"][index % 4]}`}
              >
                <header className="flex flex-wrap items-baseline gap-x-3">
                  {card.badge && (
                    <span className="rounded-full bg-ink px-3 py-1 text-sm font-semibold text-canvas">
                      {card.badge}
                    </span>
                  )}
                  <h3 className="t-card-title">{card.title}</h3>
                </header>
                {card.lines.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-2">
                    {card.lines.map((line, i) => (
                      <li key={i} className="t-body-lg">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}

        <button type="button" onClick={onClose} className="pill pill-primary pill-block mt-6">
          알겠어요, 수업 시작!
        </button>
      </div>
    </div>
  );
}

/** "42초" · "1분 20초" — 중1이 바로 읽을 수 있게 */
function formatAway(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}초`;
  const min = Math.floor(total / 60);
  const sec = total % 60;
  return sec === 0 ? `${min}분` : `${min}분 ${sec}초`;
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="block flex flex-col items-center justify-center gap-3 bg-lilac py-20 text-center">
      <h2 className="t-display">{title}</h2>
      <p className="t-body-lg">{description}</p>
    </section>
  );
}
