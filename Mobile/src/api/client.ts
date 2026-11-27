import { AGENT_TIMEOUT_MS, BACKEND_URL, DEFAULT_TIMEOUT_MS } from '../config';
import type {
  AgentRunResponse,
  ConfirmResponse,
  DirectionsOutcome,
  Order,
  Proposal,
  RunRecord,
  RunTrace,
} from './types';

export class ApiError extends Error {
  status: number;
  code: string;
  isNetworkOrTimeout: boolean;
  newProposal: Proposal | null;

  constructor(options: {
    message: string;
    status?: number;
    code?: string;
    isNetworkOrTimeout?: boolean;
    newProposal?: Proposal | null;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status ?? 0;
    this.code = options.code ?? 'UNKNOWN_ERROR';
    this.isNetworkOrTimeout = Boolean(options.isNetworkOrTimeout);
    this.newProposal = options.newProposal ?? null;
  }
}

async function requestJson<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const base = BACKEND_URL.replace(/\/$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const reqHeaders: Record<string, string> = { ...headers };
    let payload: string | undefined;
    if (body !== undefined) {
      reqHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const res = await fetch(`${base}${path}`, {
      method,
      headers: reqHeaders,
      body: payload,
      signal: controller.signal,
    });

    const rawText = await res.text();
    let data: any = null;
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = { message: rawText };
      }
    }

    if (!res.ok) {
      const code = data?.code || data?.error || `HTTP_${res.status}`;
      const message =
        data?.message || `Request failed with status ${res.status}`;
      throw new ApiError({
        status: res.status,
        code,
        message,
        isNetworkOrTimeout: false,
        newProposal: data?.new_proposal ?? null,
      });
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    const isAbort = err?.name === 'AbortError';
    throw new ApiError({
      message: isAbort
        ? 'Request timed out. Please retry.'
        : 'Could not reach the server. Retry',
      code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR',
      isNetworkOrTimeout: true,
    });
  } finally {
    clearTimeout(timer);
  }
}

export function runAgent(params: {
  session_id: string;
  text: string;
  run_id?: string;
}): Promise<AgentRunResponse> {
  return requestJson<AgentRunResponse>('/api/agent/run', {
    method: 'POST',
    body: params,
    timeoutMs: AGENT_TIMEOUT_MS,
  });
}

export function getProposal(id: string): Promise<Proposal> {
  return requestJson<Proposal>(`/api/proposals/${encodeURIComponent(id)}`);
}

export function confirmProposal(
  id: string,
  idempotencyKey: string,
): Promise<ConfirmResponse> {
  return requestJson<ConfirmResponse>(
    `/api/proposals/${encodeURIComponent(id)}/confirm`,
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
    },
  );
}

export function cancelProposal(id: string): Promise<Proposal> {
  return requestJson<Proposal>(
    `/api/proposals/${encodeURIComponent(id)}/cancel`,
    {
      method: 'POST',
    },
  );
}

export async function getOrders(): Promise<Order[]> {
  const res = await requestJson<{ orders: Order[] }>('/api/orders');
  return res.orders ?? [];
}

export async function getLastOrder(): Promise<Order> {
  const res = await requestJson<{ order: Order }>('/api/orders/last');
  return res.order;
}

export async function reportDirectionsResult(
  orderId: string,
  outcome: DirectionsOutcome,
): Promise<Order> {
  const res = await requestJson<{ order: Order }>(
    `/api/orders/${encodeURIComponent(orderId)}/directions-result`,
    {
      method: 'POST',
      body: { outcome },
    },
  );
  return res.order;
}

export async function getRuns(): Promise<RunRecord[]> {
  const res = await requestJson<{ runs: RunRecord[] }>('/api/runs');
  return res.runs ?? [];
}

export function getRunTrace(id: string): Promise<RunTrace> {
  return requestJson<RunTrace>(`/api/runs/${encodeURIComponent(id)}`);
}
