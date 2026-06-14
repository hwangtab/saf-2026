import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { OH_YOON_MEMORIAL_SLUG } from '@/content/events/oh-yoon-memorial';
import EventAdminClient, {
  type EventRegistrationRow,
  type SeatStatus,
} from './_components/EventAdminClient';

export const dynamic = 'force-dynamic';

export default async function EventAdminPage() {
  await requireAdmin();
  const db = createSupabaseAdminClient();

  const [{ data: seat }, { data: regs }, { data: ev }] = await Promise.all([
    db.rpc('event_seat_status', { p_slug: OH_YOON_MEMORIAL_SLUG }),
    db
      .from('event_registrations')
      .select(
        'id, applicant_name, phone, email, party_size, amount, status, payment_key, hold_expires_at, paid_at, created_at'
      )
      .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
      .order('created_at', { ascending: true }),
    db.from('events').select('capacity').eq('slug', OH_YOON_MEMORIAL_SLUG).maybeSingle(),
  ]);

  return (
    <EventAdminClient
      seat={(seat as unknown as SeatStatus) ?? null}
      registrations={(regs ?? []) as EventRegistrationRow[]}
      capacity={ev?.capacity ?? 44}
    />
  );
}
