/**
 * Payment-related TypeScript types
 */

export type PaymentStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'CONFIRMING'
  | 'DONE'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface PaymentFailureRequest {
  order_id: string;
  code: string;
  message: string;
}

export interface PaymentFailureResponse {
  status: PaymentStatus;
  order_id: string;
  error_code: string;
  error_message: string;
}

export interface PaymentStatusResponse {
  order_id: string;
  status: PaymentStatus;
  amount?: number;
  order_name?: string;
  payment_key?: string;
  method?: string;
  customer_data?: Record<string, unknown>;
  created_at?: string;
  requested_at?: string;
  approved_at?: string;
  error_message?: string;
}

export interface PaymentConfirmResponse {
  status: string;
  order_id: string;
  payment_key: string;
  amount: number;
  method: string;
  approved_at: string;
  error_message?: string;
}
