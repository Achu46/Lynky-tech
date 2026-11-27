import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

interface MicButtonProps {
  voiceAvailable: boolean;
  isRecording: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/**
 * Compact circular voice trigger placed inline inside the composer bar.
 */
export const MicButton: React.FC<MicButtonProps> = ({
  voiceAvailable,
  isRecording,
  disabled,
  onPress,
}) => {
  const { theme } = useTheme();

  if (!voiceAvailable) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isRecording
          ? styles.recording
          : {
              backgroundColor: theme.accentTint,
              borderWidth: 1,
              borderColor: theme.glassBorder,
            },
        disabled ? styles.disabled : null,
      ]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        isRecording ? 'Stop voice recording' : 'Start voice recording'
      }>
      <Feather
        name={isRecording ? 'square' : 'mic'}
        size={18}
        color={isRecording ? '#FFFFFF' : theme.accent}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recording: {
    backgroundColor: '#EF4444',
  },
  disabled: {
    opacity: 0.5,
  },
});
