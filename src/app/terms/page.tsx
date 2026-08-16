import { PolicyPage, Section } from "@/components/policy-page";

export const metadata = { title: "이용약관 · 정보 수업 포털" };

/**
 * 이용약관.
 *
 * 상업 서비스의 약관을 흉내 내지 않는다. 이 포털은 한 학교 한 과목의 수업 도구이고,
 * 읽는 사람은 중1이다. "무엇을 하면 안 되는지"와 "안 되면 어떻게 하는지"가 실제로
 * 필요한 내용이고, 나머지는 군더더기다.
 */
export default function TermsPage() {
  return (
    <PolicyPage title="이용약관" updated="2026년 8월 16일">
      <p className="t-body">
        이 포털은 장평중학교 1학년 정보 수업에서 쓰는 학습 도구입니다. 수업에 참여하는
        학생과 담당 교사가 씁니다.
      </p>

      <Section title="1. 어떻게 들어오나요">
        <p className="t-body">
          칠판에 적힌 <b>수업 코드</b>와 <b>자기 학번</b>으로 들어옵니다. 코드는 그 수업
          시간에만 쓸 수 있고, 교시가 끝나면 만료됩니다. 접속은 그날 자정까지만 유지됩니다.
        </p>
        <p className="t-body-sm">
          다른 반 코드나 남의 학번으로는 들어올 수 없습니다.
        </p>
      </Section>

      <Section title="2. 이건 하지 말아 주세요">
        <ul className="flex list-disc flex-col gap-1 pl-5 t-body">
          <li>남의 학번으로 들어가기</li>
          <li>친구를 놀리거나 상처 주는 말·그림 남기기</li>
          <li>수업과 관계없는 그림이나 글 올리기</li>
          <li>남의 작품을 몰래 찍어 밖으로 퍼뜨리기</li>
        </ul>
        <p className="t-body-sm">
          이런 일이 있으면 선생님이 그 작품을 다른 학생에게 보이지 않게 숨길 수 있고,
          학교 생활 규정에 따라 지도합니다.
        </p>
      </Section>

      <Section title="3. 내가 만든 것은 누구 것인가요">
        <p className="t-body">
          그림과 글은 <b>만든 학생의 것</b>입니다. 학교는 수업과 평가, 그리고 학교 안에서의
          전시(교실 앞 화면·학급 게시)에만 씁니다. 학교 밖에 공개하거나 다른 용도로 쓰려면
          따로 물어봅니다.
        </p>
      </Section>

      <Section title="4. 인공지능을 써도 되나요">
        <p className="t-body">
          됩니다. 다만 <b>어디서 찾았는지 출처를 반드시 적어야 합니다.</b> 활동지에 적는
          칸이 있습니다. 찾아본 것을 숨기지 않고 밝히는 태도까지 함께 평가합니다.
        </p>
      </Section>

      <Section title="5. 저장에 대해">
        <p className="t-body">
          쓰는 동안 자동으로 저장되지만, 인터넷이 끊기거나 태블릿이 꺼지면 마지막 몇 초가
          사라질 수 있습니다. 중요한 것은 <b>저장 버튼</b>을 눌러 두세요.
        </p>
        <p className="t-body-sm">
          이 포털은 수업 도구이므로 기록이 영원히 보관되지 않습니다. 학기가 끝나면
          지웁니다 — 남기고 싶은 작품은 미리 사진으로 찍어 두세요.
        </p>
      </Section>

      <Section title="6. 잘 안 될 때">
        <p className="t-body">
          화면이 멈추거나 그림이 안 보이면 <b>손을 들어 선생님께 알려 주세요.</b> 혼자
          새로고침을 반복하다 쓰던 것을 잃는 경우가 더 많습니다.
        </p>
      </Section>

      <Section title="7. 개인정보">
        <p className="t-body-sm">
          무엇을 모으고 언제 지우는지는 <b>개인정보처리방침</b>에 따로 적었습니다. 아래
          링크에서 볼 수 있습니다.
        </p>
      </Section>
    </PolicyPage>
  );
}
