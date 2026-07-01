import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeAdminTagInput, type AdminTagInput } from '@/lib/admin-artwork-tags';
import type { Database } from '@/types/supabase';

export type ArtworkAdminTagClient = SupabaseClient<Database>;

export type AdminTagRow = {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  archived_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ArtworkAdminTagLinkRow = {
  artwork_id: string;
  tag_id: string;
  admin_tags?: AdminTagRow | AdminTagRow[] | null;
};

export type AdminTagMutationInput = {
  input: AdminTagInput;
  adminId: string;
};

export type UpdateAdminTagMutationInput = AdminTagMutationInput & {
  id: string;
};

export type AdminTagMutationResult = {
  data: AdminTagRow;
  before?: AdminTagRow | null;
};

export type ArchiveAdminTagMutationInput = {
  id: string;
  adminId: string;
  now: string;
};

export type RestoreAdminTagMutationInput = {
  id: string;
  adminId: string;
};

export type DeleteAdminTagMutationResult = {
  tag: AdminTagRow;
  links: ArtworkAdminTagLinkRow[];
  artworkIds: string[];
  result: {
    success: true;
    tagId: string;
    artworkIds: string[];
    count: number;
  };
};

export type CreateAndAttachAdminTagInput = AdminTagMutationInput & {
  artworkId: string;
  now: string;
};

export type AddAdminTagToArtworksInput = {
  artworkIds: string[];
  tagId: string;
  adminId: string;
};

export type AddAdminTagToArtworksMutationResult = {
  tag: AdminTagRow;
  rows: Array<{ artwork_id: string; tag_id: string; created_by: string }>;
  result: { success: true; count: number };
};

export type RemoveAdminTagFromArtworksInput = {
  artworkIds: string[];
  tagId: string;
};

export type RemoveAdminTagFromArtworksMutationResult = {
  existing: ArtworkAdminTagLinkRow[];
  tagName: string;
  result: { success: true; count: number };
};

const ADMIN_TAG_COLUMNS = 'id, name, slug, color, description, archived_at, created_at, updated_at';
const ADMIN_TAG_BEFORE_COLUMNS = 'id, name, slug, color, description, archived_at, updated_at';

async function assertNoArchivedTagWithSlug(
  supabase: ArtworkAdminTagClient,
  slug: string,
  message: string
) {
  const { data: archivedMatch, error: archivedError } = await supabase
    .from('admin_tags')
    .select('id, name, archived_at')
    .eq('slug', slug)
    .not('archived_at', 'is', null)
    .maybeSingle();

  if (archivedError) throw archivedError;
  if (archivedMatch) {
    throw new Error(message);
  }
}

function uniqueArtworkIds(links: ArtworkAdminTagLinkRow[]) {
  return [...new Set(links.map((link) => link.artwork_id))];
}

function resolveExistingTagName(existing: ArtworkAdminTagLinkRow[], fallbackTagId: string) {
  const firstTag = Array.isArray(existing?.[0]?.admin_tags)
    ? existing?.[0]?.admin_tags[0]
    : existing?.[0]?.admin_tags;

  return firstTag?.name || fallbackTagId;
}

export async function listAdminTags(
  supabase: ArtworkAdminTagClient,
  { includeArchived = false }: { includeArchived?: boolean } = {}
): Promise<AdminTagRow[]> {
  let query = supabase
    .from('admin_tags')
    .select(ADMIN_TAG_COLUMNS)
    .order('name', { ascending: true });

  if (!includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AdminTagRow[];
}

export async function listArtworkAdminTags(
  supabase: ArtworkAdminTagClient,
  { artworkId }: { artworkId: string }
): Promise<AdminTagRow[]> {
  const { data, error } = await supabase
    .from('artwork_admin_tags')
    .select('admin_tags(id, name, slug, color, description, archived_at, created_at, updated_at)')
    .eq('artwork_id', artworkId);

  if (error) throw error;

  return ((data || []) as ArtworkAdminTagLinkRow[])
    .map((row) => (Array.isArray(row.admin_tags) ? row.admin_tags[0] : row.admin_tags))
    .filter((tag): tag is AdminTagRow => Boolean(tag))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export async function createAdminTagMutation(
  supabase: ArtworkAdminTagClient,
  { input, adminId }: AdminTagMutationInput
): Promise<AdminTagMutationResult> {
  const tag = normalizeAdminTagInput(input);

  await assertNoArchivedTagWithSlug(
    supabase,
    tag.slug,
    '보관 처리된 동일한 이름의 태그가 있습니다. 기존 태그를 수정해 주세요.'
  );

  const { data, error } = await supabase
    .from('admin_tags')
    .insert({
      ...tag,
      created_by: adminId,
      updated_by: adminId,
    })
    .select(ADMIN_TAG_COLUMNS)
    .single();

  if (error?.code === '23505') {
    throw new Error('이미 같은 이름의 태그가 있습니다.');
  }
  if (error) throw error;

  return { data: data as AdminTagRow };
}

export async function updateAdminTagMutation(
  supabase: ArtworkAdminTagClient,
  { id, input, adminId }: UpdateAdminTagMutationInput
): Promise<AdminTagMutationResult> {
  const tag = normalizeAdminTagInput(input);

  const { data: before } = await supabase
    .from('admin_tags')
    .select(ADMIN_TAG_BEFORE_COLUMNS)
    .eq('id', id)
    .single();

  if (before?.archived_at) {
    throw new Error('보관 처리된 태그는 수정할 수 없습니다.');
  }

  const { data, error } = await supabase
    .from('admin_tags')
    .update({
      ...tag,
      updated_by: adminId,
    })
    .eq('id', id)
    .is('archived_at', null)
    .select(ADMIN_TAG_COLUMNS)
    .single();

  if (error?.code === '23505') {
    throw new Error('이미 같은 이름의 태그가 있습니다.');
  }
  if (error) throw error;

  return { data: data as AdminTagRow, before: (before || null) as AdminTagRow | null };
}

export async function archiveAdminTagMutation(
  supabase: ArtworkAdminTagClient,
  { id, adminId, now }: ArchiveAdminTagMutationInput
): Promise<AdminTagMutationResult> {
  const { data: before } = await supabase
    .from('admin_tags')
    .select(ADMIN_TAG_BEFORE_COLUMNS)
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('admin_tags')
    .update({
      archived_at: now,
      updated_by: adminId,
    })
    .eq('id', id)
    .is('archived_at', null)
    .select(ADMIN_TAG_COLUMNS)
    .single();

  if (error) throw error;

  return { data: data as AdminTagRow, before: (before || null) as AdminTagRow | null };
}

export async function restoreAdminTagMutation(
  supabase: ArtworkAdminTagClient,
  { id, adminId }: RestoreAdminTagMutationInput
): Promise<AdminTagMutationResult> {
  const { data: before } = await supabase
    .from('admin_tags')
    .select(ADMIN_TAG_BEFORE_COLUMNS)
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('admin_tags')
    .update({
      archived_at: null,
      updated_by: adminId,
    })
    .eq('id', id)
    .not('archived_at', 'is', null)
    .select(ADMIN_TAG_COLUMNS)
    .single();

  if (error) throw error;

  return { data: data as AdminTagRow, before: (before || null) as AdminTagRow | null };
}

export async function deleteAdminTagMutation(
  supabase: ArtworkAdminTagClient,
  { id }: { id: string }
): Promise<DeleteAdminTagMutationResult> {
  const { data: tag, error: tagError } = await supabase
    .from('admin_tags')
    .select(ADMIN_TAG_COLUMNS)
    .eq('id', id)
    .single();

  if (tagError) throw tagError;

  const { data: links, error: linksError } = await supabase
    .from('artwork_admin_tags')
    .select('artwork_id, tag_id')
    .eq('tag_id', id);

  if (linksError) throw linksError;

  const linkRows = (links || []) as ArtworkAdminTagLinkRow[];
  const artworkIds = uniqueArtworkIds(linkRows);

  const { error } = await supabase.from('admin_tags').delete().eq('id', id);
  if (error) throw error;

  return {
    tag: tag as AdminTagRow,
    links: linkRows,
    artworkIds,
    result: { success: true, tagId: id, artworkIds, count: artworkIds.length },
  };
}

export async function createAndAttachAdminTagToArtworkMutation(
  supabase: ArtworkAdminTagClient,
  { artworkId, input, adminId, now }: CreateAndAttachAdminTagInput
): Promise<AdminTagMutationResult> {
  const tag = normalizeAdminTagInput(input);

  await assertNoArchivedTagWithSlug(
    supabase,
    tag.slug,
    '보관 처리된 동일한 이름의 태그가 있습니다. 기존 태그를 복원해 주세요.'
  );

  const { data: createdTag, error: createError } = await supabase
    .from('admin_tags')
    .insert({
      ...tag,
      created_by: adminId,
      updated_by: adminId,
    })
    .select(ADMIN_TAG_COLUMNS)
    .single();

  if (createError?.code === '23505') {
    throw new Error('이미 같은 이름의 태그가 있습니다.');
  }
  if (createError) throw createError;

  const { error: attachError } = await supabase.from('artwork_admin_tags').insert({
    artwork_id: artworkId,
    tag_id: createdTag.id,
    created_by: adminId,
  });

  if (attachError) {
    await supabase
      .from('admin_tags')
      .update({
        archived_at: now,
        updated_by: adminId,
      })
      .eq('id', createdTag.id);
    throw attachError;
  }

  return { data: createdTag as AdminTagRow };
}

export async function addAdminTagToArtworksMutation(
  supabase: ArtworkAdminTagClient,
  { artworkIds, tagId, adminId }: AddAdminTagToArtworksInput
): Promise<AddAdminTagToArtworksMutationResult> {
  const { data: tag, error: tagError } = await supabase
    .from('admin_tags')
    .select('id, name, archived_at')
    .eq('id', tagId)
    .single();

  if (tagError) throw tagError;
  if (tag.archived_at) {
    throw new Error('보관 처리된 태그는 추가할 수 없습니다.');
  }

  const rows = [...new Set(artworkIds)].map((artworkId) => ({
    artwork_id: artworkId,
    tag_id: tagId,
    created_by: adminId,
  }));

  const { error } = await supabase.from('artwork_admin_tags').upsert(rows, {
    onConflict: 'artwork_id,tag_id',
    ignoreDuplicates: true,
  });

  if (error) throw error;

  return {
    tag: tag as AdminTagRow,
    rows,
    result: { success: true, count: rows.length },
  };
}

export async function removeAdminTagFromArtworksMutation(
  supabase: ArtworkAdminTagClient,
  { artworkIds, tagId }: RemoveAdminTagFromArtworksInput
): Promise<RemoveAdminTagFromArtworksMutationResult> {
  const { data: existing, error: existingError } = await supabase
    .from('artwork_admin_tags')
    .select('artwork_id, tag_id, admin_tags(name)')
    .in('artwork_id', artworkIds)
    .eq('tag_id', tagId);

  if (existingError) throw existingError;

  const { error } = await supabase
    .from('artwork_admin_tags')
    .delete()
    .in('artwork_id', artworkIds)
    .eq('tag_id', tagId);

  if (error) throw error;

  const existingRows = (existing || []) as ArtworkAdminTagLinkRow[];

  return {
    existing: existingRows,
    tagName: resolveExistingTagName(existingRows, tagId),
    result: { success: true, count: existingRows.length },
  };
}
