import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
  type AppStateStatus,
} from 'react-native';
import Voice, {
  type SpeechErrorEvent,
  type SpeechResultsEvent,
} from '@react-native-voice/voice';

export interface UseVoiceResult {
  voiceAvailable: boolean;
  permissionDenied: boolean;
  isRecording: boolean;
  partialText: string;
  transcript: string;
  voiceNotice: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  clearNotice: () => void;
  openAppSettings: () => void;
}

export function useVoice(onFinalTranscript?: (text: string) => void): UseVoiceResult {
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [transcript, setTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const partialRef = useRef('');
  const gotResultRef = useRef(false);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

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

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const text = e.value?.[0]?.trim() || '';
      partialRef.current = text;
      setPartialText(text);
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const text = (e.value?.[0] || partialRef.current || '').trim();
      gotResultRef.current = true;
      setIsRecording(false);
      setPartialText('');
      if (!text) {
        setVoiceNotice('I did not catch anything, try again');
        return;
      }
      setVoiceNotice(null);
      setTranscript(text);
      onFinalRef.current?.(text);
    };

    Voice.onSpeechEnd = () => {
      setIsRecording(false);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      setIsRecording(false);
      const fallback = partialRef.current.trim();
      if (fallback && !gotResultRef.current) {
        gotResultRef.current = true;
        setPartialText('');
        setVoiceNotice(null);
        setTranscript(fallback);
        onFinalRef.current?.(fallback);
        return;
      }
      setPartialText('');
      const msg = e.error?.message || '';
      // Codes 6 (no speech) & 7 (no match) or empty speech
      if (
        msg.includes('No match') ||
        msg.includes('No speech') ||
        e.error?.code === '6' ||
        e.error?.code === '7'
      ) {
        setVoiceNotice('I did not catch anything, try again');
      } else if (msg.includes('permissions') || e.error?.code === '9') {
        setPermissionDenied(true);
        setVoiceNotice('Voice is unavailable. You can type instead');
      } else {
        setVoiceNotice('I did not catch anything, try again');
      }
    };

    return () => {
      mounted = false;
      Voice.destroy().then(Voice.removeAllListeners).catch(() => {});
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState !== 'active') {
          setIsRecording(false);
          Voice.stop().catch(() => {});
        }
      },
    );
    return () => sub.remove();
  }, []);

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
    try {
      gotResultRef.current = false;
      partialRef.current = '';
      setPartialText('');
      setVoiceNotice(null);
      setIsRecording(true);
      await Voice.start('en-IN');
    } catch {
      setIsRecording(false);
      setVoiceNotice('Could not start voice recording. You can type instead.');
    }
  }, [requestMicPermission, voiceAvailable]);

  const stopRecording = useCallback(async () => {
    try {
      await Voice.stop();
    } catch {
      // ignore stop errors
    } finally {
      setIsRecording(false);
      if (!gotResultRef.current && partialRef.current.trim()) {
        const text = partialRef.current.trim();
        gotResultRef.current = true;
        setPartialText('');
        setTranscript(text);
        onFinalRef.current?.(text);
      } else if (!gotResultRef.current && !partialRef.current.trim()) {
        setVoiceNotice('I did not catch anything, try again');
      }
    }
  }, []);

  const clearNotice = useCallback(() => {
    setVoiceNotice(null);
  }, []);

  const openAppSettings = useCallback(() => {
    Linking.openSettings().catch(() => {});
  }, []);

  return {
    voiceAvailable,
    permissionDenied,
    isRecording,
    partialText,
    transcript,
    voiceNotice,
    startRecording,
    stopRecording,
    clearNotice,
    openAppSettings,
  };
}
