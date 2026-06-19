import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import {
  DRAFT_PREFIX,
  DEFAULT_AGE_THRESHOLD_MS,
  buildReferencedArtworkPaths,
  listDraftStorageObjects,
  decideDraftPurge,
  summarizeSkips,
} from '@/lib/admin/draft-image-purge';

export const runtime = 'nodejs';

const CHUNK_SIZE = 100;

/**
 * 관리자 작품 등록용 임시(draft) 이미지 orphan 정리 cron.
 *
 * `admin-artwork-draft-*` 객체 중 (어떤 작품·활성 트래시 스냅샷에서도 미참조) AND
 * (생성 후 48h 경과)인 것만 삭제한다. 등록/마이그레이션/기존 삭제경로는 일절 건드리지 않는다.
 * `?dryRun=true`면 삭제 대상만 반환(production 검증용).
 *
 * 안전: 참조 스캔 실패/참조집합 0건이면 전체 abort(fail-closed). 삭제 직전 prefix 재검사.
 */
export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[purge-draft-images] admin client init failed:', err);
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  try {
    // storage를 먼저 나열한 뒤 참조집합을 읽는다(TOCTOU 윈도우 축소: 막 등록된 작품의
    // 참조가 누락되어 라이브 객체를 지우는 일을 피한다).
    const objects = await listDraftStorageObjects(supabase);
    const referenced = await buildReferencedArtworkPaths(supabase);

    // fail-closed: 작품이 존재하는데 참조집합이 비었다면 스캔 이상 → 대량 삭제 방지.
    if (referenced.size === 0) {
      console.error('[purge-draft-images] referenced set empty — aborting');
      return NextResponse.json(
        {
          error: 'referenced set empty — aborting to avoid mass deletion',
          draftObjects: objects.length,
        },
        { status: 500 }
      );
    }

    const decisions = decideDraftPurge(objects, referenced, Date.now(), DEFAULT_AGE_THRESHOLD_MS);
    const deletable = decisions
      .filter((decision) => decision.deletable)
      .map((decision) => decision.path);
    const skipped = summarizeSkips(decisions);

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        draftObjects: objects.length,
        referencedPaths: referenced.size,
        deletableCount: deletable.length,
        deletable,
        skipped,
      });
    }

    let removed = 0;
    let failed = 0;

    for (let i = 0; i < deletable.length; i += CHUNK_SIZE) {
      const chunk = deletable.slice(i, i + CHUNK_SIZE);
      // 방어적 재검사: 어떤 이유로든 draft prefix 밖 경로가 섞이면 즉시 중단.
      if (chunk.some((path) => !path.startsWith(DRAFT_PREFIX))) {
        console.error('[purge-draft-images] non-draft path in deletion set — aborting');
        return NextResponse.json(
          { error: 'non-draft path in deletion set — aborting' },
          { status: 500 }
        );
      }
      const { data, error } = await supabase.storage.from('artworks').remove(chunk);
      if (error) {
        console.error('[purge-draft-images] remove chunk failed:', error.message);
        failed += chunk.length;
        continue;
      }
      const removedCount = Array.isArray(data) ? data.length : 0;
      removed += removedCount;
      failed += Math.max(0, chunk.length - removedCount);
    }

    return NextResponse.json({
      dryRun: false,
      draftObjects: objects.length,
      referencedPaths: referenced.size,
      deletableCount: deletable.length,
      removed,
      failed,
      skipped,
    });
  } catch (err) {
    // 어떤 예외든 삭제하지 않고 실패로 반환(fail-closed).
    const message = err instanceof Error ? err.message : String(err);
    console.error('[purge-draft-images] aborted:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
