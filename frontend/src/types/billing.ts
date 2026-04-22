export interface BillingBalance {
  currency: string;
  balance: number;
  updated_at: string;
}

export interface BillingTransaction {
  id: number;
  user_id: string;
  entry_type: string;
  currency: string;
  amount: number;
  balance_after: number;
  description: string | null;
  source_type: string | null;
  source_id: string | null;
  reference_key: string | null;
  created_at: string;
  username?: string | null;
  display_name?: string | null;
  email?: string | null;
}

export interface BillingSummary {
  balances: BillingBalance[];
  recent_transactions: BillingTransaction[];
  recent_orders?: BillingPaymentOrder[];
}

export interface BillingAdminUser {
  user_id: string;
  username: string;
  email: string | null;
  display_name: string;
  role: string;
  balances: BillingBalance[];
}

export interface BillingAdminOverview {
  users: BillingAdminUser[];
  recent_transactions: BillingTransaction[];
}

export interface BillingAdminTopupPayload {
  user_id?: string;
  username?: string;
  email?: string;
  amount: number;
  currency: string;
  note?: string;
}

export interface BillingAdminTopupResponse {
  transaction: BillingTransaction;
  balances: BillingBalance[];
}

export interface BillingPaymentOrder {
  id: number;
  user_id: string;
  provider: string;
  status: string;
  currency: string;
  amount: number;
  description: string | null;
  checkout_session_id: string | null;
  payment_intent_id: string | null;
  checkout_url: string | null;
  failed_reason: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingCheckoutPackage {
  id: string;
  currency: string;
  amount: number;
  label: string;
  description: string;
}

export interface BillingCheckoutConfig {
  enabled: boolean;
  mode: string;
  public_app_url: string | null;
  webhook_endpoint: string | null;
  packages: BillingCheckoutPackage[];
}

export interface BillingCheckoutSessionPayload {
  package_id: string;
}

export interface BillingCheckoutSessionResponse {
  order: BillingPaymentOrder;
  checkout_url: string;
}

export interface BillingCheckoutStatusResponse {
  order: BillingPaymentOrder;
  stripe_session_status: string | null;
  stripe_payment_status: string | null;
}
