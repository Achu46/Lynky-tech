import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState as RNAppState, type AppStateStatus } from 'react-native';
import { ApiError, getProposal } from '../api/client';
import type {
  ChatMessage,
  Order,
  PendingProposalState,
} from '../api/types';
import {
  getOrCreateSessionId,
  loadActiveRunId,
  loadMessages,
  loadPendingProposal,
  saveActiveRunId,
  saveMessages,
  savePendingProposal,
} from '../services/storage';

export interface BannerInfo {
  kind: 'info' | 'warning' | 'error' | 'success';
  text: string;
}

interface AppContextValue {
  hydrated: boolean;
  sessionId: string | null;
  messages: ChatMessage[];
  pendingProposal: PendingProposalState | null;
  activeRunId: string | null;
  statusBanner: BannerInfo | null;
  staleMessage: string | null;
  confirmRetryPending: boolean;
  lastConfirmedOrder: Order | null;
  appendMessage: (msg: ChatMessage) => void;
  setPendingProposalState: (pending: PendingProposalState | null) => void;
  setActiveRunIdState: (runId: string | null) => void;
  setStatusBanner: (banner: BannerInfo | null) => void;
  setStaleMessage: (msg: string | null) => void;
  setConfirmRetryPending: (pending: boolean) => void;
  setLastConfirmedOrder: (order: Order | null) => void;
  refreshPendingProposal: () => Promise<void>;
  clearMessages: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hydrated, setHydrated] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingProposal, setPendingProposal] =
    useState<PendingProposalState | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<BannerInfo | null>(null);
  const [staleMessage, setStaleMessage] = useState<string | null>(null);
  const [confirmRetryPending, setConfirmRetryPending] = useState(false);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<Order | null>(
    null,
  );

  const pendingRef = useRef<PendingProposalState | null>(null);
  pendingRef.current = pendingProposal;

  const setPendingProposalState = useCallback(
    (next: PendingProposalState | null) => {
      pendingRef.current = next;
      setPendingProposal(next);
      savePendingProposal(next).catch(() => {});
    },
    [],
  );

  const setActiveRunIdState = useCallback((runId: string | null) => {
    setActiveRunId(runId);
    saveActiveRunId(runId).catch(() => {});
  }, []);

  const appendMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      saveMessages(next).catch(() => {});
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    saveMessages([]).catch(() => {});
  }, []);

  const refreshPendingProposal = useCallback(async () => {
    const current = pendingRef.current;
    if (!current) {
      return;
    }
    try {
      const fresh = await getProposal(current.proposal.id);
      if (fresh.status !== 'pending') {
        setPendingProposalState(null);
        setConfirmRetryPending(false);
        setStatusBanner({
          kind: 'info',
          text: `Prepared order is no longer pending (${fresh.status}).`,
        });
      } else {
        setPendingProposalState({
          proposal: {
            ...current.proposal,
            ...fresh,
          },
          idempotencyKey: current.idempotencyKey,
        });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPendingProposalState(null);
        setConfirmRetryPending(false);
      }
      // On offline/network error when resuming, keep stored pending proposal so nothing is lost
    }
  }, [setPendingProposalState]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const [sid, storedMsgs, storedPending, storedRunId] = await Promise.all([
        getOrCreateSessionId(),
        loadMessages(),
        loadPendingProposal(),
        loadActiveRunId(),
      ]);
      if (cancelled) {
        return;
      }
      setSessionId(sid);
      setMessages(storedMsgs);
      pendingRef.current = storedPending;
      setPendingProposal(storedPending);
      setActiveRunId(storedRunId);
      setHydrated(true);

      if (storedPending) {
        await refreshPendingProposal();
      }
    }

    hydrate().catch(() => {
      if (!cancelled) {
        setHydrated(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshPendingProposal]);

  useEffect(() => {
    const sub = RNAppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          refreshPendingProposal().catch(() => {});
        }
      },
    );
    return () => sub.remove();
  }, [refreshPendingProposal]);

  return (
    <AppContext.Provider
      value={{
        hydrated,
        sessionId,
        messages,
        pendingProposal,
        activeRunId,
        statusBanner,
        staleMessage,
        confirmRetryPending,
        lastConfirmedOrder,
        appendMessage,
        setPendingProposalState,
        setActiveRunIdState,
        setStatusBanner,
        setStaleMessage,
        setConfirmRetryPending,
        setLastConfirmedOrder,
        refreshPendingProposal,
        clearMessages,
      }}>
      {children}
    </AppContext.Provider>
  );
};

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return ctx;
}
