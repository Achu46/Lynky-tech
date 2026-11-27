import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import type { BannerInfo } from '../context/AppState';
import { THEME } from '../theme';

interface StatusBannerProps {
  banner: BannerInfo;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const PALETTE = {
  info: {
    bg: 'rgba(154, 230, 27, 0.12)',
    border: 'rgba(154, 230, 27, 0.35)',
    text: '#E6F5CC',
    icon: THEME.accent,
    iconName: 'info',
  },
  success: {
    bg: THEME.successBg,
    border: 'rgba(34, 197, 94, 0.45)',
    text: '#DCFCE7',
    icon: THEME.success,
    iconName: 'check-circle',
  },
  warning: {
    bg: THEME.warningBg,
    border: 'rgba(245, 158, 11, 0.45)',
    text: '#FEF3C7',
    icon: THEME.warning,
    iconName: 'alert-triangle',
  },
  error: {
    bg: THEME.errorBg,
    border: 'rgba(239, 68, 68, 0.5)',
    text: '#FEE2E2',
    icon: THEME.error,
    iconName: 'alert-circle',
  },
};

export const StatusBanner: React.FC<StatusBannerProps> = ({
  banner,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  const palette = PALETTE[banner.kind];
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
      </View>
      {actionLabel || onDismiss ? (
        <View style={styles.actions}>
          {actionLabel && onAction ? (
            <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
              <Text style={styles.actionText}>{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
          {onDismiss ? (
            <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
              <Feather name="x" size={14} color={palette.text} />
              <Text style={[styles.dismissText, { color: palette.text }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 14,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  icon: {
    marginTop: 2,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 28,
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: THEME.accent,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.accentInk,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dismissText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

