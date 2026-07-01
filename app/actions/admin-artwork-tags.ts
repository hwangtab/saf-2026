'use server';

import { revalidatePath } from 'next/cache';

import type { AdminTagInput } from '@/lib/admin-artwork-tags';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import {
  addAdminTagToArtworksMutation,
  archiveAdminTagMutation,
  createAdminTagMutation,
  createAndAttachAdminTagToArtworkMutation,
  deleteAdminTagMutation,
  listAdminTags,
  listArtworkAdminTags,
  removeAdminTagFromArtworksMutation,
  restoreAdminTagMutation,
  updateAdminTagMutation,
} from '@/lib/artworks/admin-tags';
import { validateBatchSize } from '@/lib/utils/form-helpers';

import { logAdminAction } from './activity-log-writer';

export async function getAdminTags(includeArchived = false) {
  await requireAdmin();
  const supabase = await requireAdminClient();

  return listAdminTags(supabase, { includeArchived });
}

export async function getArtworkAdminTags(artworkId: string) {
  await requireAdmin();
  const supabase = await requireAdminClient();

  return listArtworkAdminTags(supabase, { artworkId });
}

export async function createAdminTag(input: AdminTagInput) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { data } = await createAdminTagMutation(supabase, {
    input,
    adminId: admin.id,
  });

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_created', 'admin_tag', data.id, { name: data.name }, admin.id, {
    summary: `관리자 태그 생성: ${data.name}`,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function updateAdminTag(id: string, input: AdminTagInput) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, before } = await updateAdminTagMutation(supabase, {
    id,
    input,
    adminId: admin.id,
  });

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_updated', 'admin_tag', id, { name: data.name }, admin.id, {
    summary: `관리자 태그 수정: ${data.name}`,
    beforeSnapshot: before || null,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function archiveAdminTag(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, before } = await archiveAdminTagMutation(supabase, {
    id,
    adminId: admin.id,
    now: new Date().toISOString(),
  });

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_archived', 'admin_tag', id, { name: data.name }, admin.id, {
    summary: `관리자 태그 보관: ${data.name}`,
    beforeSnapshot: before || null,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function restoreAdminTag(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, before } = await restoreAdminTagMutation(supabase, {
    id,
    adminId: admin.id,
  });

  revalidatePath('/admin/artworks');

  await logAdminAction('admin_tag_restored', 'admin_tag', id, { name: data.name }, admin.id, {
    summary: `관리자 태그 복원: ${data.name}`,
    beforeSnapshot: before || null,
    afterSnapshot: data,
    reversible: false,
  });

  return data;
}

export async function deleteAdminTag(id: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { tag, links, artworkIds, result } = await deleteAdminTagMutation(supabase, { id });

  revalidatePath('/admin/artworks');
  for (const artworkId of artworkIds) {
    revalidatePath(`/admin/artworks/${artworkId}`);
  }

  await logAdminAction(
    'admin_tag_deleted',
    'admin_tag',
    id,
    { name: tag.name, artwork_count: artworkIds.length },
    admin.id,
    {
      summary: `관리자 태그 영구 삭제: ${tag.name} (${artworkIds.length}개 작품 연결 제거)`,
      beforeSnapshot: { tag, links },
      afterSnapshot: null,
      reversible: false,
    }
  );

  return result;
}

export async function createAndAttachAdminTagToArtwork(artworkId: string, input: AdminTagInput) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { data: createdTag } = await createAndAttachAdminTagToArtworkMutation(supabase, {
    artworkId,
    input,
    adminId: admin.id,
    now: new Date().toISOString(),
  });

  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);

  await logAdminAction(
    'admin_tag_created_and_attached',
    'artwork',
    artworkId,
    { tag_id: createdTag.id, tag_name: createdTag.name },
    admin.id,
    {
      summary: `관리자 태그 생성 및 작품 추가: ${createdTag.name}`,
      afterSnapshot: { artwork_id: artworkId, tag: createdTag },
      reversible: false,
    }
  );

  return createdTag;
}

export async function addAdminTagToArtworks(artworkIds: string[], tagId: string) {
  if (artworkIds.length === 0) {
    return { success: true, count: 0 };
  }
  validateBatchSize(artworkIds);
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { tag, rows, result } = await addAdminTagToArtworksMutation(supabase, {
    artworkIds,
    tagId,
    adminId: admin.id,
  });

  revalidatePath('/admin/artworks');
  for (const artworkId of artworkIds) {
    revalidatePath(`/admin/artworks/${artworkId}`);
  }

  await logAdminAction(
    'artwork_admin_tag_added',
    'artwork',
    artworkIds.join(','),
    { count: rows.length, tag_id: tagId, tag_name: tag.name },
    admin.id,
    {
      summary: `작품 내부 태그 추가: ${tag.name} (${rows.length}건)`,
      afterSnapshot: { artwork_ids: artworkIds, tag },
      reversible: false,
    }
  );

  return result;
}

export async function removeAdminTagFromArtworks(artworkIds: string[], tagId: string) {
  if (artworkIds.length === 0) {
    return { success: true, count: 0 };
  }
  validateBatchSize(artworkIds);
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { existing, tagName, result } = await removeAdminTagFromArtworksMutation(supabase, {
    artworkIds,
    tagId,
  });

  revalidatePath('/admin/artworks');
  for (const artworkId of artworkIds) {
    revalidatePath(`/admin/artworks/${artworkId}`);
  }

  await logAdminAction(
    'artwork_admin_tag_removed',
    'artwork',
    artworkIds.join(','),
    { count: existing.length, tag_id: tagId, tag_name: tagName },
    admin.id,
    {
      summary: `작품 내부 태그 제거: ${tagName} (${existing.length}건)`,
      beforeSnapshot: { items: existing },
      reversible: false,
    }
  );

  return result;
}
