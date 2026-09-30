/**
 * 「인간과 인공지능」 학생별 최종 앱 산출물 링크 목록 (교사용, 로컬 실행 전용).
 *
 *   node --env-file=.env.local scripts/print-hai-thu-app-links.ts
 *   node --env-file=.env.local scripts/print-hai-thu-app-links.ts hai-thu-1
 *   node --env-file=.env.local scripts/print-hai-thu-app-links.ts hai-tue-1
 *
 * 목요일 1기(hai-thu-1, CLASS_NO 3)를 기본으로, 그 분반 학생들이 낸 **앱 산출물 링크**를
 * 학번 순으로 콘솔에 출력한다. 발표 준비·확인용 교사 목록이라 이름·학번을 함께 찍는다
 * (교사가 로컬에서만 실행 · 외부 전송 없음 · 순수 읽기).
 *
 * ## 어디서 읽는가 (확인한 키·활동)
 *
 *  - 활동(activityId): **hai-2026-1기** — 2~7차시가 같은 통을 쓴다(seed-hai*.ts 의 ACTIVITY_ID).
 *  - 앱 링크 answer 키: **build_url** — 캔바로 만든 앱(배포 URL)을 담는 칸. 2·3차부터 7차까지
 *    이 키 하나로 앱 링크를 판정한다(교사 대시보드 LINK_KEY 도 build_url).
 *  - 발표 슬라이드 answer 키: **slides_url** — 6차에 만든 발표 자료 링크(참고로 함께 찍는다).
 *  작품 문서 ID 는 `${activityId}__${학번}` 이고, 그 문서의 answers 에서 위 두 키를 읽는다.
 *
 * ## 무엇을 세는가
 *
 *  - 분반 명단(enrollments, groupKey)을 기준으로 전원을 출력한다. 링크가 없으면 "(미제출)".
 *  - 명단에 없지만 작품이 있는 학번(전입·임시)도 빠뜨리지 않게 뒤에 덧붙인다.
 *  - 제출 판정은 **build_url(앱 링크)** 이 있는지로 센다.
 */

