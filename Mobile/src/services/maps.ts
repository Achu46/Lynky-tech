import { Linking } from 'react-native';
import type { DirectionsOutcome } from '../api/types';

export interface OpenDirectionsResult {
  outcome: DirectionsOutcome;
  message: string;
}

export function formatDirectionsStatus(
  status: DirectionsOutcome | null | undefined,
): string {
  switch (status) {
    case 'maps_opened':
      return 'Maps opened';
    case 'browser_fallback_opened':
      return 'Browser fallback opened';
    case 'could_not_open':
      return 'Could not open directions';
    default:
      return 'Sandbox order saved';
  }
}

export async function openDirections(
  latitude: number,
  longitude: number,
  label: string,
): Promise<OpenDirectionsResult> {
  const encodedLabel = encodeURIComponent(label || 'Restaurant');
  const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
  const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  try {
    const canOpenGeo = await Linking.canOpenURL(geoUrl);
    if (canOpenGeo) {
      await Linking.openURL(geoUrl);
      return {
        outcome: 'maps_opened',
        message: 'Maps opened.',
      };
    }
  } catch {
    // Fall through to browser fallback
  }

  try {
    const canOpenWeb = await Linking.canOpenURL(webUrl);
    if (canOpenWeb) {
      await Linking.openURL(webUrl);
      return {
        outcome: 'browser_fallback_opened',
        message: 'Maps app unavailable; browser fallback opened.',
      };
    }
  } catch {
    // Fall through to failure
  }

  return {
    outcome: 'could_not_open',
    message: 'Could not open directions on this device.',
  };
}
