'use server';

import { revalidatePath } from 'next/cache';

import { validateSaleInput } from '@/lib/actions/artwork-validation';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import {
  listArtworkSales,
  recordManualArtworkSale,
  updateManualArtworkSale,
  voidManualArtworkSale,
} from '@/lib/artworks/sales';
import { getString } from '@/lib/utils/form-helpers';
import {
  revalidatePublicArtworkDetails,
  revalidatePublicArtworkSurfaces,
} from '@/lib/utils/revalidate';

import { logAdminAction } from './activity-log-writer';

export async function getArtworkSales(artworkId: string) {
  await requireAdmin();
  const supabase = await requireAdminClient();

  return listArtworkSales(supabase, artworkId);
}

export async function recordArtworkSale(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const artworkId = getString(formData, 'artwork_id');
  const salePriceRaw = getString(formData, 'sale_price');
  const quantityRaw = getString(formData, 'quantity') || '1';
  const buyerName = getString(formData, 'buyer_name');
  const buyerPhone = getString(formData, 'buyer_phone');
  const note = getString(formData, 'note');
  const soldAt = getString(formData, 'sold_at') || new Date().toISOString();

  if (!artworkId || !salePriceRaw) {
    throw new Error('필수 정보가 누락되었습니다.');
  }

  const validationError = validateSaleInput(salePriceRaw, quantityRaw || '1');
  if (validationError) throw new Error(validationError);

  const salePrice = Number(salePriceRaw);
  const quantity = Number(quantityRaw);

  const saleResult = await recordManualArtworkSale(supabase, {
    artworkId,
    salePrice,
    quantity,
    buyerName,
    buyerPhone,
    note,
    soldAt,
  });

  await logAdminAction(
    'artwork_sold',
    'artwork',
    artworkId,
    {
      title: saleResult.artworkTitle,
      sale_price: salePrice,
      quantity,
      buyer_name: buyerName,
      buyer_phone: buyerPhone ? '[set]' : null,
    },
    admin.id,
    {
      summary: `작품 판매 기록: ${saleResult.artworkTitle} (${quantity}점)`,
      beforeSnapshot: null,
      afterSnapshot: null,
      reversible: true,
    }
  );

  revalidatePublicArtworkDetails([artworkId]);
  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);

  return { success: true };
}

export async function updateArtworkSale(formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const saleId = getString(formData, 'sale_id');
  const artworkId = getString(formData, 'artwork_id');
  const salePriceRaw = getString(formData, 'sale_price');
  const quantityRaw = getString(formData, 'quantity') || '1';
  const buyerName = getString(formData, 'buyer_name');
  const buyerPhone = getString(formData, 'buyer_phone');
  const note = getString(formData, 'note');
  const soldAt = getString(formData, 'sold_at');

  if (!saleId || !artworkId || !salePriceRaw) {
    throw new Error('필수 정보가 누락되었습니다.');
  }

  const validationError = validateSaleInput(salePriceRaw, quantityRaw);
  if (validationError) throw new Error(validationError);

  const salePrice = Number(salePriceRaw);
  const quantity = Number(quantityRaw);
  const saleResult = await updateManualArtworkSale(supabase, {
    saleId,
    artworkId,
    salePrice,
    quantity,
    buyerName,
    buyerPhone,
    note,
    soldAt,
  });

  await logAdminAction(
    'artwork_sale_updated',
    'artwork',
    artworkId,
    { title: saleResult.artworkTitle, sale_id: saleId },
    admin.id,
    {
      summary: `판매 기록 수정: ${saleResult.artworkTitle}`,
      beforeSnapshot: {
        sale_price: saleResult.existingSale.sale_price,
        quantity: saleResult.existingSale.quantity,
        buyer_name: saleResult.existingSale.buyer_name,
      },
      afterSnapshot: { sale_price: salePrice, quantity, buyer_name: buyerName },
      reversible: true,
    }
  );

  revalidatePublicArtworkDetails([artworkId]);
  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);
  revalidatePath('/admin/buyers');
  revalidatePath('/admin/revenue');
  revalidatePath('/admin/artist-sales');

  return { success: true };
}

export async function voidArtworkSale(saleId: string, reason: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  if (!saleId) throw new Error('판매 기록 ID가 필요합니다.');
  if (!reason.trim()) throw new Error('취소 사유를 입력해 주세요.');

  const saleResult = await voidManualArtworkSale(supabase, {
    saleId,
    reason: reason.trim(),
    now: new Date().toISOString(),
  });
  const artworkId = saleResult.artworkId;

  await logAdminAction(
    'artwork_sale_voided',
    'artwork',
    artworkId,
    {
      title: saleResult.artworkTitle,
      sale_id: saleId,
      reason,
      source: saleResult.existingSale.source,
    },
    admin.id,
    {
      summary: `판매 취소: ${saleResult.artworkTitle || artworkId} (${saleResult.existingSale.quantity}점, ${saleResult.existingSale.buyer_name || '구매자 미상'})`,
      beforeSnapshot: {
        sale_price: saleResult.existingSale.sale_price,
        quantity: saleResult.existingSale.quantity,
        buyer_name: saleResult.existingSale.buyer_name,
      },
      afterSnapshot: null,
      reversible: false,
    }
  );

  revalidatePublicArtworkDetails([artworkId]);
  revalidatePublicArtworkSurfaces();
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${artworkId}`);
  revalidatePath('/admin/buyers');
  revalidatePath('/admin/revenue');
  revalidatePath('/admin/artist-sales');

  return { success: true };
}
