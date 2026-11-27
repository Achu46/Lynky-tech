import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  type AppStateStatus,
} from 'react-native';
import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
  type SpeechVolumeChangeEvent,
} from '@react-native-voice/voice';

export interface UseVoiceResult {
  voiceAvailable: boolean;
  permissionDenied: boolean;
  isOverlayOpen: boolean;
  isRecording: boolean;
  isReady: boolean;
  isProcessing: boolean;
  overlayPrompt: string | null;
  volumeAnim: Animated.Value;
  partialText: string;
  transcript: string;
  voiceNotice: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
  clearNotice: () => void;
  openAppSettings: () => void;
}

const ANDROID_VOICE_OPTIONS = {
  EXTRA_LANGUAGE_MODEL: 'LANGUAGE_MODEL_FREE_FORM',
  EXTRA_PARTIAL_RESULTS: true,
  EXTRA_MAX_RESULTS: 5,
};

export function useVoice(
  onFinalTranscript?: (text: string) => void,
): UseVoiceResult {
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overlayPrompt, setOverlayPrompt] = useState<string | null>(null);
  const [partialText, setPartialText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const volumeAnim = useRef(new Animated.Value(0)).current;
  const partialRef = useRef('');
  const gotResultRef = useRef(false);
  const cancelledRef = useRef(false);
  const activeSessionRef = useRef(0);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const clearFinishTimer = useCallback(() => {
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  const resetVolume = useCallback(() => {
    Animated.timing(volumeAnim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [volumeAnim]);

  const finalizeWithText = useCallback(
    (text: string) => {
      clearFinishTimer();
      gotResultRef.current = true;
      setIsOverlayOpen(false);
      setIsRecording(false);
      setIsReady(false);
      setIsProcessing(false);
      setOverlayPrompt(null);
      setPartialText('');
      partialRef.current = '';
      resetVolume();
      setVoiceNotice(null);
      setTranscript(text);
      onFinalRef.current?.(text);
    },
    [clearFinishTimer, resetVolume],
  );

  useEffect(() => {
    let mounted = true;

    async function checkAvailability() {
      try {
        const available = await Voice.isAvailable();
        if (available) {
          if (mounted) {
            setVoiceAvailable(true);
          }
          return;
        }
        const services =
          typeof Voice.getSpeechRecognitionServices === 'function'
            ? await Voice.getSpeechRecognitionServices()
            : [];
        if (mounted) {
          setVoiceAvailable(Array.isArray(services) && services.length > 0);
        }
      } catch {
        if (mounted) {
          setVoiceAvailable(false);
        }
      }
    }

    checkAvailability();

    Voice.onSpeechStart = () => {
      if (!cancelledRef.current) {
        setIsReady(true);
        setOverlayPrompt(null);
      }
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      if (cancelledRef.current) {
        return;
      }
      const text = e.value?.[0]?.trim() || '';
      if (text) {
        partialRef.current = text;
        setPartialText(text);
        setOverlayPrompt(null);
      }
    };

    Voice.onSpeechVolumeChanged = (e: SpeechVolumeChangeEvent) => {
      if (cancelledRef.current) {
        return;
      }
      const raw = typeof e.value === 'number' ? e.value : 0;
      const normalized = Math.max(0, Math.min(1, (raw + 1) / 10));
      volumeAnim.setValue(normalized);
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      if (cancelledRef.current) {
        return;
      }
      const rawFirst = e.value?.[0]?.trim() || '';
      if (gotResultRef.current && !rawFirst) {
        return;
      }
      const text = (rawFirst || partialRef.current || '').trim();
      if (!text) {
        clearFinishTimer();
        setIsRecording(false);
        setIsReady(false);
        setIsProcessing(false);
        setPartialText('');
        partialRef.current = '';
        resetVolume();
        // Keep VoiceOverlay open so user can tap the sphere to speak again
        setOverlayPrompt("Didn't catch anything. Tap the sphere to speak.");
        return;
      }
      finalizeWithText(text);
    };

    Voice.onSpeechEnd = () => {
      if (cancelledRef.current || gotResultRef.current) {
        return;
      }
      setIsProcessing(true);
      resetVolume();
      const sessionAtEnd = activeSessionRef.current;
      clearFinishTimer();
      finishTimerRef.current = setTimeout(() => {
        if (
          activeSessionRef.current !== sessionAtEnd ||
          gotResultRef.current ||
          cancelledRef.current
        ) {
          return;
        }
        const fallback = partialRef.current.trim();
        if (fallback) {
          finalizeWithText(fallback);
        } else {
          setIsRecording(false);
          setIsReady(false);
          setIsProcessing(false);
          setPartialText('');
          setOverlayPrompt("Didn't catch anything. Tap the sphere to speak.");
        }
      }, 2200);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      if (cancelledRef.current) {
        return;
      }
      clearFinishTimer();
      setIsRecording(false);
      setIsReady(false);
      setIsProcessing(false);
      resetVolume();

      const fallback = partialRef.current.trim();
      if (fallback && !gotResultRef.current) {
        finalizeWithText(fallback);
        return;
      }
      setPartialText('');
      partialRef.current = '';

      const msg = e.error?.message || '';
      const code = String(e.error?.code || '');
      if (code === '1' || code === '2' || /network/i.test(msg)) {
        setOverlayPrompt(
          'You appear to be offline. Connect to internet and tap the sphere.',
        );
      } else if (msg.includes('permissions') || code === '9') {
        setIsOverlayOpen(false);
        setPermissionDenied(true);
        setVoiceNotice('Voice is unavailable. You can type instead');
      } else {
        // Keep VoiceOverlay open on silence/no-match instead of closing automatically
        setOverlayPrompt("Didn't catch anything. Tap the sphere to speak.");
      }
    };

    return () => {
      mounted = false;
      clearFinishTimer();
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, [clearFinishTimer, finalizeWithText, resetVolume, volumeAnim]);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState !== 'active') {
          clearFinishTimer();
          setIsOverlayOpen(false);
          setIsRecording(false);
          setIsReady(false);
          setIsProcessing(false);
          setOverlayPrompt(null);
          resetVolume();
          Voice.stop().catch(() => {});
        }
      },
    );
    return () => sub.remove();
  }, [clearFinishTimer, resetVolume]);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'Pocket Operator needs microphone access for voice commands.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setPermissionDenied(false);
        return true;
      }
      setPermissionDenied(true);
      setVoiceNotice('Voice is unavailable. You can type instead');
      return false;
    } catch {
      setPermissionDenied(true);
      setVoiceNotice('Voice is unavailable. You can type instead');
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!voiceAvailable) {
      setVoiceNotice('Speech recognition is unavailable. You can type instead.');
      return;
    }
    const allowed = await requestMicPermission();
    if (!allowed) {
      return;
    }

    clearFinishTimer();
    activeSessionRef.current += 1;
    const mySession = activeSessionRef.current;

    cancelledRef.current = true;
    await Voice.cancel().catch(() => {});
    if (activeSessionRef.current !== mySession) {
      return;
    }

    try {
      cancelledRef.current = false;
      gotResultRef.current = false;
      partialRef.current = '';
      setPartialText('');
      setVoiceNotice(null);
      setOverlayPrompt(null);
      setIsReady(false);
      setIsProcessing(false);
      volumeAnim.setValue(0);
      setIsOverlayOpen(true);
      setIsRecording(true);
      await Voice.start(
        'en-IN',
        Platform.OS === 'android' ? ANDROID_VOICE_OPTIONS : undefined,
      );
    } catch {
      setIsRecording(false);
      setIsReady(false);
      setIsProcessing(false);
      resetVolume();
      setOverlayPrompt('Could not start mic. Tap the sphere to try again.');
    }
  }, [
    clearFinishTimer,
    requestMicPermission,
    resetVolume,
    voiceAvailable,
    volumeAnim,
  ]);

  const stopRecording = useCallback(async () => {
    if (gotResultRef.current) {
      setIsOverlayOpen(false);
      return;
    }
    if (!isRecording && !isProcessing) {
      // User tapped Done while paused in retry state -> close overlay cleanly
      setIsOverlayOpen(false);
      setOverlayPrompt(null);
      return;
    }
    if (isProcessing) {
      return;
    }

    setIsProcessing(true);
    resetVolume();
    const sessionAtStop = activeSessionRef.current;

    try {
      await Voice.stop();
    } catch {
      // ignore stop errors
    }

    if (
      activeSessionRef.current !== sessionAtStop ||
      gotResultRef.current ||
      cancelledRef.current
    ) {
      return;
    }

    clearFinishTimer();
    finishTimerRef.current = setTimeout(() => {
      if (
        activeSessionRef.current !== sessionAtStop ||
        gotResultRef.current ||
        cancelledRef.current
      ) {
        return;
      }
      const fallback = partialRef.current.trim();
      if (fallback) {
        finalizeWithText(fallback);
      } else {
        setIsRecording(false);
        setIsReady(false);
        setIsProcessing(false);
        setPartialText('');
        setOverlayPrompt("Didn't catch anything. Tap the sphere to speak.");
      }
    }, 1500);
  }, [
    clearFinishTimer,
    finalizeWithText,
    isProcessing,
    isRecording,
    resetVolume,
  ]);

  const cancelRecording = useCallback(async () => {
    clearFinishTimer();
    activeSessionRef.current += 1;
    cancelledRef.current = true;
    gotResultRef.current = true;
    partialRef.current = '';
    setIsOverlayOpen(false);
    setIsRecording(false);
    setIsReady(false);
    setIsProcessing(false);
    setOverlayPrompt(null);
    setPartialText('');
    setVoiceNotice(null);
    resetVolume();
    try {
      await Voice.cancel();
    } catch {
      // ignore cancel errors
    }
  }, [clearFinishTimer, resetVolume]);

  const clearNotice = useCallback(() => {
    setVoiceNotice(null);
  }, []);

  const openAppSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  return {
    voiceAvailable,
    permissionDenied,
    isOverlayOpen,
    isRecording,
    isReady,
    isProcessing,
    overlayPrompt,
    volumeAnim,
    partialText,
    transcript,
    voiceNotice,
    startRecording,
    stopRecording,
    cancelRecording,
    clearNotice,
    openAppSettings,
  };
}
