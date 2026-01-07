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
          stripe_customer_id: string | null
          role: 'Founder' | 'HR' | 'Manager' | 'Specialist' | null
          subscription_status: 'active' | 'inactive'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          stripe_customer_id?: string | null
          role?: 'Founder' | 'HR' | 'Manager' | 'Specialist' | null
          subscription_status?: 'active' | 'inactive'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          stripe_customer_id?: string | null
          role?: 'Founder' | 'HR' | 'Manager' | 'Specialist' | null
          subscription_status?: 'active' | 'inactive'
          created_at?: string
        }
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
        }
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
  }
}
