export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_setup: {
        Row: {
          created_at: string
          id: number
          setup_code_hash: string | null
          setup_completed_at: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          setup_code_hash?: string | null
          setup_completed_at?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          setup_code_hash?: string | null
          setup_completed_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          organization_id: string | null
          reason: string | null
          temple_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          reason?: string | null
          temple_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string | null
          reason?: string | null
          temple_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
          organization_id: string
          slug: string
          state: string | null
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
          slug: string
          state?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          slug?: string
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          attempted_at: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          created_by_user_id: string | null
          delivered_at: string | null
          failure_reason: string | null
          family_profile_id: string | null
          id: string
          message_type: string
          organization_id: string
          provider_reference: string | null
          registration_id: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          template_id: string | null
          temple_id: string
        }
        Insert: {
          attempted_at?: string | null
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by_user_id?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          family_profile_id?: string | null
          id?: string
          message_type: string
          organization_id: string
          provider_reference?: string | null
          registration_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          template_id?: string | null
          temple_id: string
        }
        Update: {
          attempted_at?: string | null
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          created_by_user_id?: string | null
          delivered_at?: string | null
          failure_reason?: string | null
          family_profile_id?: string | null
          id?: string
          message_type?: string
          organization_id?: string
          provider_reference?: string | null
          registration_id?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          template_id?: string | null
          temple_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          language: string
          message_type: string
          organization_id: string | null
          template_content: string
          temple_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          language?: string
          message_type: string
          organization_id?: string | null
          template_content: string
          temple_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          language?: string
          message_type?: string
          organization_id?: string | null
          template_content?: string
          temple_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_templates_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      family_profiles: {
        Row: {
          city: string | null
          communication_preferences: Json
          consent_media_sharing: boolean
          consent_messages: boolean
          country: string | null
          created_at: string
          family_representative_user_id: string
          full_name: string | null
          id: string
          locality: string | null
          organization_id: string
          preferred_language: string
          state: string | null
          updated_at: string
          verified_mobile_identity: string | null
        }
        Insert: {
          city?: string | null
          communication_preferences?: Json
          consent_media_sharing?: boolean
          consent_messages?: boolean
          country?: string | null
          created_at?: string
          family_representative_user_id: string
          full_name?: string | null
          id?: string
          locality?: string | null
          organization_id: string
          preferred_language?: string
          state?: string | null
          updated_at?: string
          verified_mobile_identity?: string | null
        }
        Update: {
          city?: string | null
          communication_preferences?: Json
          consent_media_sharing?: boolean
          consent_messages?: boolean
          country?: string | null
          created_at?: string
          family_representative_user_id?: string
          full_name?: string | null
          id?: string
          locality?: string | null
          organization_id?: string
          preferred_language?: string
          state?: string | null
          updated_at?: string
          verified_mobile_identity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_profiles_family_representative_user_id_fkey"
            columns: ["family_representative_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_notes: {
        Row: {
          author_user_id: string
          created_at: string
          family_profile_id: string | null
          id: string
          note: string
          organization_id: string
          registration_id: string | null
          temple_id: string
          updated_at: string
        }
        Insert: {
          author_user_id: string
          created_at?: string
          family_profile_id?: string | null
          id?: string
          note: string
          organization_id: string
          registration_id?: string | null
          temple_id: string
          updated_at?: string
        }
        Update: {
          author_user_id?: string
          created_at?: string
          family_profile_id?: string | null
          id?: string
          note?: string
          organization_id?: string
          registration_id?: string | null
          temple_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_author_user_id_fkey"
            columns: ["author_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_notes_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          caption: string | null
          consent_status: Database["public"]["Enums"]["consent_status"]
          created_at: string
          family_profile_id: string | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          organization_id: string
          publication_status: Database["public"]["Enums"]["publication_status"]
          registration_id: string | null
          storage_reference: string
          temple_id: string
          updated_at: string
          uploaded_by_user_id: string | null
          visibility: Database["public"]["Enums"]["media_visibility"]
        }
        Insert: {
          caption?: string | null
          consent_status?: Database["public"]["Enums"]["consent_status"]
          created_at?: string
          family_profile_id?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          organization_id: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          registration_id?: string | null
          storage_reference: string
          temple_id: string
          updated_at?: string
          uploaded_by_user_id?: string | null
          visibility?: Database["public"]["Enums"]["media_visibility"]
        }
        Update: {
          caption?: string | null
          consent_status?: Database["public"]["Enums"]["consent_status"]
          created_at?: string
          family_profile_id?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          organization_id?: string
          publication_status?: Database["public"]["Enums"]["publication_status"]
          registration_id?: string | null
          storage_reference?: string
          temple_id?: string
          updated_at?: string
          uploaded_by_user_id?: string | null
          visibility?: Database["public"]["Enums"]["media_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "media_items_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_uploaded_by_user_id_fkey"
            columns: ["uploaded_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          default_language: string
          default_timezone: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_language?: string
          default_timezone?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_language?: string
          default_timezone?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          communication_preferences: Json
          country: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          locality: string | null
          phone: string | null
          phone_verified: boolean
          preferred_language: string
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          communication_preferences?: Json
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          locality?: string | null
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          communication_preferences?: Json
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          locality?: string | null
          phone?: string | null
          phone_verified?: boolean
          preferred_language?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          captured_at: string
          id: string
          registration_id: string
          source: string
        }
        Insert: {
          captured_at?: string
          id?: string
          registration_id: string
          source: string
        }
        Update: {
          captured_at?: string
          id?: string
          registration_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: true
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_history: {
        Row: {
          change_metadata: Json | null
          changed_by_user_id: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["registration_status"]
          previous_status:
            | Database["public"]["Enums"]["registration_status"]
            | null
          reason: string | null
          registration_id: string
        }
        Insert: {
          change_metadata?: Json | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["registration_status"]
          previous_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          reason?: string | null
          registration_id: string
        }
        Update: {
          change_metadata?: Json | null
          changed_by_user_id?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["registration_status"]
          previous_status?:
            | Database["public"]["Enums"]["registration_status"]
            | null
          reason?: string | null
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registration_history_changed_by_user_id_fkey"
            columns: ["changed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_history_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          accompanying_people_count: number
          attendance_recorded_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          family_profile_id: string
          id: string
          occasion_date: string | null
          occasion_type: Database["public"]["Enums"]["occasion_category"]
          organization_id: string
          registration_number: string
          remarks: string | null
          rescheduled_from_registration_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          temple_id: string
          total_people: number | null
          updated_at: string
          visit_date: string
        }
        Insert: {
          accompanying_people_count?: number
          attendance_recorded_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          family_profile_id: string
          id?: string
          occasion_date?: string | null
          occasion_type: Database["public"]["Enums"]["occasion_category"]
          organization_id: string
          registration_number: string
          remarks?: string | null
          rescheduled_from_registration_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          temple_id: string
          total_people?: number | null
          updated_at?: string
          visit_date: string
        }
        Update: {
          accompanying_people_count?: number
          attendance_recorded_by?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          family_profile_id?: string
          id?: string
          occasion_date?: string | null
          occasion_type?: Database["public"]["Enums"]["occasion_category"]
          organization_id?: string
          registration_number?: string
          remarks?: string | null
          rescheduled_from_registration_id?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          temple_id?: string
          total_people?: number | null
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_attendance_recorded_by_fkey"
            columns: ["attendance_recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_rescheduled_from_registration_id_fkey"
            columns: ["rescheduled_from_registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      temple_closed_dates: {
        Row: {
          booking_policy: Database["public"]["Enums"]["date_booking_policy"]
          created_at: string
          created_by_user_id: string | null
          date: string
          id: string
          public_instruction: string | null
          reason: string | null
          temple_id: string
        }
        Insert: {
          booking_policy?: Database["public"]["Enums"]["date_booking_policy"]
          created_at?: string
          created_by_user_id?: string | null
          date: string
          id?: string
          public_instruction?: string | null
          reason?: string | null
          temple_id: string
        }
        Update: {
          booking_policy?: Database["public"]["Enums"]["date_booking_policy"]
          created_at?: string
          created_by_user_id?: string | null
          date?: string
          id?: string
          public_instruction?: string | null
          reason?: string | null
          temple_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temple_closed_dates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temple_closed_dates_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      temple_field_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          temple_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          temple_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          temple_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "temple_field_settings_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: true
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      temple_memberships: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          temple_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          temple_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          temple_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "temple_memberships_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temple_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      temple_special_dates: {
        Row: {
          booking_policy: Database["public"]["Enums"]["date_booking_policy"]
          category: Database["public"]["Enums"]["special_date_category"]
          created_at: string
          created_by_user_id: string | null
          date: string
          description: string | null
          id: string
          temple_id: string
          title: string
        }
        Insert: {
          booking_policy?: Database["public"]["Enums"]["date_booking_policy"]
          category?: Database["public"]["Enums"]["special_date_category"]
          created_at?: string
          created_by_user_id?: string | null
          date: string
          description?: string | null
          id?: string
          temple_id: string
          title: string
        }
        Update: {
          booking_policy?: Database["public"]["Enums"]["date_booking_policy"]
          category?: Database["public"]["Enums"]["special_date_category"]
          created_at?: string
          created_by_user_id?: string | null
          date?: string
          description?: string | null
          id?: string
          temple_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "temple_special_dates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temple_special_dates_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      temples: {
        Row: {
          address: string | null
          booking_window_months: number
          cancellation_cutoff_days: number
          city_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          daily_family_capacity: number
          default_language: string
          description: string | null
          evening_timings: string | null
          id: string
          locality: string | null
          maps_url: string | null
          maximum_accompanying_people: number
          minimum_accompanying_people: number
          morning_timings: string | null
          name: string
          organization_id: string
          public_settings: Json
          registration_cutoff_days: number
          registration_enabled: boolean
          registration_opening_date: string | null
          remarks_enabled: boolean
          reschedule_cutoff_days: number
          slug: string
          status: Database["public"]["Enums"]["temple_status"]
          sunday_blocked: boolean
          timezone: string
          updated_at: string
          visit_instructions: string | null
        }
        Insert: {
          address?: string | null
          booking_window_months?: number
          cancellation_cutoff_days?: number
          city_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          daily_family_capacity?: number
          default_language?: string
          description?: string | null
          evening_timings?: string | null
          id?: string
          locality?: string | null
          maps_url?: string | null
          maximum_accompanying_people?: number
          minimum_accompanying_people?: number
          morning_timings?: string | null
          name: string
          organization_id: string
          public_settings?: Json
          registration_cutoff_days?: number
          registration_enabled?: boolean
          registration_opening_date?: string | null
          remarks_enabled?: boolean
          reschedule_cutoff_days?: number
          slug: string
          status?: Database["public"]["Enums"]["temple_status"]
          sunday_blocked?: boolean
          timezone?: string
          updated_at?: string
          visit_instructions?: string | null
        }
        Update: {
          address?: string | null
          booking_window_months?: number
          cancellation_cutoff_days?: number
          city_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          daily_family_capacity?: number
          default_language?: string
          description?: string | null
          evening_timings?: string | null
          id?: string
          locality?: string | null
          maps_url?: string | null
          maximum_accompanying_people?: number
          minimum_accompanying_people?: number
          morning_timings?: string | null
          name?: string
          organization_id?: string
          public_settings?: Json
          registration_cutoff_days?: number
          registration_enabled?: boolean
          registration_opening_date?: string | null
          remarks_enabled?: boolean
          reschedule_cutoff_days?: number
          slug?: string
          status?: Database["public"]["Enums"]["temple_status"]
          sunday_blocked?: boolean
          timezone?: string
          updated_at?: string
          visit_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "temples_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "temples_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          comment: string | null
          consent_status: Database["public"]["Enums"]["consent_status"]
          created_at: string
          display_locality: boolean
          display_name_preference: boolean
          family_profile_id: string
          id: string
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          organization_id: string
          photo_media_id: string | null
          published_at: string | null
          rating: number
          registration_id: string | null
          temple_id: string
        }
        Insert: {
          comment?: string | null
          consent_status?: Database["public"]["Enums"]["consent_status"]
          created_at?: string
          display_locality?: boolean
          display_name_preference?: boolean
          family_profile_id: string
          id?: string
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          organization_id: string
          photo_media_id?: string | null
          published_at?: string | null
          rating: number
          registration_id?: string | null
          temple_id: string
        }
        Update: {
          comment?: string | null
          consent_status?: Database["public"]["Enums"]["consent_status"]
          created_at?: string
          display_locality?: boolean
          display_name_preference?: boolean
          family_profile_id?: string
          id?: string
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          organization_id?: string
          photo_media_id?: string | null
          published_at?: string | null
          rating?: number
          registration_id?: string | null
          temple_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_family_profile_id_fkey"
            columns: ["family_profile_id"]
            isOneToOne: false
            referencedRelation: "family_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_photo_media_id_fkey"
            columns: ["photo_media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testimonials_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      book_registration: {
        Args: {
          p_accompanying_people_count?: number
          p_occasion: Database["public"]["Enums"]["occasion_category"]
          p_occasion_date?: string
          p_remarks?: string
          p_temple_id: string
          p_visit_date: string
        }
        Returns: Database["public"]["CompositeTypes"]["booking_result"]
        SetofOptions: {
          from: "*"
          to: "booking_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_access_family: {
        Args: { _family_profile_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_family_user: {
        Args: { _family_user_id: string; _staff_user_id: string }
        Returns: boolean
      }
      can_access_registration: {
        Args: { _registration_id: string; _user_id: string }
        Returns: boolean
      }
      cancel_registration: {
        Args: { p_reason?: string; p_registration_id: string }
        Returns: {
          accompanying_people_count: number
          attendance_recorded_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          family_profile_id: string
          id: string
          occasion_date: string | null
          occasion_type: Database["public"]["Enums"]["occasion_category"]
          organization_id: string
          registration_number: string
          remarks: string | null
          rescheduled_from_registration_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          temple_id: string
          total_people: number | null
          updated_at: string
          visit_date: string
        }
        SetofOptions: {
          from: "*"
          to: "registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_superadmin: { Args: { p_code: string }; Returns: boolean }
      get_temple_availability: {
        Args: { p_from: string; p_temple_id: string; p_to: string }
        Returns: {
          capacity: number
          description: string
          expected_people: number
          families_registered: number
          label: string
          remaining: number
          status: string
          visit_date: string
        }[]
      }
      has_org_role: {
        Args: {
          _organization_id: string
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_temple_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _temple_id: string
          _user_id: string
        }
        Returns: boolean
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      log_audit: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata: Json
          p_organization_id: string
          p_reason: string
          p_temple_id: string
        }
        Returns: string
      }
      reschedule_registration: {
        Args: {
          p_new_date: string
          p_reason?: string
          p_registration_id: string
        }
        Returns: Database["public"]["CompositeTypes"]["booking_result"]
        SetofOptions: {
          from: "*"
          to: "booking_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_attendance: {
        Args: {
          p_new_status: Database["public"]["Enums"]["registration_status"]
          p_reason?: string
          p_registration_id: string
        }
        Returns: {
          accompanying_people_count: number
          attendance_recorded_by: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          family_profile_id: string
          id: string
          occasion_date: string | null
          occasion_type: Database["public"]["Enums"]["occasion_category"]
          organization_id: string
          registration_number: string
          remarks: string | null
          rescheduled_from_registration_id: string | null
          status: Database["public"]["Enums"]["registration_status"]
          temple_id: string
          total_people: number | null
          updated_at: string
          visit_date: string
        }
        SetofOptions: {
          from: "*"
          to: "registrations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      setup_pending: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "platform_superadmin"
        | "temple_admin"
        | "temple_manager"
        | "family_user"
      communication_channel: "whatsapp" | "email" | "sms"
      communication_status:
        | "draft"
        | "scheduled"
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
        | "cancelled"
      consent_status: "pending" | "granted" | "denied"
      date_booking_policy: "blocked" | "limited" | "open"
      media_type: "photo" | "video"
      media_visibility: "private" | "public"
      moderation_status: "pending" | "approved" | "rejected"
      occasion_category:
        | "birthday"
        | "wedding_anniversary"
        | "family_pooja_seva"
        | "jain_religious_occasion"
        | "kalyanak_festival"
        | "special_family_day"
        | "other"
      org_status: "active" | "suspended"
      publication_status: "unpublished" | "pending_review" | "published"
      registration_status:
        | "upcoming"
        | "completed"
        | "cancelled"
        | "rescheduled"
        | "no_show"
      special_date_category:
        | "chaudas"
        | "kalyanak"
        | "festival"
        | "temple_event"
        | "other"
      temple_status: "active" | "inactive" | "suspended"
    }
    CompositeTypes: {
      booking_result: {
        created: boolean | null
        registration:
          | Database["public"]["Tables"]["registrations"]["Row"]
          | null
        message: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "platform_superadmin",
        "temple_admin",
        "temple_manager",
        "family_user",
      ],
      communication_channel: ["whatsapp", "email", "sms"],
      communication_status: [
        "draft",
        "scheduled",
        "queued",
        "sent",
        "delivered",
        "failed",
        "cancelled",
      ],
      consent_status: ["pending", "granted", "denied"],
      date_booking_policy: ["blocked", "limited", "open"],
      media_type: ["photo", "video"],
      media_visibility: ["private", "public"],
      moderation_status: ["pending", "approved", "rejected"],
      occasion_category: [
        "birthday",
        "wedding_anniversary",
        "family_pooja_seva",
        "jain_religious_occasion",
        "kalyanak_festival",
        "special_family_day",
        "other",
      ],
      org_status: ["active", "suspended"],
      publication_status: ["unpublished", "pending_review", "published"],
      registration_status: [
        "upcoming",
        "completed",
        "cancelled",
        "rescheduled",
        "no_show",
      ],
      special_date_category: [
        "chaudas",
        "kalyanak",
        "festival",
        "temple_event",
        "other",
      ],
      temple_status: ["active", "inactive", "suspended"],
    },
  },
} as const
