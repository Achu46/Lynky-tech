import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { VoiceOrb } from './VoiceOrb';

interface VoiceOverlayProps {
  visible: boolean;
  isListening: boolean;
  isReady?: boolean;
  isProcessing?: boolean;
  overlayPrompt?: string | null;
  partialText: string;
  volumeAnim?: Animated.Value;
  onRetryListen: () => void;
  onStop: () => void;
  onCancel: () => void;
}

/**
 * Minimal ChatGPT-style voice listening modal with the swirling fluid cloud sphere.
 * Stays open on silence so the user controls when to speak again or close.
 */
export const VoiceOverlay: React.FC<VoiceOverlayProps> = ({
  visible,
  isListening,
  isReady = true,
  isProcessing = false,
  overlayPrompt = null,
  partialText,
  volumeAnim,
  onRetryListen,
  onStop,
  onCancel,
}) => {
  const { isDark, theme } = useTheme();
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const floatScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!visible) {
      backdropOpacity.setValue(0);
      floatScale.setValue(0.92);
      return;
    }

    const enterAnim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(floatScale, {
        toValue: 1,
        friction: 7,
        tension: 65,
        useNativeDriver: true,
      }),
    ]);

    enterAnim.start();
    return () => {
      enterAnim.stop();
    };
  }, [backdropOpacity, floatScale, visible]);

  const statusText = isProcessing
    ? 'Finishing...'
    : overlayPrompt
      ? overlayPrompt
      : isListening
        ? isReady
          ? 'Speak now...'
          : 'Starting mic...'
        : 'Tap the sphere to speak';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}>
      <Animated.View
        style={[
          styles.backdrop,
          {
            backgroundColor: isDark
              ? 'rgba(0, 0, 0, 0.94)'
              : 'rgba(248, 252, 249, 0.94)',
            opacity: backdropOpacity,
          },
        ]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.topSpacer} />

          <Animated.View
            style={[
              styles.centerStage,
              { transform: [{ scale: floatScale }] },
            ]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                isListening ? 'Voice listening active' : 'Tap sphere to speak'
              }
              activeOpacity={0.85}
              disabled={isListening && !overlayPrompt}
              onPress={onRetryListen}>
              <VoiceOrb
                active={isListening}
                size={196}
                volumeAnim={volumeAnim}
              />
            </TouchableOpacity>

            {partialText ? (
              <Text
                style={[styles.transcriptText, { color: theme.textPrimary }]}
                numberOfLines={3}>
                {partialText}
              </Text>
            ) : (
              <Text
                style={[styles.subtleHint, { color: theme.textSecondary }]}>
                {statusText}
              </Text>
            )}
          </Animated.View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cancel voice listening"
              style={[
                styles.cancelCircle,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(4, 167, 92, 0.12)',
                },
              ]}
              onPress={onCancel}>
              <Feather name="x" size={24} color={theme.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                isListening
                  ? 'Finish voice recording'
                  : 'Tap sphere to retry voice'
              }
              disabled={isProcessing}
              style={[
                styles.doneCircle,
                { backgroundColor: theme.accent },
                isProcessing ? styles.doneDisabled : null,
              ]}
              onPress={isListening ? onStop : onRetryListen}>
              <Feather
                name={isListening ? 'check' : 'mic'}
                size={24}
                color={theme.accentInk}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  topSpacer: {
    height: 24,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcriptText: {
    marginTop: 34,
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 12,
  },
  subtleHint: {
    marginTop: 34,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.3,
    paddingHorizontal: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  cancelCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  doneDisabled: {
    opacity: 0.55,
  },
});
