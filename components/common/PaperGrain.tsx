/**
 * 종이 grain noise overlay — 페이지 전체에 깔리는 미세 텍스처.
 *
 * 의도: 오윤의 작업(목판화·인쇄 전단지·시집 표지)을 다루는 페이지에서
 * "디지털로 깔끔하게 출력된 화면"의 인상을 부드럽게 깎아, 인쇄물·종이의
 * 결을 한 켜 얹는다. opacity는 매우 낮게(~5%), mix-blend-mode로 어두운
 * 영역에도 grain이 살아남도록.
 *
 * fixed + pointer-events-none + aria-hidden 으로 인터랙션·접근성 영향 0.
 * 청원 페이지 / 40주기 특별전 페이지 두 곳에서 공유 사용해 시각 통일.
 */
export default function PaperGrain() {
  // SVG fractalNoise를 data URI로 인코딩. baseFrequency가 grain 입자 크기를 결정.
  const noise = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix values='0 0 0 0 0.15  0 0 0 0 0.13  0 0 0 0 0.12  0 0 0 0.45 0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)'/>
    </svg>`.replace(/\s+/g, ' ')
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] opacity-[0.055] mix-blend-multiply"
      style={{
        backgroundImage: `url("data:image/svg+xml;utf8,${noise}")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}
