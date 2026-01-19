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
      users: {
        Row: {
          id: string
          email: string
          username: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          card_last_four: string | null
          card_brand: string | null
          role: 'Founder' | 'HR' | 'Manager' | 'Specialist' | 'Other'
          subscription_status: 'active' | 'inactive'
          payment_method_registered: boolean
          onboarding_completed: boolean
          legal_consent_version: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          username?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          card_last_four?: string | null
          card_brand?: string | null
          role?: 'Founder' | 'HR' | 'Manager' | 'Specialist' | 'Other'
          subscription_status?: 'active' | 'inactive'
          payment_method_registered?: boolean
          onboarding_completed?: boolean
          legal_consent_version?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          username?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          card_last_four?: string | null
          card_brand?: string | null
          role?: 'Founder' | 'HR' | 'Manager' | 'Specialist' | 'Other'
          subscription_status?: 'active' | 'inactive'
          payment_method_registered?: boolean
          onboarding_completed?: boolean
          legal_consent_version?: string | null
          created_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          google_books_id: string | null
          title: string
          author: string
          cover_url: string | null
          amazon_link: string | null
          total_pages: number | null
          is_manual: boolean
          created_at: string
        }
        Insert: {
          id?: string
          google_books_id?: string | null
          title: string
          author: string
          cover_url?: string | null
          amazon_link?: string | null
          total_pages?: number | null
          is_manual?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          google_books_id?: string | null
          title?: string
          author?: string
          cover_url?: string | null
          amazon_link?: string | null
          total_pages?: number | null
          is_manual?: boolean
          created_at?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: 'pending' | 'completed' | 'defaulted' | 'cancelled'
          deadline: string
          pledge_amount: number
          currency: string
          target_pages: number
          is_freeze_used: boolean
          defaulted_at: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status?: 'pending' | 'completed' | 'defaulted' | 'cancelled'
          deadline: string
          pledge_amount: number
          currency?: string
          target_pages?: number
          is_freeze_used?: boolean
          defaulted_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          status?: 'pending' | 'completed' | 'defaulted' | 'cancelled'
          deadline?: string
          pledge_amount?: number
          currency?: string
          target_pages?: number
          is_freeze_used?: boolean
          defaulted_at?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commitments_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commitments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      verification_logs: {
        Row: {
          id: string
          commitment_id: string
          image_url: string
          memo_text: string | null
          ai_result: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          image_url: string
          memo_text?: string | null
          ai_result?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          image_url?: string
          memo_text?: string | null
          ai_result?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          }
        ]
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      book_tags: {
        Row: {
          id: string
          commitment_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          tag_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_tags_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          }
        ]
      }
      reading_sessions: {
        Row: {
          id: string
          user_id: string
          book_id: string | null
          duration_seconds: number
          completed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id?: string | null
          duration_seconds: number
          completed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string | null
          duration_seconds?: number
          completed_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          }
        ]
      }
      expo_push_tokens: {
        Row: {
          id: string
          user_id: string
          expo_push_token: string
          device_id: string | null
          platform: 'ios' | 'android' | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          expo_push_token: string
          device_id?: string | null
          platform?: 'ios' | 'android' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          expo_push_token?: string
          device_id?: string | null
          platform?: 'ios' | 'android' | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expo_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      penalty_charges: {
        Row: {
          id: string
          commitment_id: string
          user_id: string
          amount: number
          currency: string
          stripe_payment_intent_id: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          charge_status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'requires_action' | 'refunded'
          failure_reason: string | null
          failure_code: string | null
          attempt_count: number
          last_attempt_at: string | null
          next_retry_at: string | null
          stripe_refund_id: string | null
          refunded_at: string | null
          refunded_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          commitment_id: string
          user_id: string
          amount: number
          currency?: string
          stripe_payment_intent_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          charge_status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'requires_action' | 'refunded'
          failure_reason?: string | null
          failure_code?: string | null
          attempt_count?: number
          last_attempt_at?: string | null
          next_retry_at?: string | null
          stripe_refund_id?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          commitment_id?: string
          user_id?: string
          amount?: number
          currency?: string
          stripe_payment_intent_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          charge_status?: 'pending' | 'processing' | 'succeeded' | 'failed' | 'requires_action' | 'refunded'
          failure_reason?: string | null
          failure_code?: string | null
          attempt_count?: number
          last_attempt_at?: string | null
          next_retry_at?: string | null
          stripe_refund_id?: string | null
          refunded_at?: string | null
          refunded_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "penalty_charges_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: true
            referencedRelation: "commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penalty_charges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      admin_audit_logs: {
        Row: {
          id: string
          admin_user_id: string | null
          admin_email: string
          action_type: string
          target_resource_table: string
          target_resource_id: string
          details: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_user_id?: string | null
          admin_email: string
          action_type: string
          target_resource_table: string
          target_resource_id: string
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_user_id?: string | null
          admin_email?: string
          action_type?: string
          target_resource_table?: string
          target_resource_id?: string
          details?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subscription_cancellations: {
        Row: {
          id: string
          user_id: string
          reason: string | null
          cancelled_commitments: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          reason?: string | null
          cancelled_commitments?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          reason?: string | null
          cancelled_commitments?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_cancellations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      donations: {
        Row: {
          id: string
          quarter: number
          year: number
          amount: number
          currency: string
          recipient_name: string
          recipient_url: string | null
          transfer_date: string | null
          donated_at: string | null
          proof_image_url: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quarter: number
          year: number
          amount: number
          currency?: string
          recipient_name: string
          recipient_url?: string | null
          transfer_date?: string | null
          donated_at?: string | null
          proof_image_url?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quarter?: number
          year?: number
          amount?: number
          currency?: string
          recipient_name?: string
          recipient_url?: string | null
          transfer_date?: string | null
          donated_at?: string | null
          proof_image_url?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          id: string
          title: string
          body: string
          type: 'info' | 'update' | 'maintenance' | 'important'
          published_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          type?: 'info' | 'update' | 'maintenance' | 'important'
          published_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          type?: 'info' | 'update' | 'maintenance' | 'important'
          published_at?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for convenience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
