/**
 * Vytanexa — Supabase Database Types
 * AUTO-GENERATED from the live Supabase project schema.
 * Do not hand-edit — regenerate after any migration change instead.
 *
 * Source project: Vytanexa (ref: lfrvzdhonsnemdfmxthw)
 * Regenerated: after migrations 0001-0009 (full schema + security/
 * performance hardening + symptoms + ads tables)
 *
 * NOTE: this regeneration uses Supabase's own updated generator output
 * (DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">),
 * which properly fixes the multi-schema generic issue that required a
 * manual simplification in the previous version of this file — no
 * hand-editing needed this time, the official output is correct as-is.
 */

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          permissions: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          permissions?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      ads: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          end_date: string
          id: string
          image_url: string
          is_active: boolean
          placement: Database["public"]["Enums"]["ad_placement"]
          sponsor_name: string
          start_date: string
          target_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          end_date: string
          id?: string
          image_url: string
          is_active?: boolean
          placement: Database["public"]["Enums"]["ad_placement"]
          sponsor_name: string
          start_date: string
          target_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          end_date?: string
          id?: string
          image_url?: string
          is_active?: boolean
          placement?: Database["public"]["Enums"]["ad_placement"]
          sponsor_name?: string
          start_date?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      ambulance_services: {
        Row: {
          coverage_radius_km: number | null
          created_at: string
          deleted_at: string | null
          hospital_id: string | null
          id: string
          is_24x7: boolean
          is_active: boolean
          is_icu_equipped: boolean
          location_id: string
          name_translations: Json
          per_km_rate: number | null
          phone: string
          updated_at: string
          vehicle_count: number | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          whatsapp_number: string | null
        }
        Insert: {
          coverage_radius_km?: number | null
          created_at?: string
          deleted_at?: string | null
          hospital_id?: string | null
          id?: string
          is_24x7?: boolean
          is_active?: boolean
          is_icu_equipped?: boolean
          location_id: string
          name_translations?: Json
          per_km_rate?: number | null
          phone: string
          updated_at?: string
          vehicle_count?: number | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          whatsapp_number?: string | null
        }
        Update: {
          coverage_radius_km?: number | null
          created_at?: string
          deleted_at?: string | null
          hospital_id?: string | null
          id?: string
          is_24x7?: boolean
          is_active?: boolean
          is_icu_equipped?: boolean
          location_id?: string
          name_translations?: Json
          per_km_rate?: number | null
          phone?: string
          updated_at?: string
          vehicle_count?: number | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambulance_services_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambulance_services_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          device_type: string | null
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: number
          location_id: string | null
          metadata: Json
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: number
          location_id?: string | null
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: number
          location_id?: string | null
          metadata?: Json
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          author_name: string | null
          body: string
          created_at: string
          deleted_at: string | null
          doctor_id: string | null
          id: string
          question_id: string
          status: Database["public"]["Enums"]["moderation_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_name?: string | null
          body: string
          created_at?: string
          deleted_at?: string | null
          doctor_id?: string | null
          id?: string
          question_id: string
          status?: Database["public"]["Enums"]["moderation_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string | null
          body?: string
          created_at?: string
          deleted_at?: string | null
          doctor_id?: string | null
          id?: string
          question_id?: string
          status?: Database["public"]["Enums"]["moderation_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_answers_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          app_name: string
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          default_locale: string
          favicon_url: string | null
          features: Json
          footer_links: Json
          homepage_settings: Json
          id: number
          logo_url: string | null
          seo_defaults: Json
          social_links: Json
          supported_locales: string[]
          theme_colors: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          app_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          default_locale?: string
          favicon_url?: string | null
          features?: Json
          footer_links?: Json
          homepage_settings?: Json
          id?: number
          logo_url?: string | null
          seo_defaults?: Json
          social_links?: Json
          supported_locales?: string[]
          theme_colors?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          app_name?: string
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          default_locale?: string
          favicon_url?: string | null
          features?: Json
          footer_links?: Json
          homepage_settings?: Json
          id?: number
          logo_url?: string | null
          seo_defaults?: Json
          social_links?: Json
          supported_locales?: string[]
          theme_colors?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_settings_updated_by"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_doctor_id: string | null
          author_name: string | null
          body_html: string
          category: string | null
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_published: boolean
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          read_time_minutes: number | null
          slug: string
          tags: string[]
          title_translations: Json
          updated_at: string
          view_count: number
        }
        Insert: {
          author_doctor_id?: string | null
          author_name?: string | null
          body_html: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug: string
          tags?: string[]
          title_translations?: Json
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_doctor_id?: string | null
          author_name?: string | null
          body_html?: string
          category?: string | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          read_time_minutes?: number | null
          slug?: string
          tags?: string[]
          title_translations?: Json
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_doctor_id_fkey"
            columns: ["author_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
        }
        Insert: {
          action: string
          admin_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: number
          ip_address?: unknown
        }
        Update: {
          action?: string
          admin_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          ip_address?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_bank_inventory: {
        Row: {
          blood_group: string
          hospital_id: string
          id: string
          reported_at: string
          stock_level: string
        }
        Insert: {
          blood_group: string
          hospital_id: string
          id?: string
          reported_at?: string
          stock_level?: string
        }
        Update: {
          blood_group?: string
          hospital_id?: string
          id?: string
          reported_at?: string
          stock_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_bank_inventory_hospital_id_fkey"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_donors: {
        Row: {
          blood_group: string
          consent_contact: boolean
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          last_donated_at: string | null
          location_id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          blood_group: string
          consent_contact?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_donated_at?: string | null
          location_id: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          blood_group?: string
          consent_contact?: boolean
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          last_donated_at?: string | null
          location_id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blood_donors_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          icon_key: string | null
          id: string
          is_active: boolean
          is_visible_home: boolean
          name_translations: Json
          search_keywords: string[]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_visible_home?: boolean
          name_translations?: Json
          search_keywords?: string[]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          icon_key?: string | null
          id?: string
          is_active?: boolean
          is_visible_home?: boolean
          name_translations?: Json
          search_keywords?: string[]
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      chambers: {
        Row: {
          address_line: string
          chamber_name: string
          consultation_fee: number | null
          created_at: string
          deleted_at: string | null
          display_order: number
          doctor_id: string
          id: string
          is_active: boolean
          is_primary: boolean
          latitude: number | null
          location_id: string
          longitude: number | null
          map_link: string | null
          phone: string
          schedule: Json
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address_line: string
          chamber_name: string
          consultation_fee?: number | null
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          doctor_id: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          latitude?: number | null
          location_id: string
          longitude?: number | null
          map_link?: string | null
          phone: string
          schedule?: Json
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address_line?: string
          chamber_name?: string
          consultation_fee?: number | null
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          doctor_id?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          map_link?: string | null
          phone?: string
          schedule?: Json
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chambers_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chambers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_pages: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_published: boolean
          menu_icon: string | null
          menu_order: number
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          show_in_menu: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          menu_icon?: string | null
          menu_order?: number
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          show_in_menu?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_published?: boolean
          menu_icon?: string | null
          menu_order?: number
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          show_in_menu?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pages_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      data_reports: {
        Row: {
          created_at: string
          detail: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          reason: string
          reporter_ip: unknown
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          reason: string
          reporter_ip?: unknown
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          reason?: string
          reporter_ip?: unknown
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_hospital_links: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          doctor_id: string
          hospital_id: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          doctor_id: string
          hospital_id: string
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          doctor_id?: string
          hospital_id?: string
          id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_hospital_links_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dhl_hospital"
            columns: ["hospital_id"]
            isOneToOne: false
            referencedRelation: "hospitals"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          bio_translations: Json
          bmdc_registration_no: string | null
          category_id: string
          consultation_fee_max: number | null
          consultation_fee_min: number | null
          created_at: string
          degree: string[]
          deleted_at: string | null
          experience_years: number
          expertise_tags: string[]
          featured_priority: number
          id: string
          is_available: boolean
          is_featured: boolean
          languages: string[]
          name_translations: Json
          photo_url: string | null
          rating_avg: number
          rating_count: number
          search_aliases: string[]
          slug: string
          treats_conditions: string[]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          view_count: number
          whatsapp_number: string | null
        }
        Insert: {
          bio_translations?: Json
          bmdc_registration_no?: string | null
          category_id: string
          consultation_fee_max?: number | null
          consultation_fee_min?: number | null
          created_at?: string
          degree?: string[]
          deleted_at?: string | null
          experience_years?: number
          expertise_tags?: string[]
          featured_priority?: number
          id?: string
          is_available?: boolean
          is_featured?: boolean
          languages?: string[]
          name_translations?: Json
          photo_url?: string | null
          rating_avg?: number
          rating_count?: number
          search_aliases?: string[]
          slug: string
          treats_conditions?: string[]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          view_count?: number
          whatsapp_number?: string | null
        }
        Update: {
          bio_translations?: Json
          bmdc_registration_no?: string | null
          category_id?: string
          consultation_fee_max?: number | null
          consultation_fee_min?: number | null
          created_at?: string
          degree?: string[]
          deleted_at?: string | null
          experience_years?: number
          expertise_tags?: string[]
          featured_priority?: number
          id?: string
          is_available?: boolean
          is_featured?: boolean
          languages?: string[]
          name_translations?: Json
          photo_url?: string | null
          rating_avg?: number
          rating_count?: number
          search_aliases?: string[]
          slug?: string
          treats_conditions?: string[]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          view_count?: number
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      hospitals: {
        Row: {
          address_line: string
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description_translations: Json
          facility_tags: string[]
          featured_priority: number
          gallery_images: string[]
          has_emergency_dept: boolean
          id: string
          is_featured: boolean
          is_trending: boolean
          latitude: number | null
          location_id: string
          longitude: number | null
          map_link: string | null
          name_translations: Json
          operating_hours: Json
          phone: string
          rating_avg: number
          rating_count: number
          services: string[]
          slug: string
          type: Database["public"]["Enums"]["hospital_type"]
          updated_at: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          view_count: number
          whatsapp_number: string | null
        }
        Insert: {
          address_line: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description_translations?: Json
          facility_tags?: string[]
          featured_priority?: number
          gallery_images?: string[]
          has_emergency_dept?: boolean
          id?: string
          is_featured?: boolean
          is_trending?: boolean
          latitude?: number | null
          location_id: string
          longitude?: number | null
          map_link?: string | null
          name_translations?: Json
          operating_hours?: Json
          phone: string
          rating_avg?: number
          rating_count?: number
          services?: string[]
          slug: string
          type: Database["public"]["Enums"]["hospital_type"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          view_count?: number
          whatsapp_number?: string | null
        }
        Update: {
          address_line?: string
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description_translations?: Json
          facility_tags?: string[]
          featured_priority?: number
          gallery_images?: string[]
          has_emergency_dept?: boolean
          id?: string
          is_featured?: boolean
          is_trending?: boolean
          latitude?: number | null
          location_id?: string
          longitude?: number | null
          map_link?: string | null
          name_translations?: Json
          operating_hours?: Json
          phone?: string
          rating_avg?: number
          rating_count?: number
          services?: string[]
          slug?: string
          type?: Database["public"]["Enums"]["hospital_type"]
          updated_at?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          view_count?: number
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hospitals_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          chamber_id: string | null
          contacted_at: string | null
          created_at: string
          doctor_id: string
          id: string
          message: string | null
          patient_name: string
          patient_phone: string
          preferred_time: string | null
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chamber_id?: string | null
          contacted_at?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          message?: string | null
          patient_name: string
          patient_phone: string
          preferred_time?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chamber_id?: string | null
          contacted_at?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          message?: string | null
          patient_name?: string
          patient_phone?: string
          preferred_time?: string | null
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_chamber_id_fkey"
            columns: ["chamber_id"]
            isOneToOne: false
            referencedRelation: "chambers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_order: number
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name_translations: Json
          parent_id: string | null
          slug: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name_translations?: Json
          parent_id?: string | null
          slug: string
          type: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name_translations?: Json
          parent_id?: string | null
          slug?: string
          type?: Database["public"]["Enums"]["location_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_notif_reads_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          show_as_banner: boolean
          target_url: string | null
          target_user_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          show_as_banner?: boolean
          target_url?: string | null
          target_user_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          show_as_banner?: boolean
          target_url?: string | null
          target_user_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_notif_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_notif_target_user"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      page_submissions: {
        Row: {
          block_index: number
          created_at: string
          id: string
          ip_address: unknown
          page_id: string
          submission_data: Json
          submitter_phone: string | null
        }
        Insert: {
          block_index: number
          created_at?: string
          id?: string
          ip_address?: unknown
          page_id: string
          submission_data: Json
          submitter_phone?: string | null
        }
        Update: {
          block_index?: number
          created_at?: string
          id?: string
          ip_address?: unknown
          page_id?: string
          submission_data?: Json
          submitter_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_submissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "custom_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          display_order: number
          id: string
          option_text: string
          poll_id: string
          vote_count: number
        }
        Insert: {
          display_order?: number
          id?: string
          option_text: string
          poll_id: string
          vote_count?: number
        }
        Update: {
          display_order?: number
          id?: string
          option_text?: string
          poll_id?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          voter_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          voter_key: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          voter_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          question: string
          total_votes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          question: string
          total_votes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          question?: string
          total_votes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_polls_created_by"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      question_upvotes: {
        Row: {
          created_at: string
          id: string
          question_id: string
          voter_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          voter_key: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          voter_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_upvotes_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer_count: number
          author_name: string | null
          author_phone: string | null
          body: string | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_anonymous: boolean
          status: Database["public"]["Enums"]["moderation_status"]
          title: string
          updated_at: string
          upvote_count: number
          user_id: string | null
        }
        Insert: {
          answer_count?: number
          author_name?: string | null
          author_phone?: string | null
          body?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_anonymous?: boolean
          status?: Database["public"]["Enums"]["moderation_status"]
          title: string
          updated_at?: string
          upvote_count?: number
          user_id?: string | null
        }
        Update: {
          answer_count?: number
          author_name?: string | null
          author_phone?: string | null
          body?: string | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_anonymous?: boolean
          status?: Database["public"]["Enums"]["moderation_status"]
          title?: string
          updated_at?: string
          upvote_count?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_questions_user"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          created_at: string
          id: number
          limit_key: string
        }
        Insert: {
          created_at?: string
          id?: number
          limit_key: string
        }
        Update: {
          created_at?: string
          id?: number
          limit_key?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          admin_reply: string | null
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          moderated_at: string | null
          moderated_by: string | null
          rating: number
          review_text: string
          reviewer_name: string
          reviewer_phone: string | null
          status: Database["public"]["Enums"]["moderation_status"]
          updated_at: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          rating: number
          review_text: string
          reviewer_name: string
          reviewer_phone?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          updated_at?: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          rating?: number
          review_text?: string
          reviewer_name?: string
          reviewer_phone?: string | null
          status?: Database["public"]["Enums"]["moderation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reviews_moderated_by"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          applies_to: string[]
          benefits: Json
          created_at: string
          id: string
          is_active: boolean
          name_translations: Json
          price_monthly: number
          price_yearly: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          applies_to?: string[]
          benefits?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name_translations?: Json
          price_monthly?: number
          price_yearly?: number | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          applies_to?: string[]
          benefits?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name_translations?: Json
          price_monthly?: number
          price_yearly?: number | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          auto_renew: boolean
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          expires_at: string | null
          id: string
          payment_ref: string | null
          plan_id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          auto_renew?: boolean
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          expires_at?: string | null
          id?: string
          payment_ref?: string | null
          plan_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          auto_renew?: boolean
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          expires_at?: string | null
          id?: string
          payment_ref?: string | null
          plan_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      symptom_categories: {
        Row: {
          category_id: string
          display_order: number
          id: string
          symptom_id: string
        }
        Insert: {
          category_id: string
          display_order?: number
          id?: string
          symptom_id: string
        }
        Update: {
          category_id?: string
          display_order?: number
          id?: string
          symptom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "symptom_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "symptom_categories_symptom_id_fkey"
            columns: ["symptom_id"]
            isOneToOne: false
            referencedRelation: "symptoms"
            referencedColumns: ["id"]
          },
        ]
      }
      symptoms: {
        Row: {
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          description_translations: Json
          display_order: number
          id: string
          is_active: boolean
          is_emergency: boolean
          slug: string
          title_translations: Json
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description_translations?: Json
          display_order?: number
          id?: string
          is_active?: boolean
          is_emergency?: boolean
          slug: string
          title_translations?: Json
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          description_translations?: Json
          display_order?: number
          id?: string
          is_active?: boolean
          is_emergency?: boolean
          slug?: string
          title_translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      test_catalog: {
        Row: {
          aliases: string[]
          canonical_key: string
          category: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_popular: boolean
          name_translations: Json
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          canonical_key: string
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name_translations?: Json
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          canonical_key?: string
          category?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name_translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          default_location_id: string | null
          deleted_at: string | null
          email: string | null
          id: string
          is_guest_converted: boolean
          name: string | null
          notification_prefs: Json
          phone: string | null
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_location_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id: string
          is_guest_converted?: boolean
          name?: string | null
          notification_prefs?: Json
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_location_id?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_guest_converted?: boolean
          name?: string | null
          notification_prefs?: Json
          phone?: string | null
          preferred_language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      location_paths: {
        Row: {
          depth: number | null
          id: string | null
          name_translations: Json | null
          parent_id: string | null
          path_ids: string[] | null
          slug: string | null
          type: Database["public"]["Enums"]["location_type"] | null
        }
        Relationships: []
      }
      public_blood_donors: {
        Row: {
          blood_group: string | null
          id: string | null
          last_donated_at: string | null
          location_id: string | null
          name: string | null
        }
        Insert: {
          blood_group?: string | null
          id?: string | null
          last_donated_at?: string | null
          location_id?: string | null
          name?: string | null
        }
        Update: {
          blood_group?: string | null
          id?: string | null
          last_donated_at?: string | null
          location_id?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blood_donors_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      public_entity_tiers: {
        Row: {
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          tier: Database["public"]["Enums"]["subscription_tier"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max_count: number; p_window: string }
        Returns: boolean
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      ad_placement: "homepage_banner" | "native_feed"
      app_role: "super_admin" | "admin" | "moderator" | "editor"
      entity_type: "doctor" | "hospital" | "article" | "question" | "poll"
      hospital_type: "hospital" | "clinic" | "diagnostic" | "nursing_home"
      lead_status: "new" | "contacted" | "completed" | "cancelled" | "spam"
      location_type: "state" | "district" | "sub_district" | "ward"
      moderation_status: "pending" | "approved" | "rejected"
      notification_type: "general" | "emergency" | "personal"
      subscription_status: "active" | "expired" | "cancelled" | "trial"
      subscription_tier: "free" | "basic" | "pro" | "premium"
      verification_status: "pending" | "verified" | "rejected" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      ad_placement: ["homepage_banner", "native_feed"],
      app_role: ["super_admin", "admin", "moderator", "editor"],
      entity_type: ["doctor", "hospital", "article", "question", "poll"],
      hospital_type: ["hospital", "clinic", "diagnostic", "nursing_home"],
      lead_status: ["new", "contacted", "completed", "cancelled", "spam"],
      location_type: ["state", "district", "sub_district", "ward"],
      moderation_status: ["pending", "approved", "rejected"],
      notification_type: ["general", "emergency", "personal"],
      subscription_status: ["active", "expired", "cancelled", "trial"],
      subscription_tier: ["free", "basic", "pro", "premium"],
      verification_status: ["pending", "verified", "rejected", "suspended"],
    },
  },
} as const
