/**
 * STREAMS 동기화 개인전(교사 주도 방송) — 데이터 모델과 순수 헬퍼.
 *
 * 기존 개인전(streams_solo)은 학생마다 자기 덱을 뽑아 제각각 진행한다. 이 모드는 **교사가 한
 * 장씩 뽑아 전원에게 같은 순서의 같은 숫자**를 보내고(공용 덱), **판·점수는 학생별로 따로**
 * 둔다(여전히 개인전). 릴레이 그림(relay.ts + relayGroups + 폴링 + 교사 패널)과 같은 아키텍처:
 * 공유 상태 doc(streamsMatches) + 학생별 doc(streamsBoards) + 4초 폴링 + 교사 대시보드 제어.
 *
 * 이 파일은 타입·상수·순수 계산만 담는다(server-only 아님 — 클라이언트가 import 한다). 게임
 * 규칙·채점은 streams.ts(makeDeck/shuffle/scoreBoard/BOARD_SIZE/JOKER)를 공유한다.
 *
 * ## 프라이버시
 *
 * 보드·점수·학번·이름만 다룬다 — 감정/마음일기 데이터와 무관하다. 교사 등수 발표에만 학번·
 * 이름·판이 노출되고(게임 기록이라 비민감), Gemini 는 전혀 쓰지 않는다. relayGroups 처럼
 * answers(갤러리·감정 답)와 완전히 분리된 별도 컬렉션이라 감정 답이 새지 않는다.
 */

import type { Slot } from "./streams";

/** 교사가 뽑는 사이 학생의 차례 기본 제한 시간(초). 0/미설정이면 제한 없음. */
export const DEFAULT_STREAMS_DRAW_SECONDS = 30;

/**
 * 한 분반(세션)의 공유 매치 상태. Firestore 문서 id = sessionId.
 *
 * 세션 문서 ID 자체가 `날짜__교시__분반열쇠` 라 분반이 이미 구분된다(정보과 수업과 안 겹침).
 * 교사만 쓴다(firebase-admin). deck 은 셔플된 공용 40장 — drawCount 장까지가 공개된 숫자다
 * (아직 안 뽑은 뒷장은 학생 응답에 싣지 않아 다음 카드가 새지 않는다).
 */
export interface StreamsMatch {
  id: string;
  sessionId: string;
  classNo: number;
  activityId: string;
  /** 셔플된 공용 덱(40장). JOKER=0. 교사만 본다 — 학생에겐 drawCount 장까지만 내려간다. */
  deck: number[];
  /** 지금까지 뽑은 장 수(0~BOARD_SIZE). 뽑힌 숫자 = deck.slice(0, drawCount). */
  drawCount: number;
  /** 마지막으로 뽑은 시각(ms). 카운트다운 기준. 아직 안 뽑았으면 0. */
  lastDrawAt: number;
  /** 한 장당 제한 시간(초). 0이면 제한 없음(카운트다운 없음). */
  drawSeconds: number;
  status: "drawing" | "finished";
  /** 교사가 등수 발표를 시작하면 true — 학생 화면에 "결과 발표 중" + 내 최종 판/점수를 띄운다. */
  revealRank: boolean;
  /** 제출마다 +1. 동시 제출/뽑기 충돌 방지·폴링 변화 감지. */
  rev: number;
  updatedAt: number;
}

/**
 * 학생 한 명의 개인 판. Firestore 문서 id = `${sessionId}__${studentId}`.
 *
 * 공용 덱에서 뽑힌 순서대로 board 에 놓는다 — placed 번째로 놓는 숫자는 항상 deck[placed]
 * 이므로(모두가 같은 순서), 서버가 값을 정한다(학생이 다른 값을 심을 수 없다).
 */
export interface StreamsBoard {
  id: string;
  sessionId: string;
  studentId: string;
  classNo: number;
  activityId: string;
  /** 20칸. 놓인 칸은 숫자(JOKER=0), 빈 칸은 null. */
  board: Slot[];
  /** 놓은 칸 수(= board 의 non-null 개수). 다음에 놓을 숫자는 deck[placed]. */
  placed: number;
  rev: number;
  updatedAt: number;
}

/** 빈 칸(null) 중 가장 왼쪽(가장 낮은 index). 없으면 -1. 타임아웃 자동 배치에 쓴다. */
export function leftmostEmpty(board: readonly Slot[]): number {
  return board.findIndex((s) => s === null);
}

/** 매치 문서 id(= sessionId). relayGroups 처럼 규칙을 한 곳에 둔다. */
export function matchDocId(sessionId: string): string {
  return sessionId;
}

/** 학생 판 문서 id. */
export function boardDocId(sessionId: string, studentId: string): string {
  return `${sessionId}__${studentId}`;
}
