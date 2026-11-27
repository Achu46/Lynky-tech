import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Linking } from 'react-native';
import { ApiError, confirmProposal } from '../src/api/client';
import { formatDirectionsStatus, openDirections } from '../src/services/maps';

describe('Maps handoff & API client', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('formats all 4 directions statuses without claiming navigation', () => {
    expect(formatDirectionsStatus(null)).toBe('Sandbox order saved');
    expect(formatDirectionsStatus('maps_opened')).toBe('Maps opened');
    expect(formatDirectionsStatus('browser_fallback_opened')).toBe(
      'Browser fallback opened',
    );
    expect(formatDirectionsStatus('could_not_open')).toBe(
      'Could not open directions',
    );
  });

  it('uses geo: handler first when available', async () => {
    const canOpenSpy = jest
      .spyOn(Linking, 'canOpenURL')
      .mockResolvedValueOnce(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);

    const res = await openDirections(12.9716, 77.5946, 'Green Leaf Kitchen');
    expect(res.outcome).toBe('maps_opened');
    expect(canOpenSpy).toHaveBeenCalledWith(
      expect.stringContaining('geo:12.9716,77.5946'),
    );
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('geo:12.9716,77.5946'),
    );
  });

  it('falls back to https browser URL when geo handler is unavailable', async () => {
    jest
      .spyOn(Linking, 'canOpenURL')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);

    const res = await openDirections(12.9716, 77.5946, 'Green Leaf Kitchen');
    expect(res.outcome).toBe('browser_fallback_opened');
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=12.9716,77.5946',
    );
  });

  it('reports could_not_open when both geo and browser handlers fail', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);

    const res = await openDirections(12.9716, 77.5946, 'Green Leaf Kitchen');
    expect(res.outcome).toBe('could_not_open');
  });

  it('sends Idempotency-Key header and parses 409 STALE_PROPOSAL', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: false,
      status: 409,
      text: async () =>
        JSON.stringify({
          error: 'STALE_PROPOSAL',
          message: 'Dish became unavailable.',
          new_proposal: {
            id: 'prop-2',
            run_id: 'run-1',
            dish_id: 'm1',
            restaurant_id: 'r1',
            quantity: 1,
            price: 180,
            max_price: 200,
            vegetarian: true,
            wants_directions: false,
            status: 'pending',
            replaces_proposal_id: 'prop-1',
            created_at: new Date().toISOString(),
            resolved_at: null,
          },
        }),
    }));
    (global as any).fetch = fetchMock;

    await expect(confirmProposal('prop-1', 'idem-123')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'STALE_PROPOSAL',
      newProposal: expect.objectContaining({ id: 'prop-2', dish_id: 'm1' }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/proposals/prop-1/confirm'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Idempotency-Key': 'idem-123' }),
      }),
    );
  });

  it('flags network errors as retryable isNetworkOrTimeout', async () => {
    (global as any).fetch = jest.fn(async () => {
      throw new Error('Network request failed');
    });

    try {
      await confirmProposal('prop-1', 'idem-123');
      throw new Error('Expected error');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNetworkOrTimeout).toBe(true);
    }
  });
});
