/**
 * 이름 가리기 — 학생 정체를 외부 AI 로 내보내지 않기 위한 장치.
 *
 * 이 과목 포털의 1순위 가치는 감정 글의 프라이버시다. 챗봇이 "김하율 감정 뽑아줘" 에
 * 답하려면 감정 원문을 Gemini(구글)로 보내야 하는데, 거기에 **누구의 것인지**까지
 * 넘기지 않는다. 감정·성찰 내용은 보내되 이름·학번·번호는 `학생A` 로 바꿔서 보내고,
 * 답이 돌아오면 화면에 다시 실명으로 붙인다.
 *
 * 매핑은 요청 하나 안에서만 산다 — 서버 밖으로도, 다음 요청으로도 넘어가지 않는다.
 *
 * 순수 로직이라 서버·테스트 어디서나 부른다.
 */

export interface RosterEntry {
  studentId: string;
  name: string;
  number: number;
  classNo: number;
}

/** 0→"A", 25→"Z", 26→"AA" … 가명 꼬리표. 실명·다른 가명과 섞이지 않는 글자만 쓴다. */
function toLetters(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    out = String.fromCharCode(65 + r) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export class Pseudonymizer {
  private readonly byId = new Map<string, RosterEntry>();
  private readonly pseudoById = new Map<string, string>();
  private readonly idByPseudo = new Map<string, string>();
  /** 이름이 긴 학생부터 — "김하율" 을 "김하" 보다 먼저 바꿔야 잘리지 않는다 */
  private readonly named: RosterEntry[];
  private counter = 0;

  constructor(roster: RosterEntry[]) {
    for (const entry of roster) this.byId.set(entry.studentId, entry);
    this.named = roster
      .filter((entry) => entry.name && entry.name.trim().length >= 2)
      .sort((a, b) => b.name.length - a.name.length);
  }

  /** 실학번 → 가명. 처음 참조될 때 하나씩 지어 준다. */
  pseudoFor(studentId: string): string {
    const existing = this.pseudoById.get(studentId);
    if (existing) return existing;
    const pseudonym = `학생${toLetters(this.counter++)}`;
    this.pseudoById.set(studentId, pseudonym);
    this.idByPseudo.set(pseudonym, studentId);
    return pseudonym;
  }

  /** 가명 → 실학번. 도구가 가명을 받아 진짜 데이터를 찾을 때. */
  realFor(pseudonym: string): string | null {
    return this.idByPseudo.get(pseudonym.trim()) ?? null;
  }

  /** 텍스트에 든 실명을 가명으로 바꾼다. 자유서술(사유·성찰) 안의 다른 이름도 함께 가려진다. */
  mask(text: string): string {
    if (!text) return text;
    let out = text;
    for (const entry of this.named) {
      if (out.includes(entry.name)) {
        out = out.split(entry.name).join(this.pseudoFor(entry.studentId));
      }
    }
    return out;
  }

  /** 가명을 실명으로 되돌린다. 긴 가명(학생AA)을 먼저 바꿔 짧은 가명(학생A)이 잘라 먹지 않게 한다. */
  unmask(text: string): string {
    if (!text) return text;
    let out = text;
    const pseudonyms = [...this.idByPseudo.keys()].sort((a, b) => b.length - a.length);
    for (const pseudonym of pseudonyms) {
      const id = this.idByPseudo.get(pseudonym)!;
      const name = this.byId.get(id)?.name;
      if (name) out = out.split(pseudonym).join(name);
    }
    return out;
  }

  entryOf(studentId: string): RosterEntry | undefined {
    return this.byId.get(studentId);
  }

  /** 이름으로 학생을 찾는다. 동명이인이면 여럿을 돌려준다. */
  findByName(name: string): RosterEntry[] {
    const q = name.trim();
    if (!q) return [];
    const exact = [...this.byId.values()].filter((e) => e.name === q);
    if (exact.length > 0) return exact;
    return [...this.byId.values()].filter((e) => e.name.includes(q) || q.includes(e.name));
  }

  /** 번호로 학생을 찾는다. 반을 알면 한 명으로 좁혀진다. */
  findByNumber(number: number, classNo?: number): RosterEntry[] {
    return [...this.byId.values()].filter(
      (e) => e.number === number && (classNo === undefined || e.classNo === classNo),
    );
  }
}
