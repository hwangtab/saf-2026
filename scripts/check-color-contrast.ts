/**
 * WCAG AA 색상 대비율 검증 스크립트
 *
 * WCAG AA 기준:
 * - 일반 텍스트: 최소 4.5:1
 * - 큰 텍스트 (18px bold 또는 24px): 최소 3:1
 * - UI 컴포넌트/그래픽: 최소 3:1
 *
 * 실행: npx tsx scripts/check-color-contrast.ts
 */

// 상대 휘도(Relative Luminance) 계산
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

// 대비율 계산
function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG AA 준수 여부 확인
function checkWCAG(ratio: number): { normalText: boolean; largeText: boolean; ui: boolean } {
  return {
    normalText: ratio >= 4.5,
    largeText: ratio >= 3,
    ui: ratio >= 3,
  };
}

// 브랜드 색상 정의
const COLORS = {
  // Primary
  primary: '#2176FF',
  'primary-soft': '#D2E1FF',
  'primary-strong': '#0E4ECF',
  'primary-surface': '#EDF3FF',

  // Sun
  sun: '#FDCA40',
  'sun-soft': '#FEE9A3',
  'sun-strong': '#E3AC0D',

  // Accent
  accent: '#F79824',
  'accent-soft': '#FFD4A3',
  'accent-strong': '#D97800',

  // Canvas (배경)
  canvas: '#FFF6DD',
  'canvas-soft': '#FFF9E8',
  'canvas-strong': '#F3E2AA',

  // Charcoal (텍스트)
  charcoal: '#31393C',
  'charcoal-muted': '#555E67',
  'charcoal-soft': '#6A7378',

  // Semantic
  success: '#2E9F7B',
  warning: '#FDCA40',
  danger: '#D94F45',

  // Neutral
  white: '#FFFFFF',
  'gray-50': '#F7F8FA',
  'gray-100': '#E6EAF0',
  'gray-200': '#D1D7E0',
  'gray-300': '#B3BAC7',
  'gray-400': '#8F98A5',
  'gray-500': '#707A84',
  'gray-600': '#555E67',
  'gray-700': '#3D464D',
  'gray-800': '#2C3238',
  'gray-900': '#1F2428',
};

