import type { Json } from './database.types';

export type Role = 'Founder' | 'HR' | 'Manager' | 'Specialist';

export interface User {
  id: string;
  email: string;
  username?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_method_id?: string | null;
  card_last_four?: string | null;
  card_brand?: string | null;
  role?: Role | 'Other';
  subscription_status: 'active' | 'inactive';
  payment_method_registered: boolean;
  onboarding_completed: boolean;
  legal_consent_version?: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  google_books_id: string | null;
  title: string;
  author: string;
  cover_url: string | null;
  amazon_link?: string;
  total_pages?: number | null;
  is_manual?: boolean;
}

export interface Commitment {
  id: string;
  user_id: string;
  book_id: string;
  status: 'pending' | 'completed' | 'defaulted' | 'cancelled';
  deadline: string;
  pledge_amount: number;
  currency: string;
  target_pages: number;
  is_freeze_used: boolean;
  defaulted_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface VerificationLog {
  id: string;
  commitment_id: string;
  image_url: string;
  memo_text?: string | null;
  ai_result?: Json | null;
  created_at: string;
}

// ============================================
// New Tables - Phase 2D
// ============================================

export interface PenaltyCharge {
  id: string;
  commitment_id: string;
  user_id: string;
  amount: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  charge_status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'requires_action' | 'refunded';
  failure_reason: string | null;
  failure_code: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  stripe_refund_id: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  quarter: number;
  year: number;
  amount: number;
  currency: string;
  recipient_name: string;
  recipient_url: string | null;
  transfer_date: string | null;
  donated_at: string | null;
  proof_image_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'update' | 'maintenance' | 'important';
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ExpoPushToken {
  id: string;
  user_id: string;
  expo_push_token: string;
  device_id: string | null;
  platform: 'ios' | 'android' | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_user_id: string | null;
  admin_email: string;
  action_type: string;
  target_resource_table: string;
  target_resource_id: string;
  details: Json | null;
  ip_address: string | null;
  created_at: string;
}

export interface SubscriptionCancellation {
  id: string;
  user_id: string;
  reason: string | null;
  cancelled_commitments: number;
  created_at: string;
}
