import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage, PendingProposalState } from '../api/types';

const KEYS = {
  SESSION_ID: 'po_session_id',
  PENDING_PROPOSAL: 'po_pending_proposal',
  CHAT_MESSAGES: 'po_chat_messages',
  ACTIVE_RUN_ID: 'po_active_run_id',
  RESTAURANT_COORDS: 'po_restaurant_coords',
};

export interface CachedCoords {
  latitude: number;
  longitude: number;
  label: string;
}

export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreateSessionId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.SESSION_ID);
  if (existing) {
    return existing;
  }
  const created = generateUuid();
  await AsyncStorage.setItem(KEYS.SESSION_ID, created);
  return created;
}

export async function savePendingProposal(
  pending: PendingProposalState | null,
): Promise<void> {
  if (!pending) {
    await AsyncStorage.removeItem(KEYS.PENDING_PROPOSAL);
    return;
  }
  await AsyncStorage.setItem(KEYS.PENDING_PROPOSAL, JSON.stringify(pending));
}

export async function loadPendingProposal(): Promise<PendingProposalState | null> {
  const raw = await AsyncStorage.getItem(KEYS.PENDING_PROPOSAL);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PendingProposalState;
  } catch {
    return null;
  }
}

export async function saveMessages(messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CHAT_MESSAGES, JSON.stringify(messages));
}

export async function loadMessages(): Promise<ChatMessage[]> {
  const raw = await AsyncStorage.getItem(KEYS.CHAT_MESSAGES);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as ChatMessage[];
  } catch {
    return [];
  }
}

export async function saveActiveRunId(runId: string | null): Promise<void> {
  if (!runId) {
    await AsyncStorage.removeItem(KEYS.ACTIVE_RUN_ID);
    return;
  }
  await AsyncStorage.setItem(KEYS.ACTIVE_RUN_ID, runId);
}

export async function loadActiveRunId(): Promise<string | null> {
  return AsyncStorage.getItem(KEYS.ACTIVE_RUN_ID);
}

export async function cacheRestaurantCoords(
  restaurantId: string,
  coords: CachedCoords,
): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.RESTAURANT_COORDS);
  let map: Record<string, CachedCoords> = {};
  if (raw) {
    try {
      map = JSON.parse(raw);
    } catch {
      map = {};
    }
  }
  map[restaurantId] = coords;
  await AsyncStorage.setItem(KEYS.RESTAURANT_COORDS, JSON.stringify(map));
}

export async function getCachedRestaurantCoords(
  restaurantId: string,
): Promise<CachedCoords | null> {
  const raw = await AsyncStorage.getItem(KEYS.RESTAURANT_COORDS);
  if (!raw) {
    return null;
  }
  try {
    const map = JSON.parse(raw) as Record<string, CachedCoords>;
    return map[restaurantId] ?? null;
  } catch {
    return null;
  }
}
