export interface AdminCounts {
  total: number;
  committee_total: number;
  region_top_count: number;
  recent_24h: number;
  is_active: boolean;
  deadline_at: string | null;
  goal: number;
}

export interface AdminRegionRow {
  region_top: string;
  count: number;
}

export interface AdminMessageRow {
  id: string;
  full_name: string;
  region_top: string;
  region_sub: string | null;
  message: string | null;
  message_public: boolean;
  is_masked: boolean;
  masked_at: string | null;
  created_at: string;
}

export interface AdminCommitteeRow {
  id: string;
  full_name: string;
  email: string;
  region_top: string;
  region_sub: string | null;
  created_at: string;
}

export interface AdminAuditRow {
  id: number;
  actor_id: string | null;
  actor_email: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: unknown;
  created_at: string;
}

export interface AdminBootstrap {
  counts: AdminCounts;
  regionBreakdown: AdminRegionRow[];
  messages: AdminMessageRow[];
  committee: AdminCommitteeRow[];
  audit: AdminAuditRow[];
}
