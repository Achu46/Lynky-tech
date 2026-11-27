import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import type { BannerInfo } from '../context/AppState';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../theme';

interface StatusBannerProps {
  banner: BannerInfo;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

function getBannerPalette(theme: AppTheme) {
  return {
    info: {
      bg: theme.successBg,
      border: theme.success,
      text: theme.bannerSuccessText,
      icon: theme.success,
      iconName: 'info',
    },
    success: {
      bg: theme.successBg,
      border: theme.success,
      text: theme.bannerSuccessText,
      icon: theme.success,
      iconName: 'check-circle',
    },
    warning: {
      bg: theme.errorBg,
      border: theme.error,
      text: theme.bannerErrorText,
      icon: theme.error,
      iconName: 'alert-triangle',
    },
    error: {
      bg: theme.errorBg,
      border: theme.error,
      text: theme.bannerErrorText,
      icon: theme.error,
      iconName: 'alert-circle',
    },
  };
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  banner,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  const { theme } = useTheme();
  const palette = getBannerPalette(theme)[banner.kind];
  const isError = banner.kind === 'error' || banner.kind === 'warning';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}>
      <View style={styles.row}>
        <Feather
          name={palette.iconName}
          size={18}
          color={palette.icon}
          style={styles.icon}
        />
        <Text style={[styles.text, { color: palette.text }]}>{banner.text}</Text>
        {onDismiss ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            hitSlop={8}
            onPress={onDismiss}
            style={styles.dismissIconBtn}>
            <Feather name="x" size={17} color={palette.text} />
          </TouchableOpacity>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onAction}
            style={[
              styles.actionBtn,
              { backgroundColor: isError ? theme.error : theme.accent },
            ]}>
            <Text
              style={[
                styles.actionText,
                { color: isError ? '#FFFFFF' : theme.accentInk },
              ]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginHorizontal: 14,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  dismissIconBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 28,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
