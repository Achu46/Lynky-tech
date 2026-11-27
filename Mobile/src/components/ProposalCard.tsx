import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Proposal } from '../api/types';

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
      <View style={styles.badge}>
        <Text style={styles.badgeText}>SANDBOX ORDER - no real payment</Text>
      </View>

      <Text style={styles.mealName}>{mealLabel}</Text>
      <Text style={styles.restaurant}>{restaurantLabel}</Text>

      <View style={styles.row}>
        <Text style={styles.meta}>Quantity: {proposal.quantity || 1}</Text>
        <Text style={styles.total}>Total: Rs {proposal.price}</Text>
      </View>

      {retryPending ? (
        <Text style={styles.retryNotice}>
          Could not reach the server. Tap Retry to confirm with the same key.
        </Text>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn]}
          disabled={isConfirming}
          onPress={onCancel}>
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
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.confirmText}>
              {retryPending ? 'Retry Confirm' : 'Confirm Order'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#0F766E',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 12,
    marginVertical: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  badgeText: {
    color: '#134E4A',
    fontSize: 12,
    fontWeight: '700',
  },
  mealName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#0F172A',
  },
  restaurant: {
    fontSize: 16,
    color: '#334155',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  meta: {
    fontSize: 15,
    color: '#475569',
  },
  total: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F766E',
  },
  retryNotice: {
    marginTop: 8,
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  confirmBtn: {
    backgroundColor: '#0F766E',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  cancelText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
