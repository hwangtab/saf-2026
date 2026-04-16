export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
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
          owner_id: string | null;
          profile_image: string | null;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          bio?: string | null;
          bio_en?: string | null;
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
          owner_id?: string | null;
          profile_image?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          bio?: string | null;
          bio_en?: string | null;
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
          owner_id?: string | null;
          profile_image?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
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
          shop_url: string | null;
          size: string | null;
          sold_at: string | null;
          status: Database['public']['Enums']['artwork_status'] | null;
          tax_type: string;
          title: string;
          title_en: string | null;
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
          shop_url?: string | null;
          size?: string | null;
          sold_at?: string | null;
          status?: Database['public']['Enums']['artwork_status'] | null;
          tax_type?: string;
          title: string;
          title_en?: string | null;
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
          shop_url?: string | null;
          size?: string | null;
          sold_at?: string | null;
          status?: Database['public']['Enums']['artwork_status'] | null;
          tax_type?: string;
          title?: string;
          title_en?: string | null;
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
      news: {
        Row: {
          created_at: string | null;
          date: string | null;
          description: string | null;
          id: string;
          link: string | null;
          source: string | null;
          thumbnail: string | null;
          title: string;
        };
        Insert: {
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          id: string;
          link?: string | null;
          source?: string | null;
          thumbnail?: string | null;
          title: string;
        };
        Update: {
          created_at?: string | null;
          date?: string | null;
          description?: string | null;
          id?: string;
          link?: string | null;
          source?: string | null;
          thumbnail?: string | null;
          title?: string;
        };
        Relationships: [];
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
          event_name: string | null;
          event_timestamp: string;
          event_type: string;
          id: number;
          os_name: string | null;
          path: string;
          referrer: string | null;
          region: string | null;
          session_id: string | null;
        };
        Insert: {
          city?: string | null;
          client_name?: string | null;
          country?: string | null;
          created_at?: string;
          device_id?: string | null;
          device_type?: string | null;
          event_name?: string | null;
          event_timestamp: string;
          event_type?: string;
          id?: never;
          os_name?: string | null;
          path: string;
          referrer?: string | null;
          region?: string | null;
          session_id?: string | null;
        };
        Update: {
          city?: string | null;
          client_name?: string | null;
          country?: string | null;
          created_at?: string;
          device_id?: string | null;
          device_type?: string | null;
          event_name?: string | null;
          event_timestamp?: string;
          event_type?: string;
          id?: never;
          os_name?: string | null;
          path?: string;
          referrer?: string | null;
          region?: string | null;
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
      reviews: {
        Row: {
          author: string;
          comment: string;
          created_at: string | null;
          date: string;
          id: string;
          rating: number;
          role: string | null;
        };
        Insert: {
          author: string;
          comment: string;
          created_at?: string | null;
          date: string;
          id?: string;
          rating: number;
          role?: string | null;
        };
        Update: {
          author?: string;
          comment?: string;
          created_at?: string | null;
          date?: string;
          id?: string;
          rating?: number;
          role?: string | null;
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
          category: string;
          context: string | null;
          created_at: string | null;
          display_order: number | null;
          id: string;
          quote: string;
        };
        Insert: {
          author: string;
          category: string;
          context?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          quote: string;
        };
        Update: {
          author?: string;
          category?: string;
          context?: string | null;
          created_at?: string | null;
          display_order?: number | null;
          id?: string;
          quote?: string;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          thumbnail: string | null;
          title: string;
          transcript: string | null;
          youtube_id: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id: string;
          thumbnail?: string | null;
          title: string;
          transcript?: string | null;
          youtube_id: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          thumbnail?: string | null;
          title?: string;
          transcript?: string | null;
          youtube_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      check_artwork_availability: {
        Args: { p_artwork_id: string };
        Returns: {
          artwork_edition_limit: number;
          artwork_edition_type: string;
          is_available: boolean;
          pending_count: number;
          sold_count: number;
        }[];
      };
      execute_sql: { Args: { sql: string }; Returns: undefined };
      get_my_role: { Args: never; Returns: string };
      get_my_status: { Args: never; Returns: string };
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
      get_pv_summary: {
        Args: { since_ts: string };
        Returns: {
          total_views: number;
          unique_visitors: number;
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
      parse_artwork_price: { Args: { price_text: string }; Returns: number };
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
