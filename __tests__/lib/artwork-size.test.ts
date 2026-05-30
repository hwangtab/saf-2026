import {
  parseSizeText,
  area,
  estimateHo,
  classifyBucket,
  describeSize,
  toRoomDimensions,
} from '../../lib/artwork-size';

describe('parseSizeText', () => {
  it('표준 2D cm', () => {
    expect(parseSizeText('72.7x60.6cm')).toEqual({ width: 72.7, height: 60.6, depth: null });
  });
  it('정수 cm', () => {
    expect(parseSizeText('60x45cm')).toEqual({ width: 60, height: 45, depth: null });
  });
  it('3D WxHxDcm', () => {
    expect(parseSizeText('60x60x130cm')).toEqual({ width: 60, height: 60, depth: 130 });
  });
  it('× 구분자 허용', () => {
    expect(parseSizeText('72.7×60.6cm')).toEqual({ width: 72.7, height: 60.6, depth: null });
  });
  it.each(['확인 중', '미정', '', '23.9x,35.2cm', '24.918.5cm', null, undefined])(
    'placeholder·오타·빈값 → null: %s',
    (raw) => {
      expect(parseSizeText(raw as string)).toBeNull();
    }
  );
});

describe('area', () => {
  it('가로×세로', () => {
    expect(area({ width: 10, height: 20 })).toBe(200);
  });
});

describe('estimateHo', () => {
  it('20호 정확 매칭 (72.7x60.6 → 20, confident)', () => {
    expect(estimateHo({ width: 72.7, height: 60.6 })).toEqual({ ho: 20, confident: true });
  });
  it('10호 근사 (53x45.5 → 10, confident)', () => {
    expect(estimateHo({ width: 53, height: 45.5 })).toEqual({ ho: 10, confident: true });
  });
  it('100호 (162.2x130.3 → 100)', () => {
    expect(estimateHo({ width: 162.2, height: 130.3 })?.ho).toBe(100);
  });
  it('종횡비 극단(180x30, 6:1) → confident=false', () => {
    expect(estimateHo({ width: 180, height: 30 })?.confident).toBe(false);
  });
  it('정사각(45.5x45.5) → confident=true', () => {
    expect(estimateHo({ width: 45.5, height: 45.5 })?.confident).toBe(true);
  });
});

describe('classifyBucket', () => {
  it.each([
    [{ width: 22.7, height: 15.8, depth: null }, 'small'], // 359
    [{ width: 53, height: 45.5, depth: null }, 'small'], // 2411.5 (10호)
    [{ width: 72.7, height: 60.6, depth: null }, 'medium'], // 4405.6 (20호)
    [{ width: 90.9, height: 72.7, depth: null }, 'medium'], // 6608 (30호) — 라벨 정합
    [{ width: 100, height: 80.3, depth: null }, 'large'], // 8030 (40호)
    [{ width: 200, height: 150, depth: null }, 'xlarge'], // 30000 > 23200
    [{ width: 60, height: 60, depth: 130 }, 'object'], // 3D
  ] as const)('%o → %s', (d, expected) => {
    expect(classifyBucket(d)).toBe(expected);
  });
});

describe('describeSize', () => {
  it('DB 컬럼 우선', () => {
    expect(describeSize({ size: '확인 중', width_cm: 72.7, height_cm: 60.6 })).toEqual({
      cm: '72.7×60.6cm',
      ho: 20,
      bucket: 'medium',
      is3d: false,
    });
  });
  it('size text 폴백', () => {
    expect(describeSize({ size: '60x45cm' })).toEqual({
      cm: '60×45cm',
      ho: expect.any(Number),
      bucket: 'small',
      is3d: false,
    });
  });
  it('3D는 ho=null, is3d=true', () => {
    const r = describeSize({ size: '60x60x130cm' });
    expect(r).toMatchObject({ cm: '60×60×130cm', ho: null, bucket: 'object', is3d: true });
  });
  it('종횡비 극단은 ho=null', () => {
    expect(describeSize({ size: '180x30cm' })?.ho).toBeNull();
  });
  it('치수 미상 → null', () => {
    expect(describeSize({ size: '확인 중' })).toBeNull();
  });
});

describe('toRoomDimensions', () => {
  it('구조화 컬럼 우선 (cm→m), 확인 중이어도 치수 사용', () => {
    const r = toRoomDimensions({ size: '확인 중', width_cm: 72.7, height_cm: 60.6 });
    expect(r.widthM).toBeCloseTo(0.727);
    expect(r.heightM).toBeCloseTo(0.606);
    expect(r.depthM).toBeUndefined();
    expect(r.isDefault).toBeFalsy();
  });
  it('3D depth 포함', () => {
    const r = toRoomDimensions({ size: '', width_cm: 60, height_cm: 60, depth_cm: 130 });
    expect(r.widthM).toBeCloseTo(0.6);
    expect(r.depthM).toBeCloseTo(1.3);
  });
  it('컬럼 없으면 size 텍스트 폴백', () => {
    expect(toRoomDimensions({ size: '60x45cm' })).toMatchObject({ widthM: 0.6, heightM: 0.45 });
  });
  it('치수 미상(컬럼·텍스트 모두 없음) → isDefault', () => {
    expect(toRoomDimensions({ size: '확인 중' }).isDefault).toBe(true);
  });
});
