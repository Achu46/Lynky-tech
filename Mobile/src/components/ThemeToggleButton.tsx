import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';

/**
 * Icon-only topbar button that toggles between Light (white/emerald) and Dark (emerald) themes.
 */
export const ThemeToggleButton: React.FC = () => {
  const { isDark, theme, toggleTheme } = useTheme();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={
        isDark ? 'Switch to light theme' : 'Switch to dark theme'
      }
      style={[
        styles.button,
        {
          backgroundColor: theme.glass,
          borderColor: theme.glassBorder,
        },
      ]}
      onPress={toggleTheme}>
      <Feather
        name={isDark ? 'sun' : 'moon'}
        size={17}
        color={theme.accent}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
