import { hasActiveOrdersForArtworks } from './active-order-guard';

type EditionResult = {
  data: { edition_type: string | null } | null;
  error: unknown;
};

type UpdateRowsResult = {
  data: { id: string }[] | null;
  error: unknown;
};

type ArtworkReservationClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string
      ) => {
        maybeSingle: () => Promise<EditionResult>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string
      ) => {
        eq: (
          column: string,
          value: string
        ) => {
          select: (columns: string) => Promise<UpdateRowsResult>;
        };
      };
    };
  };
};

export type ReserveUniqueArtworksResult =
  | { ok: true; reservedArtworkIds: string[] }
  | {
      ok: false;
      failedArtworkId: string;
      reservedArtworkIds: string[];
      error?: unknown;
    };

export type ReleaseReservedArtworksResult = {
  releasedArtworkIds: string[];
  skippedArtworkIds: string[];
  errors?: { artworkId: string; error: unknown }[];
};

function uniqueIds(artworkIds: string[]) {
  return Array.from(new Set(artworkIds.filter(Boolean)));
}

async function rollbackReservedArtworks(
  supabase: ArtworkReservationClient,
  artworkIds: string[],
  now: string
) {
  for (const artworkId of artworkIds) {
    await supabase
      .from('artworks')
      .update({ status: 'available', updated_at: now })
      .eq('id', artworkId)
      .eq('status', 'reserved')
      .select('id');
  }
}

export async function reserveUniqueArtworksOrRollback(
  supabaseClient: unknown,
  artworkIds: string[],
  now: string
): Promise<ReserveUniqueArtworksResult> {
  const supabase = supabaseClient as ArtworkReservationClient;
  const reservedArtworkIds: string[] = [];

  for (const artworkId of uniqueIds(artworkIds)) {
    const { data: artworkEdition, error: editionError } = await supabase
      .from('artworks')
      .select('edition_type')
      .eq('id', artworkId)
      .maybeSingle();

    if (editionError) {
      await rollbackReservedArtworks(supabase, reservedArtworkIds, now);
      return { ok: false, failedArtworkId: artworkId, reservedArtworkIds, error: editionError };
    }

    if (artworkEdition?.edition_type !== 'unique') continue;

    const { data: reservedRows, error: reserveError } = await supabase
      .from('artworks')
      .update({ status: 'reserved' })
      .eq('id', artworkId)
      .eq('status', 'available')
      .select('id');

    if (reserveError || !reservedRows || reservedRows.length === 0) {
      await rollbackReservedArtworks(supabase, reservedArtworkIds, now);
      return { ok: false, failedArtworkId: artworkId, reservedArtworkIds, error: reserveError };
    }

    reservedArtworkIds.push(artworkId);
  }

  return { ok: true, reservedArtworkIds };
}

export async function releaseReservedArtworksIfUnowned(
  supabaseClient: unknown,
  artworkIds: string[],
  now: string
): Promise<ReleaseReservedArtworksResult> {
  const supabase = supabaseClient as ArtworkReservationClient;
  const releasedArtworkIds: string[] = [];
  const skippedArtworkIds: string[] = [];
  const errors: { artworkId: string; error: unknown }[] = [];

  for (const artworkId of uniqueIds(artworkIds)) {
    try {
      if (await hasActiveOrdersForArtworks(supabaseClient, [artworkId])) {
        skippedArtworkIds.push(artworkId);
        continue;
      }

      const { data: releasedRows, error: releaseError } = await supabase
        .from('artworks')
        .update({ status: 'available', updated_at: now })
        .eq('id', artworkId)
        .eq('status', 'reserved')
        .select('id');

      if (releaseError) {
        errors.push({ artworkId, error: releaseError });
        skippedArtworkIds.push(artworkId);
        continue;
      }

      if (releasedRows && releasedRows.length > 0) {
        releasedArtworkIds.push(artworkId);
      } else {
        skippedArtworkIds.push(artworkId);
      }
    } catch (error) {
      errors.push({ artworkId, error });
      skippedArtworkIds.push(artworkId);
    }
  }

  return errors.length > 0
    ? { releasedArtworkIds, skippedArtworkIds, errors }
    : { releasedArtworkIds, skippedArtworkIds };
}
