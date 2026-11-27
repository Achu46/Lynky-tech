import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { THEME } from '../theme';

interface MicButtonProps {
  voiceAvailable: boolean;
  isRecording: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const WAVE_BARS = [10, 18, 26, 14, 28, 20, 12, 24, 16, 28, 14, 20, 10];

export const MicButton: React.FC<MicButtonProps> = ({
  voiceAvailable,
  isRecording,
  disabled,
  onPress,
}) => {
  if (!voiceAvailable) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isRecording ? styles.recording : styles.idle,
        disabled ? styles.disabled : null,
      ]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        isRecording ? 'Stop voice recording' : 'Start voice recording'
      }>
      {isRecording ? (
        <View style={styles.recordingRow}>
          <View style={styles.waves}>
            {WAVE_BARS.map((h, idx) => (
              <View key={idx} style={[styles.waveBar, { height: h }]} />
            ))}
          </View>
          <View style={styles.stopBadge}>
            <Feather name="square" size={14} color={THEME.accentInk} />
            <Text style={styles.stopLabel}>Listening... Tap to Stop</Text>
          </View>
        </View>
      ) : (
        <View style={styles.idleRow}>
          <View style={styles.micBadge}>
            <Feather name="mic" size={18} color={THEME.accentInk} />
          </View>
          <Text style={styles.idleLabel}>Tap to Speak</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 14,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idle: {
    backgroundColor: THEME.accentTint,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  recording: {
    backgroundColor: 'rgba(220, 38, 38, 0.22)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  disabled: {
    opacity: 0.55,
  },
  idleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  micBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleLabel: {
    color: THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
  },
  waves: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: THEME.accent,
  },
  stopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  stopLabel: {
    color: THEME.accentInk,
    fontSize: 14,
    fontWeight: '700',
  },
});

