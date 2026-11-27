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
import { THEME } from '../theme';

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
  const mealLabel = proposal.dish_name || `Dish ${proposal.dish_id}`;
  const restaurantLabel =
    proposal.restaurant_name || `Restaurant ${proposal.restaurant_id}`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Feather name="shield" size={12} color="#14532D" />
          <Text style={styles.badgeText}>SANDBOX ORDER - no real payment</Text>
        </View>
        <View style={styles.dietPill}>
          <View
            style={[
              styles.dietDot,
              {
                backgroundColor: proposal.vegetarian ? '#16A34A' : '#D97706',
              },
            ]}
          />
          <Text style={styles.dietText}>
            {proposal.vegetarian ? 'Veg' : 'Non-Veg'}
          </Text>
        </View>
      </View>

      <Text style={styles.mealName}>{mealLabel}</Text>
      <View style={styles.restRow}>
        <Feather name="map-pin" size={14} color={THEME.cardMutedText} />
        <Text style={styles.restaurant}>{restaurantLabel}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.meta}>Quantity: {proposal.quantity || 1}</Text>
        <Text style={styles.total}>Rs {proposal.price}</Text>
      </View>

      {retryPending ? (
        <View style={styles.retryRow}>
          <Feather name="wifi-off" size={14} color="#B91C1C" />
          <Text style={styles.retryNotice}>
            Could not reach the server. Tap Retry to confirm with the same key.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn]}
          disabled={isConfirming}
          onPress={onCancel}>
          <Feather name="x" size={16} color={THEME.cardDarkText} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btn,
            styles.confirmBtn,
            isConfirming ? styles.btnDisabled : null,
          ]}
          disabled={isConfirming}
          onPress={onConfirm}>
          {isConfirming ? (
            <ActivityIndicator color={THEME.accent} size="small" />
          ) : (
            <>
              <Feather name="check-circle" size={16} color={THEME.accent} />
              <Text style={styles.confirmText}>
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
    backgroundColor: THEME.cardLight,
    borderWidth: 1,
    borderColor: THEME.cardLightBorder,
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
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 1,
  },
  badgeText: {
    color: '#14532D',
    fontSize: 11,
    fontWeight: '700',
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E5EAE0',
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
    color: THEME.cardDarkText,
  },
  mealName: {
    fontSize: 21,
    fontWeight: '800',
    color: THEME.cardDarkText,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  restaurant: {
    fontSize: 15,
    color: THEME.cardMutedText,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8DC',
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
    color: THEME.cardMutedText,
    fontWeight: '600',
  },
  total: {
    fontSize: 22,
    fontWeight: '800',
    color: THEME.cardDarkText,
  },
  retryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  retryNotice: {
    flex: 1,
    color: '#B91C1C',
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
  cancelBtn: {
    backgroundColor: '#E5EAE0',
  },
  confirmBtn: {
    backgroundColor: '#0D140E',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    color: THEME.cardDarkText,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmText: {
    color: THEME.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});

