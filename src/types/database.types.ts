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
          role: 'Founder' | 'HR' | 'Manager' | 'Specialist' | 'Other' | null
          subscription_status: 'active' | 'inactive'
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
          role?: 'Founder' | 'HR' | 'Manager' | 'Specialist' | 'Other' | null
          subscription_status?: 'active' | 'inactive'
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
          role?: 'Founder' | 'HR' | 'Manager' | 'Specialist' | 'Other' | null
          subscription_status?: 'active' | 'inactive'
          created_at?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          google_books_id: string
          title: string
          author: string
          cover_url: string | null
          amazon_link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          google_books_id: string
          title: string
          author: string
          cover_url?: string | null
          amazon_link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          google_books_id?: string
          title?: string
          author?: string
          cover_url?: string | null
          amazon_link?: string | null
          created_at?: string
        }
        Relationships: []
      }
      commitments: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: 'pending' | 'completed' | 'defaulted'
          deadline: string
          pledge_amount: number
          currency: string
          target_pages: number
          is_freeze_used: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status?: 'pending' | 'completed' | 'defaulted'
          deadline: string
          pledge_amount: number
          currency?: string
          target_pages?: number
          is_freeze_used?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          status?: 'pending' | 'completed' | 'defaulted'
          deadline?: string
          pledge_amount?: number
          currency?: string
          target_pages?: number
          is_freeze_used?: boolean
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
