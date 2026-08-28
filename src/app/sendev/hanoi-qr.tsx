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
      viewBox="0 0 35 35"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="하노이탑 게임 주소 QR 코드"
    >
      <path d="M1 1.5h7m3 0h2m6 0h3m2 0h2m1 0h7M1 2.5h1m5 0h1m2 0h3m3 0h2m1 0h1m1 0h2m4 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m1 0h2m4 0h2m3 0h4m1 0h1m1 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h3m7 0h1m3 0h3m1 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h1m4 0h4m3 0h1m2 0h1m2 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m1 0h4m1 0h2m3 0h2m1 0h2m3 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h1m2 0h1m4 0h1m2 0h4m1 0h1M1 9.5h1m1 0h5m2 0h2m1 0h3m1 0h2m1 0h1m2 0h1m1 0h1m1 0h5M1 10.5h2m1 0h1m5 0h3m1 0h2m1 0h5m1 0h2m2 0h2m1 0h2m1 0h1M1 11.5h1m1 0h5m2 0h1m1 0h1m1 0h5m2 0h1m1 0h1m5 0h1m1 0h2M1 12.5h5m2 0h3m2 0h2m3 0h2m1 0h2m1 0h1m4 0h3m1 0h1M5 13.5h1m1 0h3m5 0h3m2 0h2m1 0h4m2 0h2M1 14.5h5m2 0h1m1 0h1m2 0h2m1 0h1m1 0h2m2 0h1m1 0h1m1 0h2m3 0h3M1 15.5h1m2 0h2m1 0h3m3 0h1m2 0h2m3 0h3m1 0h3m2 0h1m1 0h1M1 16.5h1m1 0h1m2 0h1m1 0h1m2 0h1m1 0h1m2 0h1m5 0h1m1 0h5m1 0h2M1 17.5h3m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h4m4 0h1m1 0h2m1 0h2m3 0h1M6 18.5h1m1 0h1m3 0h3m2 0h1m1 0h2m3 0h1m2 0h2m1 0h4M2 19.5h1m2 0h1m1 0h1m2 0h5m1 0h2m1 0h1m2 0h1m2 0h1m2 0h2m1 0h2M8 20.5h2m2 0h1m4 0h1m2 0h1m1 0h3m3 0h5M2 21.5h1m4 0h3m2 0h2m1 0h1m3 0h1m3 0h2m3 0h3m1 0h1M1 22.5h1m1 0h1m2 0h1m1 0h1m3 0h2m1 0h3m3 0h1m2 0h1m2 0h1m2 0h2m1 0h1M1 23.5h1m1 0h3m1 0h3m2 0h2m1 0h1m4 0h1m2 0h1m1 0h1m1 0h6M1 24.5h1m2 0h2m3 0h1m3 0h2m2 0h1m2 0h4m5 0h4M1 25.5h1m2 0h7m1 0h1m5 0h4m1 0h1m1 0h5M9 26.5h1m4 0h2m1 0h5m1 0h1m1 0h1m3 0h1m1 0h1m1 0h1M1 27.5h7m3 0h1m4 0h1m1 0h1m2 0h1m1 0h3m1 0h1m1 0h1m1 0h2M1 28.5h1m5 0h1m1 0h2m1 0h1m2 0h1m2 0h2m1 0h2m1 0h2m3 0h3m1 0h1M1 29.5h1m1 0h3m1 0h1m1 0h2m1 0h2m1 0h3m5 0h1m1 0h6m1 0h1M1 30.5h1m1 0h3m1 0h1m1 0h2m5 0h1m1 0h2m2 0h1m1 0h3m2 0h2m1 0h2M1 31.5h1m1 0h3m1 0h1m1 0h2m1 0h6m3 0h1m1 0h1m1 0h1m1 0h2m2 0h1M1 32.5h1m5 0h1m8 0h1m3 0h5m1 0h2m1 0h1m1 0h1M1 33.5h7m1 0h1m1 0h3m2 0h3m4 0h6m3 0h1" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

/**
 * 참가자 입장 주소의 QR.
 *
 * 이걸 찍고 들어오면 진행자가 넘기는 대로 화면이 따라온다. 하노이 QR 과 같은 이유로
 * 빌드 시 정적으로 뽑아 넣는다 — 코드 두 개 때문에 라이브러리를 번들에 실을 이유가 없다.
 */
