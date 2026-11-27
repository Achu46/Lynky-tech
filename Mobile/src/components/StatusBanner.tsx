import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BannerInfo } from '../context/AppState';

interface StatusBannerProps {
  banner: BannerInfo;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

const COLORS = {
  info: { bg: '#CCFBF1', border: '#0F766E', text: '#134E4A' },
  success: { bg: '#DCFCE7', border: '#15803D', text: '#14532D' },
  warning: { bg: '#FEF3C7', border: '#B45309', text: '#78350F' },
  error: { bg: '#FEE2E2', border: '#B91C1C', text: '#7F1D1D' },
};

export const StatusBanner: React.FC<StatusBannerProps> = ({
  banner,
  actionLabel,
  onAction,
  onDismiss,
}) => {
  const palette = COLORS[banner.kind];
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}>
      <Text style={[styles.text, { color: palette.text }]}>{banner.text}</Text>
      <View style={styles.actions}>
        {actionLabel && onAction ? (
          <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
            <Text style={[styles.actionText, { color: palette.text }]}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
        {onDismiss ? (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
            <Text style={[styles.dismissText, { color: palette.text }]}>
              Dismiss
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dismissText: {
    fontSize: 14,
  },
});
