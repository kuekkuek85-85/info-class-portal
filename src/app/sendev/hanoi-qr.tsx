/**
 * 하노이탑 게임 주소의 QR.
 *
 * 빌드 시 정적으로 뽑아 넣는다 — 실행 의존성을 늘리지 않으려는 것이다. 참가자 열다섯
 * 명이 한 번 찍고 마는 코드 하나 때문에 QR 라이브러리를 번들에 싣는 것은 과하다.
 *
 * 다시 만들 일이 있으면 (주소가 바뀌면):
 *   npm install --no-save qrcode
 *   node -e "import('qrcode').then(q=>q.toString('새주소',{type:'svg',margin:1}).then(console.log))"
 * 로 뽑아 아래 d 를 갈아 끼운다.
 *
 * 색은 currentColor 라 감싼 쪽에서 정한다. 프로젝터에서 대비가 모자라면 부모의
 * text 색만 바꾸면 된다.
 */
export function HanoiQr({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 31 31"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="하노이탑 게임 주소 QR 코드"
    >
      <path
        d="M1 1.5h7m1 0h6m3 0h4m1 0h7M1 2.5h1m5 0h1m1 0h1m1 0h1m2 0h1m3 0h2m3 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m2 0h2m1 0h2m4 0h2m2 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h3m1 0h3m2 0h1m4 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m2 0h2m3 0h4m1 0h1m2 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m2 0h5m4 0h3m1 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h1m1 0h3m3 0h4M1 9.5h1m1 0h2m1 0h3m1 0h2m1 0h1m1 0h1m1 0h2m1 0h1m2 0h1m2 0h1m1 0h2M4 10.5h1m1 0h1m2 0h4m2 0h1m1 0h9m3 0h1M2 11.5h1m1 0h1m2 0h2m3 0h1m2 0h1m1 0h3m3 0h1m1 0h1m1 0h2M1 12.5h1m1 0h1m5 0h1m1 0h1m1 0h2m1 0h2m1 0h7m3 0h1M2 13.5h1m1 0h2m1 0h2m1 0h2m1 0h4m1 0h1m1 0h1m1 0h1m3 0h2M1 14.5h1m2 0h2m3 0h2m1 0h1m3 0h6m1 0h1m3 0h3M2 15.5h2m1 0h3m2 0h1m1 0h3m2 0h2m1 0h1m1 0h1m2 0h1m1 0h3M1 16.5h4m3 0h4m1 0h1m5 0h2m3 0h1m3 0h1M5 17.5h4m1 0h1m1 0h4m1 0h1m1 0h1m2 0h1m1 0h3m1 0h1M3 18.5h1m4 0h1m2 0h1m4 0h1m1 0h1m2 0h2m1 0h1m1 0h3M1 19.5h1m2 0h4m2 0h2m2 0h5m2 0h1m2 0h2m1 0h1M4 20.5h1m4 0h4m4 0h3m4 0h1m2 0h1M2 21.5h6m3 0h2m1 0h1m2 0h11M9 22.5h1m1 0h1m2 0h1m2 0h1m3 0h1m3 0h5M1 23.5h7m1 0h1m1 0h1m2 0h1m5 0h2m1 0h1m1 0h2m1 0h1M1 24.5h1m5 0h1m1 0h2m2 0h1m2 0h1m2 0h1m1 0h1m3 0h2m1 0h2M1 25.5h1m1 0h3m1 0h1m2 0h1m4 0h4m2 0h5m1 0h3M1 26.5h1m1 0h3m1 0h1m1 0h5m1 0h3m1 0h2m1 0h1m1 0h3m2 0h1M1 27.5h1m1 0h3m1 0h1m1 0h1m2 0h1m1 0h2m1 0h1m6 0h1m2 0h1m1 0h1M1 28.5h1m5 0h1m3 0h1m5 0h1m2 0h2m1 0h1m1 0h2m1 0h1M1 29.5h7m1 0h1m1 0h1m4 0h1m3 0h6m2 0h1"
        stroke="currentColor"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}