export function JoinQr({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 35 35"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label="나눔 세션 참가 주소 QR 코드"
    >
      <path d="M1 1.5h7m2 0h1m3 0h1m2 0h2m1 0h2m2 0h1m2 0h7M1 2.5h1m5 0h1m6 0h3m1 0h1m2 0h3m3 0h1m5 0h1M1 3.5h1m1 0h3m1 0h1m1 0h2m3 0h1m3 0h5m4 0h1m1 0h3m1 0h1M1 4.5h1m1 0h3m1 0h1m1 0h5m1 0h3m2 0h2m1 0h3m1 0h1m1 0h3m1 0h1M1 5.5h1m1 0h3m1 0h1m1 0h1m3 0h1m2 0h1m2 0h1m2 0h1m1 0h1m2 0h1m1 0h3m1 0h1M1 6.5h1m5 0h1m1 0h1m1 0h1m2 0h1m1 0h4m1 0h1m5 0h1m5 0h1M1 7.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M9 8.5h1m2 0h1m2 0h2m2 0h1m2 0h3M1 9.5h1m1 0h5m3 0h2m1 0h5m4 0h3m1 0h5M1 10.5h4m1 0h1m2 0h1m1 0h1m1 0h1m3 0h1m2 0h2m2 0h2m1 0h2m1 0h2m1 0h1M2 11.5h1m2 0h1m1 0h2m1 0h3m3 0h2m1 0h1m2 0h1m3 0h1m2 0h1m1 0h2M1 12.5h1m2 0h2m4 0h1m4 0h3m4 0h3m1 0h1m2 0h3m1 0h1M4 13.5h2m1 0h3m1 0h1m4 0h1m2 0h1m3 0h4m1 0h3m1 0h2M1 14.5h1m3 0h2m2 0h1m2 0h1m2 0h3m3 0h1m1 0h3m1 0h1m3 0h3M1 15.5h3m1 0h3m1 0h2m2 0h3m4 0h1m1 0h2m1 0h3m1 0h4M1 16.5h5m2 0h7m2 0h1m1 0h4m1 0h1m1 0h3m1 0h2M1 17.5h1m1 0h2m2 0h1m4 0h4m2 0h1m1 0h2m1 0h1m1 0h2m1 0h3m2 0h1M1 18.5h1m4 0h1m1 0h2m1 0h2m2 0h1m1 0h6m1 0h1m2 0h2m1 0h2m1 0h1M2 19.5h1m1 0h2m1 0h1m3 0h1m1 0h2m1 0h1m1 0h1m2 0h1m1 0h1m1 0h5m1 0h1M2 20.5h1m1 0h1m1 0h1m1 0h6m3 0h3m1 0h2m1 0h1m2 0h5M1 21.5h4m1 0h3m1 0h1m3 0h4m2 0h2m1 0h1m2 0h1m2 0h2m1 0h2M1 22.5h2m3 0h1m2 0h4m1 0h3m2 0h1m2 0h1m1 0h1m2 0h1m3 0h1m1 0h1M1 23.5h1m1 0h1m1 0h3m1 0h1m2 0h2m1 0h3m1 0h1m1 0h2m4 0h1m1 0h1m1 0h2M1 24.5h1m1 0h2m1 0h1m2 0h1m2 0h5m5 0h2m2 0h1m2 0h3M1 25.5h1m2 0h1m1 0h3m3 0h1m3 0h3m4 0h1m1 0h6M9 26.5h6m2 0h1m1 0h2m1 0h2m1 0h1m3 0h1m1 0h1m1 0h1M1 27.5h7m3 0h4m1 0h1m2 0h1m1 0h5m1 0h1m1 0h1m1 0h2M1 28.5h1m5 0h1m1 0h1m2 0h1m2 0h1m1 0h1m2 0h1m1 0h4m3 0h4M1 29.5h1m1 0h3m1 0h1m1 0h3m1 0h3m3 0h1m2 0h1m2 0h6m1 0h1M1 30.5h1m1 0h3m1 0h1m1 0h3m1 0h6m2 0h2m3 0h1m2 0h1m1 0h3M1 31.5h1m1 0h3m1 0h1m1 0h4m7 0h1m3 0h1m2 0h2m2 0h1M1 32.5h1m5 0h1m3 0h5m1 0h1m1 0h5m2 0h1m2 0h1m1 0h1M1 33.5h7m1 0h1m1 0h1m1 0h2m3 0h4m1 0h3m2 0h1m3 0h1" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}
