export type RunStatus =
  | 'running'
  | 'needs_answer'
  | 'needs_approval'
  | 'done'
  | 'failed';

export type DirectionsOutcome =
  | 'maps_opened'
  | 'browser_fallback_opened'
  | 'could_not_open';

export interface DeviceAction {
  type: 'open_maps';
  latitude: number;
  longitude: number;
  label: string;
  order_id: string;
}

export interface ActivityStep {
  step_number: number;
  tool_name: string;
  outcome: 'ok' | 'rejected' | 'error';
  short_note: string;
  started_at: string;
  finished_at: string;
  input_data?: Record<string, unknown>;
  result_data?: Record<string, unknown>;
}

export interface Proposal {
  id: string;
  run_id: string;
  dish_id: string;
  restaurant_id: string;
  dish_name?: string;
  restaurant_name?: string;
  quantity: number;
  price: number;
  max_price: number;
  vegetarian: boolean;
  wants_directions: boolean;
  status: 'pending' | 'confirmed' | 'cancelled' | 'stale';
  replaces_proposal_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Order {
  id: string;
  proposal_id: string;
  idempotency_key: string;
  dish_id: string;
  restaurant_id: string;
  dish_name: string;
  restaurant_name: string;
  quantity: number;
  total: number;
  label: string;
  status: string;
  directions_status: DirectionsOutcome | null;
  created_at: string;
  latitude?: number;
  longitude?: number;
}

export interface AgentRunResponse {
  run_id: string;
  status: RunStatus;
  assistant_message: string;
  proposal?: Proposal;
  device_action?: DeviceAction;
  activity: ActivityStep[];
  retryable?: boolean;
  error_code?: string;
}

export interface ConfirmResponse {
  order: Order;
  device_action?: DeviceAction;
}

export interface PendingProposalState {
  proposal: Proposal;
  idempotencyKey: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  status?: RunStatus;
  retryable?: boolean;
  retryRunId?: string;
  retryText?: string;
}

export interface RunRecord {
  id: string;
  session_id: string;
  user_message: string;
  status: RunStatus;
  reply_text: string | null;
  error_code: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface RunTrace extends RunRecord {
  steps: ActivityStep[];
}
