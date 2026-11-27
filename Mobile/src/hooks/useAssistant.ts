import { useCallback, useState } from 'react';
import {
  ApiError,
  cancelProposal,
  confirmProposal,
  reportDirectionsResult,
  runAgent,
} from '../api/client';
import type { DeviceAction } from '../api/types';
import { useAppState } from '../context/AppState';
import { formatDirectionsStatus, openDirections } from '../services/maps';
import {
  cacheRestaurantCoords,
  generateUuid,
  getOrCreateSessionId,
} from '../services/storage';

export function useAssistant() {
  const {
    sessionId,
    pendingProposal,
    activeRunId,
    appendMessage,
    setPendingProposalState,
    setActiveRunIdState,
    setStatusBanner,
    setStaleMessage,
    setConfirmRetryPending,
    setLastConfirmedOrder,
  } = useAppState();

  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleDeviceAction = useCallback(
    async (action: DeviceAction, restaurantId?: string) => {
      if (restaurantId) {
        await cacheRestaurantCoords(restaurantId, {
          latitude: action.latitude,
          longitude: action.longitude,
          label: action.label,
        });
      }
      const res = await openDirections(
        action.latitude,
        action.longitude,
        action.label,
      );
      const label = formatDirectionsStatus(res.outcome);
      setStatusBanner({
        kind: res.outcome === 'could_not_open' ? 'error' : 'info',
        text: `${label} — ${res.message}`,
      });
      // Report real outcome; never create/retry an order if reporting fails
      reportDirectionsResult(action.order_id, res.outcome).catch(() => {});
    },
    [setStatusBanner],
  );

  const sendMessage = useCallback(
    async (
      rawText: string,
      options?: { retryRunId?: string },
    ): Promise<boolean> => {
      const trimmed = rawText.trim();
      if (!trimmed || isSending) {
        return false;
      }

      setIsSending(true);
      setStatusBanner(null);

      const sid = sessionId || (await getOrCreateSessionId());
      const runIdToUse = options?.retryRunId || activeRunId || generateUuid();

      if (!options?.retryRunId) {
        appendMessage({
          id: generateUuid(),
          role: 'user',
          text: trimmed,
          createdAt: new Date().toISOString(),
        });
      }

      try {
        const res = await runAgent({
          session_id: sid,
          text: trimmed,
          run_id: runIdToUse,
        });

        if (res.status === 'failed') {
          setActiveRunIdState(null);
          appendMessage({
            id: generateUuid(),
            role: 'assistant',
            text:
              res.assistant_message ||
              'Could not reach the assistant. Please retry.',
            createdAt: new Date().toISOString(),
            status: 'failed',
            retryable: res.retryable !== false,
            retryRunId: res.run_id || runIdToUse,
            retryText: trimmed,
          });
          return false;
        }

        if (res.status === 'needs_answer') {
          setActiveRunIdState(res.run_id);
        } else {
          setActiveRunIdState(null);
        }

        appendMessage({
          id: generateUuid(),
          role: 'assistant',
          text: res.assistant_message,
          createdAt: new Date().toISOString(),
          status: res.status,
        });

        if (res.status === 'needs_approval' && res.proposal) {
          setStaleMessage(null);
          setConfirmRetryPending(false);
          setPendingProposalState({
            proposal: res.proposal,
            idempotencyKey: generateUuid(),
          });
        }

        if (res.device_action && res.device_action.type === 'open_maps') {
          await handleDeviceAction(res.device_action);
        }

        return true;
      } catch (err: any) {
        setActiveRunIdState(null);
        const msg =
          err instanceof ApiError
            ? err.message
            : 'Could not reach the server. Please retry.';
        appendMessage({
          id: generateUuid(),
          role: 'assistant',
          text: msg,
          createdAt: new Date().toISOString(),
          status: 'failed',
          retryable: true,
          retryRunId: runIdToUse,
          retryText: trimmed,
        });
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [
      activeRunId,
      appendMessage,
      handleDeviceAction,
      isSending,
      sessionId,
      setActiveRunIdState,
      setConfirmRetryPending,
      setPendingProposalState,
      setStaleMessage,
      setStatusBanner,
    ],
  );

  const confirmPending = useCallback(async () => {
    if (!pendingProposal || isConfirming) {
      return;
    }

    setIsConfirming(true);
    setConfirmRetryPending(false);

    try {
      const res = await confirmProposal(
        pendingProposal.proposal.id,
        pendingProposal.idempotencyKey,
      );

      setPendingProposalState(null);
      setStaleMessage(null);
      setConfirmRetryPending(false);
      setLastConfirmedOrder(res.order);

      setStatusBanner({
        kind: 'success',
        text: `Sandbox order saved: ${res.order.dish_name} at ${res.order.restaurant_name} (Rs ${res.order.total}).`,
      });

      appendMessage({
        id: generateUuid(),
        role: 'assistant',
        text: `Sandbox order saved: ${res.order.dish_name} from ${res.order.restaurant_name} for Rs ${res.order.total}.`,
        createdAt: new Date().toISOString(),
      });

      if (res.device_action && res.device_action.type === 'open_maps') {
        await handleDeviceAction(res.device_action, res.order.restaurant_id);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.code === 'STALE_PROPOSAL') {
          setStaleMessage(
            `Price or availability changed. ${err.message || ''}`.trim(),
          );
          if (err.newProposal) {
            setPendingProposalState({
              proposal: err.newProposal,
              idempotencyKey: generateUuid(),
            });
          } else {
            setPendingProposalState(null);
            appendMessage({
              id: generateUuid(),
              role: 'assistant',
              text:
                err.message ||
                'Price or availability changed and no matching dish remains within your budget.',
              createdAt: new Date().toISOString(),
            });
          }
          return;
        }

        if (err.code === 'NO_VALID_PROPOSAL') {
          setPendingProposalState(null);
          setStatusBanner({
            kind: 'warning',
            text: 'This proposal is no longer valid.',
          });
          return;
        }

        if (err.isNetworkOrTimeout) {
          setConfirmRetryPending(true);
          setStatusBanner({
            kind: 'error',
            text: 'Could not reach the server. Retry',
          });
          return;
        }

        setStatusBanner({
          kind: 'error',
          text: err.message,
        });
      } else {
        setConfirmRetryPending(true);
        setStatusBanner({
          kind: 'error',
          text: 'Could not reach the server. Retry',
        });
      }
    } finally {
      setIsConfirming(false);
    }
  }, [
    appendMessage,
    handleDeviceAction,
    isConfirming,
    pendingProposal,
    setConfirmRetryPending,
    setLastConfirmedOrder,
    setPendingProposalState,
    setStaleMessage,
    setStatusBanner,
  ]);

  const cancelPending = useCallback(async () => {
    if (!pendingProposal || isConfirming) {
      return;
    }
    setIsConfirming(true);
    try {
      await cancelProposal(pendingProposal.proposal.id);
    } catch {
      // Clear local approval card even if already resolved on server
    } finally {
      setPendingProposalState(null);
      setStaleMessage(null);
      setConfirmRetryPending(false);
      setIsConfirming(false);
      setStatusBanner({
        kind: 'info',
        text: 'Proposal cancelled.',
      });
    }
  }, [
    isConfirming,
    pendingProposal,
    setConfirmRetryPending,
    setPendingProposalState,
    setStaleMessage,
    setStatusBanner,
  ]);

  return {
    isSending,
    isConfirming,
    sendMessage,
    confirmPending,
    cancelPending,
  };
}