// 주요 색상 조합 정의
const COLOR_COMBINATIONS: Array<{
  name: string;
  foreground: string;
  background: string;
  usage: string;
}> = [
  // 텍스트 on 배경
  {
    name: 'charcoal on canvas-soft',
    foreground: 'charcoal',
    background: 'canvas-soft',
    usage: '기본 본문 텍스트',
  },
  {
    name: 'charcoal on canvas',
    foreground: 'charcoal',
    background: 'canvas',
    usage: '본문 텍스트',
  },
  {
    name: 'charcoal on white',
    foreground: 'charcoal',
    background: 'white',
    usage: '카드 내 텍스트',
  },
  {
    name: 'charcoal-muted on white',
    foreground: 'charcoal-muted',
    background: 'white',
    usage: '보조 텍스트',
  },
  {
    name: 'charcoal-soft on white',
    foreground: 'charcoal-soft',
    background: 'white',
    usage: '힌트 텍스트',
  },

  // 버튼 텍스트
  {
    name: 'white on primary',
    foreground: 'white',
    background: 'primary',
    usage: 'Primary 버튼 텍스트',
  },
  {
    name: 'white on primary-strong',
    foreground: 'white',
    background: 'primary-strong',
    usage: 'Primary 버튼 호버',
  },
  {
    name: 'white on accent',
    foreground: 'white',
    background: 'accent',
    usage: 'Accent 버튼 텍스트',
  },
  {
    name: 'white on accent-strong',
    foreground: 'white',
    background: 'accent-strong',
    usage: 'Accent 버튼 호버',
  },
  { name: 'white on success', foreground: 'white', background: 'success', usage: 'Success 버튼' },
  { name: 'white on danger', foreground: 'white', background: 'danger', usage: 'Danger 버튼' },
  {
    name: 'charcoal on warning',
    foreground: 'charcoal',
    background: 'warning',
    usage: 'Warning 버튼',
  },

  // 링크/인터랙티브
  { name: 'primary on white', foreground: 'primary', background: 'white', usage: '링크 텍스트' },
  {
    name: 'primary on canvas-soft',
    foreground: 'primary',
    background: 'canvas-soft',
    usage: '배경 위 링크',
  },
  {
    name: 'primary-strong on white',
    foreground: 'primary-strong',
    background: 'white',
    usage: '링크 호버',
  },

  // Gray 스케일
  {
    name: 'gray-500 on white',
    foreground: 'gray-500',
    background: 'white',
    usage: '비활성 텍스트',
  },
  {
    name: 'gray-600 on white',
    foreground: 'gray-600',
    background: 'white',
    usage: '레이블 텍스트',
  },
  { name: 'gray-700 on white', foreground: 'gray-700', background: 'white', usage: '부제목' },
  { name: 'gray-900 on white', foreground: 'gray-900', background: 'white', usage: '제목' },

  // 배지/태그
  {
    name: 'charcoal on sun-soft',
    foreground: 'charcoal',
    background: 'sun-soft',
    usage: '하이라이트 배지',
  },
  {
    name: 'charcoal on primary-soft',
    foreground: 'charcoal',
    background: 'primary-soft',
    usage: '정보 배지',
  },
  {
    name: 'charcoal on accent-soft',
    foreground: 'charcoal',
    background: 'accent-soft',
    usage: '알림 배지',
  },

  // Toast/Alert
  {
    name: 'white on success (toast)',
    foreground: 'white',
    background: 'success',
    usage: '성공 토스트',
  },
  {
    name: 'white on danger (toast)',
    foreground: 'white',
    background: 'danger',
    usage: '에러 토스트',
  },
  {
    name: 'charcoal on sun (toast)',
    foreground: 'charcoal',
    background: 'sun',
    usage: '경고 토스트',
  },
  {
    name: 'white on primary (toast)',
    foreground: 'white',
    background: 'primary',
    usage: '정보 토스트',
  },
];

// 검증 실행
console.log('═══════════════════════════════════════════════════════════════════');
console.log('   WCAG AA 색상 대비율 검증 결과');
console.log('   기준: 일반 텍스트 ≥ 4.5:1 | 큰 텍스트/UI ≥ 3:1');
console.log('═══════════════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;
const failures: string[] = [];

for (const combo of COLOR_COMBINATIONS) {
  const fg = COLORS[combo.foreground as keyof typeof COLORS];
  const bg = COLORS[combo.background as keyof typeof COLORS];
  const ratio = getContrastRatio(fg, bg);
  const wcag = checkWCAG(ratio);

  const normalIcon = wcag.normalText ? '✅' : '❌';

  if (wcag.normalText) {
    passCount++;
  } else {
    failCount++;
    failures.push(`${combo.name} (${ratio.toFixed(2)}:1) - ${combo.usage}`);
  }

  console.log(`${normalIcon} ${combo.name}`);
  console.log(`   대비율: ${ratio.toFixed(2)}:1`);
  console.log(
    `   일반 텍스트: ${wcag.normalText ? 'PASS' : 'FAIL'} | 큰 텍스트: ${wcag.largeText ? 'PASS' : 'FAIL'}`
  );
  console.log(`   용도: ${combo.usage}`);
  console.log('');
}

console.log('═══════════════════════════════════════════════════════════════════');
console.log(`   총 ${COLOR_COMBINATIONS.length}개 조합 검증`);
console.log(`   ✅ PASS: ${passCount} | ❌ FAIL: ${failCount}`);
console.log('═══════════════════════════════════════════════════════════════════\n');

if (failures.length > 0) {
  console.log('⚠️  WCAG AA 미준수 조합 (일반 텍스트 기준):\n');
  failures.forEach((f) => console.log(`   - ${f}`));
  console.log('\n💡 권장사항:');
  console.log('   - 미준수 조합은 큰 텍스트(18px bold 또는 24px 이상)에만 사용');
  console.log('   - 또는 더 어두운 색상으로 대체');
}
