export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          contact_email: string | null
          contact_phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'manager' | 'chatter' | 'pending'
          is_active: boolean
          created_at: string
          updated_at: string
          approved_by: string | null
          approved_at: string | null
          shift: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'manager' | 'chatter' | 'pending'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
          shift?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'manager' | 'chatter' | 'pending'
          is_active?: boolean
          created_at?: string
          updated_at?: string
          approved_by?: string | null
          approved_at?: string | null
          shift?: string | null
        }
      }
      clients: {
        Row: {
          id: string
          username: string
          phone: string | null
          agency_id: string | null
          assigned_chatter_id: string | null
          assigned_manager_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
         avatar_url: string | null
        }
        Insert: {
          id?: string
          username: string
          phone?: string | null
          agency_id?: string | null
          assigned_chatter_id?: string | null
          assigned_manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
         avatar_url?: string | null
        }
        Update: {
          id?: string
          username?: string
          phone?: string | null
          agency_id?: string | null
          assigned_chatter_id?: string | null
          assigned_manager_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
         avatar_url?: string | null
        }
      }
      platforms: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          color: string
          icon: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          color?: string
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string
          icon?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      client_platforms: {
        Row: {
          id: string
          client_id: string
          platform_id: string
          account_name: string | null
          username_on_platform: string | null
          profile_url: string | null
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          platform_id: string
          account_name?: string | null
          username_on_platform?: string | null
          profile_url?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          platform_id?: string
          account_name?: string | null
          username_on_platform?: string | null
          profile_url?: string | null
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chatter_assignments: {
        Row: {
          id: string
          chatter_id: string
          client_id: string
          client_platform_id: string | null
          assigned_by: string
          assigned_at: string
          is_active: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chatter_id: string
          client_id: string
          client_platform_id?: string | null
          assigned_by: string
          assigned_at?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chatter_id?: string
          client_id?: string
          client_platform_id?: string | null
          assigned_by?: string
          assigned_at?: string
          is_active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_preferences: {
        Row: {
          id: string
          client_id: string
          minimum_pricing: number
          video_call: boolean
          audio_call: boolean
          dick_rates: boolean
          fan_signs: boolean
          using_fans_name: boolean
          saying_specific_things: boolean
          roleplaying: boolean
          using_toys_props: boolean
          specific_outfits: boolean
          full_nudity_censored: boolean
          full_nudity_uncensored: boolean
          masturbation: boolean
          anal_content: boolean
          feet_content: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          minimum_pricing?: number
          video_call?: boolean
          audio_call?: boolean
          dick_rates?: boolean
          fan_signs?: boolean
          using_fans_name?: boolean
          saying_specific_things?: boolean
          roleplaying?: boolean
          using_toys_props?: boolean
          specific_outfits?: boolean
          full_nudity_censored?: boolean
          full_nudity_uncensored?: boolean
          masturbation?: boolean
          anal_content?: boolean
          feet_content?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          minimum_pricing?: number
          video_call?: boolean
          audio_call?: boolean
          dick_rates?: boolean
          fan_signs?: boolean
          using_fans_name?: boolean
          saying_specific_things?: boolean
          roleplaying?: boolean
          using_toys_props?: boolean
          specific_outfits?: boolean
          full_nudity_censored?: boolean
          full_nudity_uncensored?: boolean
          masturbation?: boolean
          anal_content?: boolean
          feet_content?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      custom_requests: {
        Row: {
          id: string
          client_id: string
          fan_name: string
          fan_email: string | null
          description: string
          fan_lifetime_spend: number | null
          proposed_amount: number
          amount_paid: number | null
          length_duration: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          notes: string | null
          chat_link: string | null
          date_submitted: string
          date_due: string | null
          date_completed: string | null
          estimated_delivery_date: string | null
          assigned_to: string | null
          created_by: string | null
          team_approved_by: string | null
          team_approved_at: string | null
          client_approved_at: string | null
          is_voice_video_call: boolean
          call_scheduled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          fan_name: string
          fan_email?: string | null
          description: string
          fan_lifetime_spend?: number | null
          proposed_amount?: number
          amount_paid?: number | null
          length_duration?: string | null
          status?: 'pending_team_approval' | 'pending_client_approval' | 'in_progress' | 'completed' | 'delivered' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          notes?: string | null
          chat_link?: string | null
          date_submitted?: string
          date_due?: string | null
          date_completed?: string | null
          estimated_delivery_date?: string | null
          assigned_to?: string | null
          created_by?: string | null
          team_approved_by?: string | null
          team_approved_at?: string | null
          client_approved_at?: string | null
          is_voice_video_call?: boolean
          call_scheduled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          fan_name?: string
          fan_email?: string | null
          description?: string
          fan_lifetime_spend?: number | null
          proposed_amount?: number
          amount_paid?: number | null
          length_duration?: string | null
          status?: 'pending_team_approval' | 'pending_client_approval' | 'in_progress' | 'completed' | 'delivered' | 'cancelled'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          notes?: string | null
          chat_link?: string | null
          date_submitted?: string
          date_due?: string | null
          date_completed?: string | null
          estimated_delivery_date?: string | null
          assigned_to?: string | null
          created_by?: string | null
          team_approved_by?: string | null
          team_approved_at?: string | null
          client_approved_at?: string | null
          is_voice_video_call?: boolean
          call_scheduled_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content_uploads: {
        Row: {
          id: string
          custom_request_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_by: string
          upload_date: string
        }
        Insert: {
          id?: string
          custom_request_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_by?: string
          upload_date?: string
        }
        Update: {
          id?: string
          custom_request_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          uploaded_by?: string
          upload_date?: string
        }
      }
      activity_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'created' | 'updated' | 'deleted'
          old_values: Json | null
          new_values: Json | null
          performed_by: string | null
          performed_at: string
        }
        Insert: {
          id?: string
          table_name: string
          record_id: string
          action: 'created' | 'updated' | 'deleted'
          old_values?: Json | null
          new_values?: Json | null
          performed_by?: string | null
          performed_at?: string
        }
        Update: {
          id?: string
          table_name?: string
          record_id?: string
          action?: 'created' | 'updated' | 'deleted'
          old_values?: Json | null
          new_values?: Json | null
          performed_by?: string | null
          performed_at?: string
        }
      }
      custom_notes: {
        Row: {
          id: string
          custom_request_id: string
          content: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          custom_request_id: string
          content: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          custom_request_id?: string
          content?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      client_personal_info: {
        Row: {
          id: string
          client_id: string
          legal_name: string | null
          email: string | null
          phone: string | null
          date_of_birth: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          legal_name?: string | null
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          legal_name?: string | null
          email?: string | null
          phone?: string | null
          date_of_birth?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content_scenes: {
        Row: {
          id: string
          title: string
          location: string | null
          props: string | null
          instructions: Json
          is_template: boolean
          is_default_for_new_clients: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          location?: string | null
          props?: string | null
          instructions?: Json
          is_template?: boolean
          is_default_for_new_clients?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          location?: string | null
          props?: string | null
          instructions?: Json
          is_template?: boolean
          is_default_for_new_clients?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      client_scene_assignments: {
        Row: {
          id: string
          client_id: string
          scene_id: string
          status: 'pending' | 'completed' | 'archived'
          assigned_by: string | null
          assigned_at: string
          completed_at: string | null
          archived_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          scene_id: string
          status?: 'pending' | 'completed' | 'archived'
          assigned_by?: string | null
          assigned_at?: string
          completed_at?: string | null
          archived_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          scene_id?: string
          status?: 'pending' | 'completed' | 'archived'
          assigned_by?: string | null
          assigned_at?: string
          completed_at?: string | null
          archived_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scene_content_uploads: {
        Row: {
          id: string
          assignment_id: string
          step_index: number
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_by: string
          upload_date: string
        }
        Insert: {
          id?: string
          assignment_id: string
          step_index: number
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          uploaded_by: string
          upload_date?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          step_index?: number
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          uploaded_by?: string
          upload_date?: string
        }
      }
      scene_example_media: {
        Row: {
          id: string
          scene_id: string
          file_name: string
          file_path: string
          file_type: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          file_name: string
          file_path: string
          file_type: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          file_name?: string
          file_path?: string
          file_type?: string
          display_order?: number
          created_at?: string
        }
      }
      chatter_sales: {
        Row: {
          id: string
          chatter_id: string
          client_id: string
          sale_date: string
          sale_time: string | null
          gross_amount: number
          screenshot_url: string | null
          notes: string | null
          status: 'pending' | 'valid' | 'invalid'
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chatter_id: string
          client_id: string
          sale_date?: string
          sale_time?: string | null
          gross_amount: number
          screenshot_url?: string | null
          notes?: string | null
          status?: 'pending' | 'valid' | 'invalid'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chatter_id?: string
          client_id?: string
          sale_date?: string
          sale_time?: string | null
          gross_amount?: number
          screenshot_url?: string | null
          notes?: string | null
          status?: 'pending' | 'valid' | 'invalid'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      team_role: 'admin' | 'manager' | 'chatter'
      team_role: 'admin' | 'manager' | 'chatter' | 'pending'
      request_status: 'pending_team_approval' | 'pending_client_approval' | 'in_progress' | 'completed' | 'delivered' | 'cancelled'
      request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
      request_priority: 'low' | 'medium' | 'high' | 'urgent'
      activity_action: 'created' | 'updated' | 'deleted'
      attendance_status: 'on_time' | 'late' | 'no_show' | 'day_off' | 'left_early' | 'late_and_left_early'
      scene_status: 'pending' | 'completed'
    }
  }
  attendance_records: {
    Row: {
      id: string
      team_member_id: string
      date: string
      status: 'on_time' | 'late' | 'no_show' | 'day_off' | 'left_early' | 'late_and_left_early'
      clock_in_time: string | null
      clock_out_time: string | null
      notes: string | null
      recorded_by: string
      created_at: string
      updated_at: string
    }
    Insert: {
      id?: string
      team_member_id: string
      date?: string
      status: 'on_time' | 'late' | 'no_show' | 'day_off' | 'left_early' | 'late_and_left_early'
      clock_in_time?: string | null
      clock_out_time?: string | null
      notes?: string | null
      recorded_by: string
      created_at?: string
      updated_at?: string
    }
    Update: {
      id?: string
      team_member_id?: string
      date?: string
      status?: 'on_time' | 'late' | 'no_show' | 'day_off' | 'left_early' | 'late_and_left_early'
      clock_in_time?: string | null
      clock_out_time?: string | null
      notes?: string | null
      recorded_by?: string
      created_at?: string
      updated_at?: string
    }
  }
}