import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import type { Proposal } from '../api/types';
import { useTheme } from '../context/ThemeContext';

interface ProposalCardProps {
  proposal: Proposal;
  isConfirming: boolean;
  retryPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  isConfirming,
  retryPending,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  const mealLabel = proposal.dish_name || `Dish ${proposal.dish_id}`;
  const restaurantLabel =
    proposal.restaurant_name || `Restaurant ${proposal.restaurant_id}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardLight,
          borderColor: theme.cardLightBorder,
        },
      ]}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
          <Feather name="shield" size={12} color={theme.badgeText} />
          <Text style={[styles.badgeText, { color: theme.badgeText }]}>
            SANDBOX ORDER - no real payment
          </Text>
        </View>
        <View
          style={[styles.dietPill, { backgroundColor: theme.cancelBtnBg }]}>
          <View
            style={[
              styles.dietDot,
              {
                backgroundColor: proposal.vegetarian ? '#04A75C' : '#D97706',
              },
            ]}
          />
          <Text style={[styles.dietText, { color: theme.cardDarkText }]}>
            {proposal.vegetarian ? 'Veg' : 'Non-Veg'}
          </Text>
        </View>
      </View>

      <Text style={[styles.mealName, { color: theme.cardDarkText }]}>
        {mealLabel}
      </Text>
      <View style={styles.restRow}>
        <Feather name="map-pin" size={14} color={theme.cardMutedText} />
        <Text style={[styles.restaurant, { color: theme.cardMutedText }]}>
          {restaurantLabel}
        </Text>
      </View>

      <View
        style={[styles.divider, { backgroundColor: theme.cardLightBorder }]}
      />

      <View style={styles.row}>
        <Text style={[styles.meta, { color: theme.cardMutedText }]}>
          Quantity: {proposal.quantity || 1}
        </Text>
        <Text style={[styles.total, { color: theme.cardDarkText }]}>
          Rs {proposal.price}
        </Text>
      </View>

      {retryPending ? (
        <View style={styles.retryRow}>
          <Feather name="wifi-off" size={14} color={theme.error} />
          <Text style={[styles.retryNotice, { color: theme.error }]}>
            Could not reach the server. Tap Retry to confirm with the same key.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: theme.cancelBtnBg },
          ]}
          disabled={isConfirming}
          onPress={onCancel}>
          <Feather name="x" size={16} color={theme.cardDarkText} />
          <Text style={[styles.cancelText, { color: theme.cardDarkText }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            { backgroundColor: theme.confirmBtnBg },
            isConfirming ? styles.btnDisabled : null,
          ]}
          disabled={isConfirming}
          onPress={onConfirm}>
          {isConfirming ? (
            <ActivityIndicator color={theme.confirmBtnText} size="small" />
          ) : (
            <>
              <Feather
                name="check-circle"
                size={16}
                color={theme.confirmBtnText}
              />
              <Text
                style={[styles.confirmText, { color: theme.confirmBtnText }]}>
                {retryPending ? 'Retry Confirm' : 'Confirm Order'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 14,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  dietDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dietText: {
    fontSize: 12,
    fontWeight: '700',
  },
  mealName: {
    fontSize: 21,
    fontWeight: '800',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  restaurant: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginTop: 12,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    fontSize: 14,
    fontWeight: '600',
  },
  total: {
    fontSize: 22,
    fontWeight: '800',
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  retryNotice: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
