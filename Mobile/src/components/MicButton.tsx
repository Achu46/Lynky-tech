import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

interface MicButtonProps {
  voiceAvailable: boolean;
  isRecording: boolean;
  disabled?: boolean;
  onPress: () => void;
}

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
      <Text style={styles.label}>
        {isRecording ? 'Listening... Tap to Stop' : 'Tap to Speak'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 10,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idle: {
    backgroundColor: '#0F766E',
  },
  recording: {
    backgroundColor: '#DC2626',
  },
  disabled: {
    opacity: 0.55,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
