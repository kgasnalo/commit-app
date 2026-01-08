import type { Json } from './database.types';

export type Role = 'Founder' | 'HR' | 'Manager' | 'Specialist';

export interface User {
  id: string;
  email: string;
  stripe_customer_id?: string;
  role?: Role;
  subscription_status: 'active' | 'inactive';
  created_at: string;
}

export interface Book {
  id: string;
  google_books_id: string;
  title: string;
  author: string;
  cover_url: string;
  amazon_link?: string;
}

export interface Commitment {
  id: string;
  user_id: string;
  book_id: string;
  status: 'pending' | 'completed' | 'defaulted';
  deadline: string;
  pledge_amount: number;
  currency: string;
  target_pages: number;
  created_at: string;
}

export interface VerificationLog {
  id: string;
  commitment_id: string;
  image_url: string;
  memo_text?: string;
  ai_result?: Json | null;
  created_at: string;
}