import { cert, initializeApp } from "firebase-admin/app";
import { FieldPath, getFirestore } from "firebase-admin/firestore";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ 환경변수 ${name} 가 없습니다. --env-file=.env.local 을 붙였는지 확인하세요.`);
    process.exit(1);
  }
  return value;
}

const app = initializeApp({
  credential: cert({
    projectId: requiredEnv("FIREBASE_PROJECT_ID"),
    clientEmail: requiredEnv("FIREBASE_CLIENT_EMAIL"),
    privateKey: requiredEnv("FIREBASE_PRIVATE_KEY").replace(/^["']|["']$/g, "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });

const ACTIVITY_ID = "hai-2026-1기";
/** 분반 열쇠 → 사람이 읽는 이름·데이터 통 번호 (seed-hai7 의 groups 표) */
const GROUP_INFO: Record<string, { label: string; classNo: number }> = {
  "hai-tue-1": { label: "화요일 1기", classNo: 1 },
  "hai-tue-2": { label: "화요일 2기", classNo: 2 },
  "hai-thu-1": { label: "목요일 1기", classNo: 3 },
  "hai-thu-2": { label: "목요일 2기", classNo: 4 },
};

const GROUP_KEY = process.argv[2] ?? "hai-thu-1";
const GROUP = GROUP_INFO[GROUP_KEY];

/** 주소 칸에 스킴이 빠져 저장됐어도 눌리게 https:// 를 채운다. 빈 값은 그대로 빈 값. */
function normalizeUrl(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

interface Row {
  studentId: string;
  name: string;
  number: number | null;
  buildUrl: string;
  slidesUrl: string;
  inRoster: boolean;
}

async function main(): Promise<void> {
  if (!GROUP) {
    console.error(
      `✗ 모르는 분반 열쇠 "${GROUP_KEY}". 다음 중 하나를 쓰세요: ${Object.keys(GROUP_INFO).join(", ")}`,
    );
    process.exit(1);
  }

  // ── 명단(enrollments, groupKey) — 전원 기준 ──────────────
  const enroll = await db.collection("enrollments").where("groupKey", "==", GROUP_KEY).get();
  const rosterIds = enroll.docs
    .map((d) => String((d.data() as { studentId?: string }).studentId ?? ""))
    .filter(Boolean);

  // ── 작품(artifacts, 같은 활동·이 반) — 명단에 없는 학번까지 잡기 ──
  const artSnap = await db
    .collection("artifacts")
    .where("activityId", "==", ACTIVITY_ID)
    .where("classNo", "==", GROUP.classNo)
    .get();

  const answersById = new Map<string, Record<string, string>>();
  for (const doc of artSnap.docs) {
    const data = doc.data() as { studentId?: string; answers?: Record<string, string> };
    if (data.studentId) answersById.set(String(data.studentId), data.answers ?? {});
  }

  // ── 학번 합집합: 명단 ∪ 작품 주인 ──────────────────────
  const rosterSet = new Set(rosterIds);
  const allIds = [...new Set([...rosterIds, ...answersById.keys()])];

  // ── 이름·번호 조회 (students, documentId in — 30개씩) ───
  const names = new Map<string, { name: string; number: number | null }>();
  for (let i = 0; i < allIds.length; i += 30) {
    const chunk = allIds.slice(i, i + 30);
    if (chunk.length === 0) continue;
    const snap = await db
      .collection("students")
      .where(FieldPath.documentId(), "in", chunk)
      .get();
    for (const doc of snap.docs) {
      const d = doc.data() as { name?: string; number?: number };
      names.set(doc.id, { name: d.name ?? "", number: typeof d.number === "number" ? d.number : null });
    }
  }

  const rows: Row[] = allIds.map((studentId) => {
    const ans = answersById.get(studentId) ?? {};
    return {
      studentId,
      name: names.get(studentId)?.name ?? "(이름 없음)",
      number: names.get(studentId)?.number ?? null,
      buildUrl: normalizeUrl(ans.build_url ?? ""),
      slidesUrl: normalizeUrl(ans.slides_url ?? ""),
      inRoster: rosterSet.has(studentId),
    };
  });

  // 학번 순 (명단 → 명단 밖 순으로 묶어서, 각 묶음은 학번 순)
  rows.sort((a, b) => {
    if (a.inRoster !== b.inRoster) return a.inRoster ? -1 : 1;
    return a.studentId.localeCompare(b.studentId);
  });

  console.log(`\n「인간과 인공지능」 앱 산출물 링크 — ${GROUP.label} (${GROUP_KEY}, 반 통 ${GROUP.classNo})`);
  console.log(`활동 ${ACTIVITY_ID} · 앱 링크 키 build_url · 발표자료 키 slides_url\n`);

  const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));
  console.log(`${pad("학번", 8)}${pad("이름", 12)}앱 링크(build_url)`);
  console.log("-".repeat(60));

  let submitted = 0;
  for (const r of rows) {
    if (r.buildUrl) submitted += 1;
    const tag = r.inRoster ? "" : " [명단 밖]";
    const link = r.buildUrl || "(미제출)";
    console.log(`${pad(r.studentId, 8)}${pad(r.name + tag, 12)}${link}`);
    // 발표자료 링크가 있으면 다음 줄에 덧붙인다 (있을 때만 — 목록이 지저분해지지 않게)
    if (r.slidesUrl) console.log(`${pad("", 20)}↳ 발표자료: ${r.slidesUrl}`);
  }

  console.log("-".repeat(60));
  console.log(
    `제출(앱 링크 있음) ${submitted} / 전체 ${rows.length}명` +
      ` · 명단 ${rosterIds.length}명` +
      (rows.length > rosterIds.length ? ` · 명단 밖 ${rows.length - rosterIds.length}명` : ""),
  );
  if (rosterIds.length === 0) {
    console.log("⚠ 이 분반 enrollments 명단이 비어 있습니다 — 작품 주인만으로 출력했습니다.");
  }
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("✗ 실패:", error instanceof Error ? error.message : error);
  process.exit(1);
});
