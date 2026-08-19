import { PolicyPage, Section } from "@/components/policy-page";

export const metadata = { title: "개인정보처리방침 · 정보 수업 포털" };

/**
 * 개인정보처리방침.
 *
 * **여기 적힌 것은 실제 코드와 하나씩 맞춰 쓴 것이다.** 방침과 구현이 어긋나면
 * 방침이 아니라 거짓말이 된다. 항목을 늘리거나 줄일 때는 코드를 먼저 확인할 것.
 *
 *   수집 항목   students · attendance · moodEntries · quizAnswers ·
 *               artifacts · reflections · artifactFeedbacks 컬렉션
 *   이탈 기록   attendance 의 awayMs · awayCount · longestAwayMs · lastAwayAt
 *   쿠키        portal_student · portal_code · portal_teacher · portal_device
 *   삭제        /teacher/data 의 일괄 삭제 여섯 가지
 */
export default function PrivacyPage() {
  return (
    <PolicyPage title="개인정보처리방침" updated="2026년 8월 16일">
      <p className="t-body">
        장평중학교 정보과 수업 포털(이하 &ldquo;이 포털&rdquo;)이 수업 중에 무엇을 모으고,
        얼마나 두었다가, 언제 지우는지를 적었습니다. 학생이 읽을 수 있게 쉬운 말로 씁니다.
      </p>

      <Section title="1. 누가 관리하나요">
        <p className="t-body">
          장평중학교 정보과 교사가 수업 운영을 위해 관리합니다. 궁금한 점이나 삭제 요청은
          정보 수업 시간에 선생님께 말하거나 학교로 문의하세요.
        </p>
      </Section>

      <Section title="2. 무엇을 모으나요">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left t-body-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3">항목</th>
                <th className="py-2 pr-3">언제 생기나</th>
                <th className="py-2">왜 필요한가</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["학번 · 이름", "선생님이 명렬표를 등록할 때", "누구의 기록인지 잇기 위해"],
                ["접속 시각", "수업 코드와 학번으로 들어올 때", "출석 확인"],
                ["오늘의 기분 · 이유 한 줄", "기분 단계에서 직접 고르고 쓸 때", "학생 상태를 살피기 위해"],
                ["퀴즈에서 고른 답", "퀴즈 단계에서 선택할 때", "무엇을 더 짚어야 할지 판단"],
                ["그림 · 활동지 답 · 참고한 곳", "그리고 쓸 때", "수업 활동 결과물"],
                ["성찰 글", "성찰 단계에서 쓸 때", "수업 정리와 수행평가 근거"],
                ["친구 작품에 남긴 글 · 이모지", "작품 감상에서 남길 때", "서로 배우기"],
                ["자리 비움 시간", "수업 화면을 벗어났다 돌아올 때", "수업 중 집중 확인"],
              ].map(([item, when, why]) => (
                <tr key={item} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-semibold">{item}</td>
                  <td className="py-2 pr-3">{when}</td>
                  <td className="py-2">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-body-sm">
          주민등록번호, 연락처, 주소, 사진은 <b>모으지 않습니다.</b> 위치도 받지 않습니다.
        </p>
      </Section>

      <Section title="3. 모으지 않는 것 — 자리 비움에 대해">
        <p className="t-body">
          수업 화면을 벗어나면 <b>벗어난 시간의 길이</b>만 기록합니다.{" "}
          <b>어느 앱이나 사이트로 갔는지는 알 수 없고, 기록되지도 않습니다.</b> 브라우저가
          그런 정보를 웹사이트에 주지 않기 때문입니다.
        </p>
        <p className="t-body-sm">
          그래서 이 숫자는 화면이 저절로 꺼진 것, 전화가 온 것, 알림을 확인한 것과 구분되지
          않습니다. 선생님이 교실을 둘러볼 때를 알려 주는 용도로만 쓰고, <b>성적이나 태도
          점수에 반영하지 않습니다.</b>
        </p>
      </Section>

      <Section title="4. 얼마나 두나요">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left t-body-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-3">기록</th>
                <th className="py-2">지우는 때</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["기분에 쓴 이유 한 줄", "한 달마다"],
                ["기분 기록 · 성찰 글 · 작품 · 접속 기록", "학기가 끝날 때"],
                ["명렬표(학번·이름)", "학기가 끝날 때"],
                ["자리 비움 기록", "접속 기록과 함께 (같은 곳에 저장됩니다)"],
              ].map(([what, when]) => (
                <tr key={what} className="border-b border-line align-top">
                  <td className="py-2 pr-3 font-semibold">{what}</td>
                  <td className="py-2">{when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="t-body-sm">
          삭제는 선생님이 수업 관리 화면에서 직접 실행하며, 되돌릴 수 없습니다.
        </p>
      </Section>

      <Section title="5. 누가 볼 수 있나요">
        <ul className="flex list-disc flex-col gap-1 pl-5 t-body">
          <li>기록 전체는 정보과 교사만 봅니다.</li>
          <li>
            교실 앞 화면에 띄우는 기분 집계에는 <b>이름과 이유가 나오지 않습니다.</b>{" "}
            숫자만 나옵니다.
          </li>
          <li>
            작품 감상에서 친구에게 보이는 것은 <b>그림과 활동지 답</b>뿐이고,{" "}
            <b>누가 그렸는지는 나오지 않습니다.</b>
          </li>
          <li>학교 밖 누구에게도 제공하거나 팔지 않습니다.</li>
        </ul>
      </Section>

      <Section title="6. 어디에 저장되나요">
        <p className="t-body">
          구글의 Firebase(Firestore)와 Vercel을 씁니다. 두 회사는 저장과 전달만 맡고,
          기록을 다른 목적으로 쓰지 않습니다. 서버는 나라 밖에 있을 수 있습니다.
        </p>
      </Section>

      <Section title="7. 인공지능을 쓰는 곳">
        <p className="t-body">
          수업 정리 화면에서 <b>여러분이 적은 직업 이름을 모아 셀 때</b> 구글의 인공지능
          (Gemini)을 씁니다. &ldquo;교사&rdquo;와 &ldquo;선생님&rdquo;처럼 같은 뜻으로 쓴
          말을 하나로 묶기 위해서입니다.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5 t-body-sm">
          <li>
            보내는 것은 <b>직업 이름뿐</b>입니다. 이름·학번·그 밖의 답은 보내지 않습니다.
          </li>
          <li>누가 적었는지는 함께 보내지 않아, 받는 쪽에서 알 수 없습니다.</li>
          <li>이 기능이 꺼져 있어도 수업은 그대로 됩니다. 묶는 방식만 단순해집니다.</li>
        </ul>
      </Section>

      <Section title="8. 쿠키">
        <p className="t-body-sm">
          로그인 상태를 유지하려고 브라우저에 작은 값을 저장합니다.{" "}
          <b>학생 쿠키는 그날 자정에 사라집니다</b> — 태블릿을 함께 쓰는 다음 사람이 남의
          계정으로 들어가지 않게 하기 위해서입니다. 광고나 추적에 쓰는 쿠키는 없습니다.
        </p>
      </Section>

      <Section title="9. 학생의 권리">
        <p className="t-body">
          자기 기록을 보여 달라고 하거나, 지워 달라고 할 수 있습니다. 수업 화면의{" "}
          <b>내 기록</b>에서 스스로 쓴 것을 언제든 볼 수 있고, 삭제는 선생님께 말하면
          됩니다.
        </p>
      </Section>

      <Section title="10. 바뀌면 알려 드립니다">
        <p className="t-body-sm">
          내용이 바뀌면 이 문서의 시행일을 고치고 수업 시간에 알립니다.
        </p>
      </Section>
    </PolicyPage>
  );
}
