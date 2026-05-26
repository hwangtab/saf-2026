export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          actor_email: string | null;
          actor_id: string;
          actor_name: string | null;
          actor_role: string;
          after_snapshot: Json | null;
          before_snapshot: Json | null;
          created_at: string;
          id: string;
          metadata: Json | null;
          purge_note: string | null;
          purged_at: string | null;
          purged_by: string | null;
          request_id: string | null;
          reversible: boolean;
          revert_reason: string | null;
          reverted_at: string | null;
          reverted_by: string | null;
          reverted_log_id: string | null;
          summary: string | null;
          target_id: string;
          target_type: string;
          trash_expires_at: string | null;
        };
        Insert: {
          action: string;
          actor_email?: string | null;
          actor_id: string;
          actor_name?: string | null;
          actor_role: string;
          after_snapshot?: Json | null;
          before_snapshot?: Json | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          purge_note?: string | null;
          purged_at?: string | null;
          purged_by?: string | null;
          request_id?: string | null;
          reversible?: boolean;
          revert_reason?: string | null;
          reverted_at?: string | null;
          reverted_by?: string | null;
          reverted_log_id?: string | null;
          summary?: string | null;
          target_id: string;
          target_type: string;
          trash_expires_at?: string | null;
        };
        Update: {
          action?: string;
          actor_email?: string | null;
          actor_id?: string;
          actor_name?: string | null;
          actor_role?: string;
          after_snapshot?: Json | null;
          before_snapshot?: Json | null;
          created_at?: string;
          id?: string;
          metadata?: Json | null;
          purge_note?: string | null;
          purged_at?: string | null;
          purged_by?: string | null;
          request_id?: string | null;
          reversible?: boolean;
          revert_reason?: string | null;
          reverted_at?: string | null;
          reverted_by?: string | null;
          reverted_log_id?: string | null;
          summary?: string | null;
          target_id?: string;
          target_type?: string;
          trash_expires_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_logs_purged_by_fkey';
            columns: ['purged_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_logs: {
        Row: {
          action: string;
          admin_id: string | null;
          created_at: string | null;
          details: Json | null;
          id: string;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          action: string;
          admin_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          admin_id?: string | null;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_logs_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      artist_applications: {
        Row: {
          artist_name: string;
          bio: string;
          contact: string;
          created_at: string | null;
          privacy_accepted_at: string | null;
          privacy_version: string | null;
          referrer: string | null;
          terms_accepted_at: string | null;
          terms_accepted_ip: string | null;
          terms_accepted_user_agent: string | null;
          terms_version: string | null;
          tos_accepted_at: string | null;
          tos_version: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          artist_name: string;
          bio: string;
          contact: string;
          created_at?: string | null;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          referrer?: string | null;
          terms_accepted_at?: string | null;
          terms_accepted_ip?: string | null;
          terms_accepted_user_agent?: string | null;
          terms_version?: string | null;
          tos_accepted_at?: string | null;
          tos_version?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          artist_name?: string;
          bio?: string;
          contact?: string;
          created_at?: string | null;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          referrer?: string | null;
          terms_accepted_at?: string | null;
          terms_accepted_ip?: string | null;
          terms_accepted_user_agent?: string | null;
          terms_version?: string | null;
          tos_accepted_at?: string | null;
          tos_version?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'artist_applications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      artists: {
        Row: {
          bio: string | null;
          bio_en: string | null;
          career_tier: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          created_at: string | null;
          history: string | null;
          history_en: string | null;
          homepage: string | null;
          id: string;
          instagram: string | null;
          name_en: string | null;
          name_ko: string;
          notice_active_until: string | null;
          notice_enabled: boolean;
          notice_message: string | null;
          notice_message_en: string | null;
          notice_type: string | null;
          notice_updated_at: string | null;
          notice_updated_by: string | null;
          owner_id: string | null;
          profile_image: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          bio?: string | null;
          bio_en?: string | null;
          career_tier?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          history?: string | null;
          history_en?: string | null;
          homepage?: string | null;
          id?: string;
          instagram?: string | null;
          name_en?: string | null;
          name_ko: string;
          notice_active_until?: string | null;
          notice_enabled?: boolean;
          notice_message?: string | null;
          notice_message_en?: string | null;
          notice_type?: string | null;
          notice_updated_at?: string | null;
          notice_updated_by?: string | null;
          owner_id?: string | null;
          profile_image?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          bio?: string | null;
          bio_en?: string | null;
          career_tier?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          history?: string | null;
          history_en?: string | null;
          homepage?: string | null;
          id?: string;
          instagram?: string | null;
          name_en?: string | null;
          name_ko?: string;
          notice_active_until?: string | null;
          notice_enabled?: boolean;
          notice_message?: string | null;
          notice_message_en?: string | null;
          notice_type?: string | null;
          notice_updated_at?: string | null;
          notice_updated_by?: string | null;
          owner_id?: string | null;
          profile_image?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artists_notice_updated_by_fkey';
            columns: ['notice_updated_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artists_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      artwork_sales: {
        Row: {
          artwork_id: string;
          buyer_name: string | null;
          buyer_phone: string | null;
          created_at: string | null;
          external_order_id: string | null;
          external_order_item_code: string | null;
          external_payload: Json | null;
          id: string;
          import_batch_id: string | null;
          import_payload_hash: string | null;
          import_row_no: number | null;
          note: string | null;
          order_id: string | null;
          quantity: number;
          sale_price: number;
          sold_at: string;
          source: string;
          source_detail: string | null;
          void_reason: string | null;
          voided_at: string | null;
        };
        Insert: {
          artwork_id: string;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          created_at?: string | null;
          external_order_id?: string | null;
          external_order_item_code?: string | null;
          external_payload?: Json | null;
          id?: string;
          import_batch_id?: string | null;
          import_payload_hash?: string | null;
          import_row_no?: number | null;
          note?: string | null;
          order_id?: string | null;
          quantity?: number;
          sale_price: number;
          sold_at?: string;
          source?: string;
          source_detail?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Update: {
          artwork_id?: string;
          buyer_name?: string | null;
          buyer_phone?: string | null;
          created_at?: string | null;
          external_order_id?: string | null;
          external_order_item_code?: string | null;
          external_payload?: Json | null;
          id?: string;
          import_batch_id?: string | null;
          import_payload_hash?: string | null;
          import_row_no?: number | null;
          note?: string | null;
          order_id?: string | null;
          quantity?: number;
          sale_price?: number;
          sold_at?: string;
          source?: string;
          source_detail?: string | null;
          void_reason?: string | null;
          voided_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artwork_sales_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'artwork_sales_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      artworks: {
        Row: {
          admin_product_name: string | null;
          artist_id: string;
          category: string | null;
          created_at: string | null;
          description: string | null;
          description_en: string | null;
          edition: string | null;
          edition_limit: number | null;
          edition_type: Database['public']['Enums']['edition_type'] | null;
          id: string;
          images: string[] | null;
          is_hidden: boolean | null;
          material: string | null;
          price: string | null;
          quote: string | null;
          quote_en: string | null;
          shop_url: string | null;
          size: string | null;
          sold_at: string | null;
          status: Database['public']['Enums']['artwork_status'] | null;
          tax_type: string;
          title: string;
          title_en: string | null;
          tone: string[] | null;
          updated_at: string | null;
          year: string | null;
        };
        Insert: {
          admin_product_name?: string | null;
          artist_id: string;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          description_en?: string | null;
          edition?: string | null;
          edition_limit?: number | null;
          edition_type?: Database['public']['Enums']['edition_type'] | null;
          id?: string;
          images?: string[] | null;
          is_hidden?: boolean | null;
          material?: string | null;
          price?: string | null;
          quote?: string | null;
          quote_en?: string | null;
          shop_url?: string | null;
          size?: string | null;
          sold_at?: string | null;
          status?: Database['public']['Enums']['artwork_status'] | null;
          tax_type?: string;
          title: string;
          title_en?: string | null;
          tone?: string[] | null;
          updated_at?: string | null;
          year?: string | null;
        };
        Update: {
          admin_product_name?: string | null;
          artist_id?: string;
          category?: string | null;
          created_at?: string | null;
          description?: string | null;
          description_en?: string | null;
          edition?: string | null;
          edition_limit?: number | null;
          edition_type?: Database['public']['Enums']['edition_type'] | null;
          id?: string;
          images?: string[] | null;
          is_hidden?: boolean | null;
          material?: string | null;
          price?: string | null;
          quote?: string | null;
          quote_en?: string | null;
          shop_url?: string | null;
          size?: string | null;
          sold_at?: string | null;
          status?: Database['public']['Enums']['artwork_status'] | null;
          tax_type?: string;
          title?: string;
          title_en?: string | null;
          tone?: string[] | null;
          updated_at?: string | null;
          year?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'artworks_artist_id_fkey';
            columns: ['artist_id'];
            isOneToOne: false;
            referencedRelation: 'artists';
            referencedColumns: ['id'];
          },
        ];
      };
      exhibitor_applications: {
        Row: {
          bio: string;
          contact: string;
          created_at: string | null;
          privacy_accepted_at: string | null;
          privacy_version: string | null;
          referrer: string | null;
          representative_name: string;
          terms_accepted_at: string | null;
          terms_accepted_ip: string | null;
          terms_accepted_user_agent: string | null;
          terms_version: string | null;
          tos_accepted_at: string | null;
          tos_version: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          bio: string;
          contact: string;
          created_at?: string | null;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          referrer?: string | null;
          representative_name: string;
          terms_accepted_at?: string | null;
          terms_accepted_ip?: string | null;
          terms_accepted_user_agent?: string | null;
          terms_version?: string | null;
          tos_accepted_at?: string | null;
          tos_version?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          bio?: string;
          contact?: string;
          created_at?: string | null;
          privacy_accepted_at?: string | null;
          privacy_version?: string | null;
          referrer?: string | null;
          representative_name?: string;
          terms_accepted_at?: string | null;
          terms_accepted_ip?: string | null;
          terms_accepted_user_agent?: string | null;
          terms_version?: string | null;
          tos_accepted_at?: string | null;
          tos_version?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exhibitor_applications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      faq: {
        Row: {
          answer: string;
          answer_en: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          question: string;
          question_en: string | null;
        };
        Insert: {
          answer: string;
          answer_en?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          question: string;
          question_en?: string | null;
        };
        Update: {
          answer?: string;
          answer_en?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          question?: string;
          question_en?: string | null;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          admin_note: string | null;
          category: string;
          created_at: string;
          description: string;
          id: string;
          page_url: string | null;
          resolved_at: string | null;
          status: string;
          title: string;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          category: string;
          created_at?: string;
          description: string;
          id?: string;
          page_url?: string | null;
          resolved_at?: string | null;
          status?: string;
          title: string;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          page_url?: string | null;
          resolved_at?: string | null;
          status?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      gsc_metrics: {
        Row: {
          clicks: number;
          ctr: number;
          date: string;
          fetched_at: string;
          id: number;
          impressions: number;
          page: string | null;
          position: number;
          query: string | null;
        };
        Insert: {
          clicks?: number;
          ctr?: number;
          date: string;
          fetched_at?: string;
          id?: never;
          impressions?: number;
          page?: string | null;
          position?: number;
          query?: string | null;
        };
        Update: {
          clicks?: number;
          ctr?: number;
          date?: string;
          fetched_at?: string;
          id?: never;
          impressions?: number;
          page?: string | null;
          position?: number;
          query?: string | null;
        };
        Relationships: [];
      };
      news: {
        Row: {
          created_at: string | null;
          date: string | null;
          description: string | null;
          description_en: string | null;
          id: string;
          link: string | null;
          source: string | null;
          thumbnail: string | null;
          title: string;
          title_en: string | null;
        };
        Insert: {
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          description_en?: string | null;
          id: string;
          link?: string | null;
          source?: string | null;
          thumbnail?: string | null;
          title: string;
          title_en?: string | null;
        };
        Update: {
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          description_en?: string | null;
          id?: string;
          link?: string | null;
          source?: string | null;
          thumbnail?: string | null;
          title?: string;
          title_en?: string | null;
        };
        Relationships: [];
      };
      order_admin_notes: {
        Row: {
          note: string | null;
          order_id: string;
          updated_at: string | null;
        };
        Insert: {
          note?: string | null;
          order_id: string;
          updated_at?: string | null;
        };
        Update: {
          note?: string | null;
          order_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'order_admin_notes_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: true;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          artwork_id: string;
          buyer_email: string;
          buyer_name: string;
          buyer_phone: string;
          buyer_user_id: string | null;
          cancelled_at: string | null;
          created_at: string;
          escalated_at: string | null;
          id: string;
          item_amount: number;
          metadata: Json | null;
          note: string | null;
          order_no: string;
          paid_at: string | null;
          quantity: number;
          refunded_at: string | null;
          shipping_address: string;
          shipping_address_detail: string | null;
          shipping_amount: number;
          shipping_carrier: string | null;
          shipping_memo: string | null;
          shipping_name: string;
          shipping_phone: string;
          shipping_postal_code: string;
          status: string;
          total_amount: number;
          tracking_number: string | null;
          updated_at: string;
        };
        Insert: {
          artwork_id: string;
          buyer_email: string;
          buyer_name: string;
          buyer_phone: string;
          buyer_user_id?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          escalated_at?: string | null;
          id?: string;
          item_amount: number;
          metadata?: Json | null;
          note?: string | null;
          order_no: string;
          paid_at?: string | null;
          quantity?: number;
          refunded_at?: string | null;
          shipping_address: string;
          shipping_address_detail?: string | null;
          shipping_amount?: number;
          shipping_carrier?: string | null;
          shipping_memo?: string | null;
          shipping_name: string;
          shipping_phone: string;
          shipping_postal_code: string;
          status?: string;
          total_amount: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Update: {
          artwork_id?: string;
          buyer_email?: string;
          buyer_name?: string;
          buyer_phone?: string;
          buyer_user_id?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          escalated_at?: string | null;
          id?: string;
          item_amount?: number;
          metadata?: Json | null;
          note?: string | null;
          order_no?: string;
          paid_at?: string | null;
          quantity?: number;
          refunded_at?: string | null;
          shipping_address?: string;
          shipping_address_detail?: string | null;
          shipping_amount?: number;
          shipping_carrier?: string | null;
          shipping_memo?: string | null;
          shipping_name?: string;
          shipping_phone?: string;
          shipping_postal_code?: string;
          status?: string;
          total_amount?: number;
          tracking_number?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_artwork_id_fkey';
            columns: ['artwork_id'];
            isOneToOne: false;
            referencedRelation: 'artworks';
            referencedColumns: ['id'];
          },
        ];
      };
      page_views: {
        Row: {
          city: string | null;
          client_name: string | null;
          country: string | null;
          created_at: string;
          device_id: string | null;
          device_type: string | null;
          event_data: Json | null;
          event_name: string | null;
          event_timestamp: string;
          event_type: string;
          id: number;
          os_name: string | null;
          path: string;
          query_params: string | null;
          referrer: string | null;
          region: string | null;
          route: string | null;
          session_id: string | null;
        };
        Insert: {
          city?: string | null;
          client_name?: string | null;
          country?: string | null;
          created_at?: string;
          device_id?: string | null;
          device_type?: string | null;
          event_data?: Json | null;
          event_name?: string | null;
          event_timestamp: string;
          event_type?: string;
          id?: never;
          os_name?: string | null;
          path: string;
          query_params?: string | null;
          referrer?: string | null;
          region?: string | null;
          route?: string | null;
          session_id?: string | null;
        };
        Update: {
          city?: string | null;
          client_name?: string | null;
          country?: string | null;
          created_at?: string;
          device_id?: string | null;
          device_type?: string | null;
          event_data?: Json | null;
          event_name?: string | null;
          event_timestamp?: string;
          event_type?: string;
          id?: never;
          os_name?: string | null;
          path?: string;
          query_params?: string | null;
          referrer?: string | null;
          region?: string | null;
          route?: string | null;
          session_id?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          approved_at: string | null;
          cancelled_at: string | null;
          confirm_response: Json | null;
          created_at: string;
          currency: string;
          id: string;
          idempotency_key: string | null;
          method: string | null;
          method_detail: Json | null;
          order_id: string;
          payment_key: string;
          status: string;
          toss_order_id: string;
          updated_at: string;
          webhook_responses: Json[] | null;
        };
        Insert: {
          amount: number;
          approved_at?: string | null;
          cancelled_at?: string | null;
          confirm_response?: Json | null;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string | null;
          method?: string | null;
          method_detail?: Json | null;
          order_id: string;
          payment_key: string;
          status?: string;
          toss_order_id: string;
          updated_at?: string;
          webhook_responses?: Json[] | null;
        };
        Update: {
          amount?: number;
          approved_at?: string | null;
          cancelled_at?: string | null;
          confirm_response?: Json | null;
          created_at?: string;
          currency?: string;
          id?: string;
          idempotency_key?: string | null;
          method?: string | null;
          method_detail?: Json | null;
          order_id?: string;
          payment_key?: string;
          status?: string;
          toss_order_id?: string;
          updated_at?: string;
          webhook_responses?: Json[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      petition_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: Json;
          id: number;
          ip_hash: string | null;
          petition_slug: string;
          target_id: string | null;
          target_type: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: number;
          ip_hash?: string | null;
          petition_slug: string;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: Json;
          id?: number;
          ip_hash?: string | null;
          petition_slug?: string;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [];
      };
      petition_signatures: {
        Row: {
          agreed_overseas: boolean | null;
          agreed_petition: boolean;
          agreed_privacy: boolean;
          created_at: string;
          email: string;
          email_hash: string;
          full_name: string;
          id: string;
          ip_hash: string | null;
          is_committee: boolean;
          is_masked: boolean;
          masked_at: string | null;
          masked_by: string | null;
          message: string | null;
          message_public: boolean;
          petition_slug: string;
          phone: string | null;
          region_sub: string | null;
          region_top: string;
          user_agent: string | null;
        };
        Insert: {
          agreed_overseas?: boolean | null;
          agreed_petition: boolean;
          agreed_privacy: boolean;
          created_at?: string;
          email: string;
          email_hash: string;
          full_name: string;
          id?: string;
          ip_hash?: string | null;
          is_committee?: boolean;
          is_masked?: boolean;
          masked_at?: string | null;
          masked_by?: string | null;
          message?: string | null;
          message_public?: boolean;
          petition_slug: string;
          phone?: string | null;
          region_sub?: string | null;
          region_top: string;
          user_agent?: string | null;
        };
        Update: {
          agreed_overseas?: boolean | null;
          agreed_petition?: boolean;
          agreed_privacy?: boolean;
          created_at?: string;
          email?: string;
          email_hash?: string;
          full_name?: string;
          id?: string;
          ip_hash?: string | null;
          is_committee?: boolean;
          is_masked?: boolean;
          masked_at?: string | null;
          masked_by?: string | null;
          message?: string | null;
          message_public?: boolean;
          petition_slug?: string;
          phone?: string | null;
          region_sub?: string | null;
          region_top?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'petition_signatures_petition_slug_fkey';
            columns: ['petition_slug'];
            isOneToOne: false;
            referencedRelation: 'petition_counts';
            referencedColumns: ['petition_slug'];
          },
          {
            foreignKeyName: 'petition_signatures_petition_slug_fkey';
            columns: ['petition_slug'];
            isOneToOne: false;
            referencedRelation: 'petitions';
            referencedColumns: ['slug'];
          },
        ];
      };
      petition_snapshot: {
        Row: {
          committee_total: number;
          petition_slug: string;
          region_breakdown: Json;
          region_top_count: number;
          taken_at: string;
          total: number;
        };
        Insert: {
          committee_total: number;
          petition_slug: string;
          region_breakdown?: Json;
          region_top_count: number;
          taken_at?: string;
          total: number;
        };
        Update: {
          committee_total?: number;
          petition_slug?: string;
          region_breakdown?: Json;
          region_top_count?: number;
          taken_at?: string;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'petition_snapshot_petition_slug_fkey';
            columns: ['petition_slug'];
            isOneToOne: true;
            referencedRelation: 'petition_counts';
            referencedColumns: ['petition_slug'];
          },
          {
            foreignKeyName: 'petition_snapshot_petition_slug_fkey';
            columns: ['petition_slug'];
            isOneToOne: true;
            referencedRelation: 'petitions';
            referencedColumns: ['slug'];
          },
        ];
      };
      petitions: {
        Row: {
          closed_at: string | null;
          committee_total: number;
          created_at: string;
          deadline_at: string;
          goal: number;
          is_active: boolean;
          signature_total: number;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          closed_at?: string | null;
          committee_total?: number;
          created_at?: string;
          deadline_at: string;
          goal?: number;
          is_active?: boolean;
          signature_total?: number;
          slug: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          committee_total?: number;
          created_at?: string;
          deadline_at?: string;
          goal?: number;
          is_active?: boolean;
          signature_total?: number;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          name: string | null;
          role: Database['public']['Enums']['user_role'] | null;
          status: Database['public']['Enums']['user_status'] | null;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          id: string;
          name?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          status?: Database['public']['Enums']['user_status'] | null;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string | null;
          role?: Database['public']['Enums']['user_role'] | null;
          status?: Database['public']['Enums']['user_status'] | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      rate_limit_counters: {
        Row: {
          count: number;
          key: string;
          updated_at: string;
          window_ms: number;
          window_started_at: string;
        };
        Insert: {
          count: number;
          key: string;
          updated_at?: string;
          window_ms: number;
          window_started_at?: string;
        };
        Update: {
          count?: number;
          key?: string;
          updated_at?: string;
          window_ms?: number;
          window_started_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          author: string;
          author_en: string | null;
          comment: string;
          comment_en: string | null;
          created_at: string | null;
          date: string;
          id: string;
          rating: number;
          role: string | null;
          role_en: string | null;
        };
        Insert: {
          author: string;
          author_en?: string | null;
          comment: string;
          comment_en?: string | null;
          created_at?: string | null;
          date: string;
          id?: string;
          rating: number;
          role?: string | null;
          role_en?: string | null;
        };
        Update: {
          author?: string;
          author_en?: string | null;
          comment?: string;
          comment_en?: string | null;
          created_at?: string | null;
          date?: string;
          id?: string;
          rating?: number;
          role?: string | null;
          role_en?: string | null;
        };
        Relationships: [];
      };
      stories: {
        Row: {
          author: string | null;
          body: string;
          body_en: string | null;
          category: string;
          created_at: string | null;
          display_order: number | null;
          excerpt: string | null;
          excerpt_en: string | null;
          id: string;
          is_published: boolean | null;
          published_at: string;
          slug: string;
          tags: string[] | null;
          thumbnail: string | null;
          title: string;
          title_en: string | null;
          updated_at: string | null;
        };
        Insert: {
          author?: string | null;
          body?: string;
          body_en?: string | null;
          category?: string;
          created_at?: string | null;
          display_order?: number | null;
          excerpt?: string | null;
          excerpt_en?: string | null;
          id?: string;
          is_published?: boolean | null;
          published_at?: string;
          slug: string;
          tags?: string[] | null;
          thumbnail?: string | null;
          title: string;
          title_en?: string | null;
          updated_at?: string | null;
        };
        Update: {
          author?: string | null;
          body?: string;
          body_en?: string | null;
          category?: string;
          created_at?: string | null;
          display_order?: number | null;
          excerpt?: string | null;
          excerpt_en?: string | null;
          id?: string;
          is_published?: boolean | null;
          published_at?: string;
          slug?: string;
          tags?: string[] | null;
          thumbnail?: string | null;
          title?: string;
          title_en?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      testimonials: {
        Row: {
          author: string;
          author_en: string | null;
          category: string;
          category_en: string | null;
          context: string | null;
          context_en: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          quote: string;
          quote_en: string | null;
        };
        Insert: {
          author: string;
          author_en?: string | null;
          category: string;
          category_en?: string | null;
          context?: string | null;
          context_en?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          quote: string;
          quote_en?: string | null;
        };
        Update: {
          author?: string;
          author_en?: string | null;
          category?: string;
          category_en?: string | null;
          context?: string | null;
          context_en?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          quote?: string;
          quote_en?: string | null;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          created_at: string | null;
          description: string | null;
          description_en: string | null;
          id: string;
          thumbnail: string | null;
          title: string;
          title_en: string | null;
          transcript: string | null;
          youtube_id: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          description_en?: string | null;
          id: string;
          thumbnail?: string | null;
          title: string;
          title_en?: string | null;
          transcript?: string | null;
          youtube_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          description_en?: string | null;
          id?: string;
          thumbnail?: string | null;
          title?: string;
          title_en?: string | null;
          transcript?: string | null;
          youtube_id?: string;
        };
        Relationships: [];
      };
      wishlists: {
        Row: {
          artwork_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          artwork_id: string;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          artwork_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      petition_counts: {
        Row: {
          committee_total: number | null;
          deadline_at: string | null;
          goal: number | null;
          is_active: boolean | null;
          petition_slug: string | null;
          recent_24h: number | null;
          region_top_count: number | null;
          title: string | null;
          total: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      check_artwork_availability: {
        Args: { p_artwork_id: string; p_exclude_order_id?: string };
        Returns: {
          artwork_edition_limit: number;
          artwork_edition_type: string;
          is_available: boolean;
          pending_count: number;
          sold_count: number;
        }[];
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_ms: number };
        Returns: {
          remaining: number;
          success: boolean;
        }[];
      };
      close_petition: { Args: { p_slug: string }; Returns: Json };
      close_petitions_due: { Args: never; Returns: Json };
      execute_sql: { Args: { sql: string }; Returns: undefined };
      extract_query_param: {
        Args: { key: string; qs: string };
        Returns: string;
      };
      get_artist_commerce_dashboard: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          artist_id: string;
          artist_name: string;
          artwork_count: number;
          orders_paid: number;
          total_revenue: number;
          total_views: number;
          unique_visitors: number;
          view_to_paid_rate: number;
        }[];
      };
      get_commerce_funnel_summary: {
        Args: { since_ts: string };
        Returns: {
          artwork_views: number;
          checkout_views: number;
          orders_created: number;
          orders_paid: number;
          total_revenue: number;
          unique_artwork_visitors: number;
          unique_checkout_visitors: number;
        }[];
      };
      get_cross_link_summary: {
        Args: { since_ts: string };
        Returns: {
          artwork_to_story_clicks: number;
          artwork_to_story_visitors: number;
          story_to_artwork_clicks: number;
          story_to_artwork_visitors: number;
        }[];
      };
      get_gsc_daily_trend: {
        Args: { since_date: string };
        Returns: {
          avg_position: number;
          clicks: number;
          ctr: number;
          day: string;
          impressions: number;
        }[];
      };
      get_gsc_low_ctr_queries: {
        Args: { lim?: number; min_impressions?: number; since_date: string };
        Returns: {
          avg_position: number;
          clicks: number;
          ctr: number;
          impressions: number;
          query: string;
        }[];
      };
      get_gsc_sync_status: {
        Args: never;
        Returns: {
          last_fetched: string;
          latest_date: string;
          oldest_date: string;
          total_rows: number;
        }[];
      };
      get_gsc_top_pages: {
        Args: { lim?: number; since_date: string };
        Returns: {
          avg_position: number;
          clicks: number;
          ctr: number;
          impressions: number;
          page: string;
        }[];
      };
      get_gsc_top_queries: {
        Args: { lim?: number; since_date: string };
        Returns: {
          avg_position: number;
          clicks: number;
          ctr: number;
          impressions: number;
          query: string;
        }[];
      };
      get_locale_switch_pages: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          en_to_ko: number;
          ko_to_en: number;
          page_path: string;
          total: number;
        }[];
      };
      get_locale_switch_summary: {
        Args: { since_ts: string };
        Returns: {
          en_to_ko_switches: number;
          ko_to_en_switches: number;
          total_switches: number;
          unique_switchers: number;
        }[];
      };
      get_member_join_click_daily: {
        Args: { since_ts: string };
        Returns: {
          clicks: number;
          day: string;
          unique_clickers: number;
        }[];
      };
      get_member_join_click_position_distribution: {
        Args: { since_ts: string };
        Returns: {
          clicks: number;
          position_name: string;
          unique_clickers: number;
        }[];
      };
      get_member_join_click_summary: {
        Args: { since_ts: string };
        Returns: {
          total_clicks: number;
          unique_clickers: number;
        }[];
      };
      get_my_role: { Args: never; Returns: string };
      get_my_status: { Args: never; Returns: string };
      get_petition_duplicate_signatures: {
        Args: {
          p_limit?: number;
          p_offset?: number;
          p_search?: string;
          p_slug: string;
        };
        Returns: {
          rows: Json;
          total: number;
        }[];
      };
      get_petition_region_breakdown: {
        Args: { p_slug: string };
        Returns: {
          count: number;
          region_top: string;
        }[];
      };
      get_purchase_click_summary: {
        Args: { since_ts: string };
        Returns: {
          distinct_artworks: number;
          external_clicks: number;
          legacy_clicks: number;
          toss_clicks: number;
          total_clicks: number;
          unique_clickers: number;
        }[];
      };
      get_pv_browser_distribution: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          browser: string;
          count: number;
        }[];
      };
      get_pv_country_distribution: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          country: string;
          views: number;
          visitors: number;
        }[];
      };
      get_pv_daily_trend: {
        Args: { since_ts: string };
        Returns: {
          day: string;
          views: number;
          visitors: number;
        }[];
      };
      get_pv_device_distribution: {
        Args: { since_ts: string };
        Returns: {
          count: number;
          device_type: string;
        }[];
      };
      get_pv_hourly_distribution: {
        Args: { since_ts: string };
        Returns: {
          hour: number;
          views: number;
          visitors: number;
        }[];
      };
      get_pv_os_distribution: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          count: number;
          os: string;
        }[];
      };
      get_pv_realtime_visitors: {
        Args: { minutes?: number };
        Returns: {
          active_pageviews: number;
          active_visitors: number;
        }[];
      };
      get_pv_session_depth: {
        Args: { since_ts: string };
        Returns: {
          avg_pages_per_session: number;
          median_pages_per_session: number;
          total_pageviews: number;
          total_sessions: number;
        }[];
      };
      get_pv_summary: {
        Args: { since_ts: string };
        Returns: {
          total_views: number;
          unique_visitors: number;
        }[];
      };
      get_pv_top_exit_pages: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          exit_count: number;
          exit_rate: number;
          path: string;
          total_views: number;
        }[];
      };
      get_pv_top_pages: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          path: string;
          views: number;
          visitors: number;
        }[];
      };
      get_pv_top_referrers: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          count: number;
          referrer: string;
        }[];
      };
      get_pv_utm_distribution: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          utm_campaign: string;
          utm_medium: string;
          utm_source: string;
          views: number;
          visitors: number;
        }[];
      };
      get_pv_visitor_recurrence: {
        Args: { since_ts: string };
        Returns: {
          new_visitor_pageviews: number;
          new_visitors: number;
          returning_visitor_pageviews: number;
          returning_visitors: number;
        }[];
      };
      get_revenue_daily_trend: {
        Args: { since_ts: string };
        Returns: {
          day: string;
          orders_paid: number;
          revenue: number;
        }[];
      };
      get_share_click_channel_distribution: {
        Args: { since_ts: string };
        Returns: {
          channel: string;
          clicks: number;
          unique_clickers: number;
        }[];
      };
      get_share_click_summary: {
        Args: { since_ts: string };
        Returns: {
          total_clicks: number;
          unique_clickers: number;
        }[];
      };
      get_story_attributed_revenue: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          attributed_orders_paid: number;
          attributed_revenue: number;
          story_slug: string;
          total_clicks: number;
          unique_clickers: number;
        }[];
      };
      get_story_to_artwork_position_distribution: {
        Args: { since_ts: string };
        Returns: {
          card_position: number;
          clicks: number;
        }[];
      };
      get_story_to_artwork_source_distribution: {
        Args: { since_ts: string };
        Returns: {
          clicks: number;
          source: string;
          visitors: number;
        }[];
      };
      get_top_artwork_funnel: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          artwork_id: string;
          checkout_to_paid_rate: number;
          checkout_views: number;
          orders_created: number;
          orders_paid: number;
          revenue: number;
          unique_visitors: number;
          view_to_checkout_rate: number;
          views: number;
        }[];
      };
      get_top_artwork_to_story_artworks: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          artist: string;
          artwork_id: string;
          clicks: number;
          visitors: number;
        }[];
      };
      get_top_clicked_artworks_from_stories: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          artist: string;
          artwork_id: string;
          clicks: number;
          visitors: number;
        }[];
      };
      get_top_converting_stories: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          clicks: number;
          story_slug: string;
          visitors: number;
        }[];
      };
      get_top_purchase_clicked_artworks: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          artist: string;
          artwork_id: string;
          artwork_title: string;
          clicks: number;
          external_clicks: number;
          toss_clicks: number;
          unique_clickers: number;
        }[];
      };
      get_top_shared_pages: {
        Args: { lim?: number; since_ts: string };
        Returns: {
          clicks: number;
          page_path: string;
          unique_clickers: number;
        }[];
      };
      get_web_vitals_daily_p75: {
        Args: { since_ts: string };
        Returns: {
          day: string;
          good_rate: number;
          metric_name: string;
          p75_value: number;
          sample_size: number;
        }[];
      };
      get_web_vitals_regression_count: {
        Args: { min_sample_size?: number; since_ts: string };
        Returns: number;
      };
      get_web_vitals_regressions: {
        Args: { min_sample_size?: number; since_ts: string };
        Returns: {
          metric_name: string;
          p75_value: number;
          page_path: string;
          poor_ratio: number;
          poor_threshold: number;
          sample_size: number;
        }[];
      };
      get_web_vitals_summary: {
        Args: { since_ts: string };
        Returns: {
          avg_value: number;
          good_count: number;
          median_value: number;
          metric_name: string;
          needs_improvement_count: number;
          p75_value: number;
          poor_count: number;
          total_events: number;
        }[];
      };
      get_web_vitals_worst_cls_targets: {
        Args: { days_back?: number; lim?: number; min_samples?: number };
        Returns: {
          p75: number;
          page_path: string;
          poor_rate: number;
          samples: number;
          shift_target: string;
        }[];
      };
      get_web_vitals_worst_pages: {
        Args: { lim?: number; since_ts: string; target_metric: string };
        Returns: {
          p75_value: number;
          page_path: string;
          poor_count: number;
          sample_size: number;
        }[];
      };
      hash_email: { Args: { p_email: string; p_salt: string }; Returns: string };
      hash_ip: { Args: { p_ip: string; p_salt: string }; Returns: string };
      is_paid_status: { Args: { s: string }; Returns: boolean };
      is_test_buyer_email: { Args: { email: string }; Returns: boolean };
      log_petition_audit: {
        Args: {
          p_action: string;
          p_actor_id?: string;
          p_details?: Json;
          p_ip_hash?: string;
          p_slug: string;
          p_target_id: string;
          p_target_type: string;
        };
        Returns: number;
      };
      parse_artwork_price: { Args: { price_text: string }; Returns: number };
      purge_petition_pii: {
        Args: { p_days?: number; p_slug: string };
        Returns: Json;
      };
      purge_petitions_expired: { Args: never; Returns: Json };
      sign_petition: { Args: { p_payload: Json }; Returns: Json };
    };
    Enums: {
      artwork_status: 'available' | 'sold' | 'reserved' | 'hidden';
      edition_type: 'unique' | 'limited' | 'open';
      user_role: 'admin' | 'artist' | 'user' | 'exhibitor';
      user_status: 'pending' | 'active' | 'suspended';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      artwork_status: ['available', 'sold', 'reserved', 'hidden'],
      edition_type: ['unique', 'limited', 'open'],
      user_role: ['admin', 'artist', 'user', 'exhibitor'],
      user_status: ['pending', 'active', 'suspended'],
    },
  },
} as const;
