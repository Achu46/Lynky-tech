import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import {
  ApiError,
  getOrders,
  reportDirectionsResult,
  runAgent,
} from '../api/client';
import type { Order } from '../api/types';
import { StatusBanner } from '../components/StatusBanner';
import { useAppState } from '../context/AppState';
import { formatDirectionsStatus, openDirections } from '../services/maps';
import {
  cacheRestaurantCoords,
  getCachedRestaurantCoords,
  getOrCreateSessionId,
} from '../services/storage';
import { THEME } from '../theme';

export const HistoryScreen: React.FC = () => {
  const { sessionId } = useAppState();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [bannerText, setBannerText] = useState<string | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async (isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorText(null);
    try {
      const list = await getOrders();
      setOrders(list);
    } catch (err: any) {
      setErrorText(
        err instanceof ApiError
          ? err.message
          : 'Could not load order history.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadOrders(false);
    }, [loadOrders]),
  );

  const handleOpenDirections = async (order: Order) => {
    if (openingOrderId) {
      return;
    }
    setOpeningOrderId(order.id);
    setBannerText(null);

    try {
      let coords: { latitude: number; longitude: number; label: string } | null =
        order.latitude != null && order.longitude != null
          ? {
              latitude: order.latitude,
              longitude: order.longitude,
              label: order.restaurant_name,
            }
          : await getCachedRestaurantCoords(order.restaurant_id);

      if (!coords) {
        const sid = sessionId || (await getOrCreateSessionId());
        const agentRes = await runAgent({
          session_id: sid,
          text: `Open directions for order ${order.id}`,
        });
        if (agentRes.device_action?.type === 'open_maps') {
          coords = {
            latitude: agentRes.device_action.latitude,
            longitude: agentRes.device_action.longitude,
            label: agentRes.device_action.label,
          };
          await cacheRestaurantCoords(order.restaurant_id, coords);
        }
      }

      if (!coords) {
        await reportDirectionsResult(order.id, 'could_not_open').catch(
          () => {},
        );
        setBannerText('Could not open directions — restaurant location unavailable.');
        await loadOrders(false);
        return;
      }

      const res = await openDirections(
        coords.latitude,
        coords.longitude,
        coords.label,
      );
      setBannerText(`${formatDirectionsStatus(res.outcome)} — ${res.message}`);
      await reportDirectionsResult(order.id, res.outcome).catch(() => {});
      await loadOrders(false);
    } catch {
      setBannerText('Could not open directions.');
    } finally {
      setOpeningOrderId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View pointerEvents="none" style={styles.ambientGlowTop} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Feather name="shopping-bag" size={18} color={THEME.accent} />
          </View>
          <View>
            <Text style={styles.title}>Order History</Text>
            <Text style={styles.subtitle}>Saved Sandbox Pickup Orders</Text>
          </View>
        </View>
      </View>

      {errorText ? (
        <StatusBanner
          banner={{ kind: 'error', text: errorText }}
          actionLabel="Retry"
          onAction={() => loadOrders(false)}
        />
      ) : null}

      {bannerText ? (
        <StatusBanner
          banner={{ kind: 'info', text: bannerText }}
          onDismiss={() => setBannerText(null)}
        />
      ) : null}

      {loading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadOrders(true)}
              colors={[THEME.accent]}
              tintColor={THEME.accent}
            />
          }
          contentContainerStyle={
            orders.length === 0 ? styles.center : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIcon}>
                <Feather name="shopping-bag" size={26} color={THEME.accent} />
              </View>
              <Text style={styles.emptyText}>No saved sandbox orders yet.</Text>
              <Text style={styles.emptySubtext}>
                Confirm a meal proposal in Assistant to see it here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.sandboxBadge}>
                  <Feather name="shield" size={11} color={THEME.cardDarkText} />
                  <Text style={styles.sandboxBadgeText}>Sandbox order saved</Text>
                </View>
                <Text style={styles.time}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.cardHeader}>
                <Text style={styles.mealName}>{item.dish_name}</Text>
                <Text style={styles.total}>Rs {item.total}</Text>
              </View>

              <View style={styles.metaRow}>
                <Feather name="map-pin" size={14} color={THEME.cardMutedText} />
                <Text style={styles.restaurant}>{item.restaurant_name}</Text>
              </View>

              <View style={styles.metaRow}>
                <Feather name="check-circle" size={14} color="#256D1B" />
                <Text style={styles.statusLine}>
                  Status: Sandbox order saved
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Feather name="compass" size={14} color={THEME.cardMutedText} />
                <Text style={styles.statusLine}>
                  Directions: {formatDirectionsStatus(item.directions_status)}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.dirBtn,
                  openingOrderId === item.id ? styles.dirBtnDisabled : null,
                ]}
                disabled={openingOrderId !== null}
                onPress={() => handleOpenDirections(item)}>
                <Feather name="navigation" size={15} color={THEME.accent} />
                <Text style={styles.dirBtnText}>
                  {openingOrderId === item.id
                    ? 'Opening...'
                    : 'Open directions'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bgDeep,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -110,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: THEME.bgGlow,
    opacity: 0.65,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.subtleBorder,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.glass,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 100,
  },
  emptyBox: {
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.glass,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  emptySubtext: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 104,
  },
  card: {
    backgroundColor: THEME.cardLight,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sandboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E2E9DC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sandboxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.cardDarkText,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: THEME.cardDarkText,
    paddingRight: 8,
  },
  total: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.cardDarkText,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  restaurant: {
    fontSize: 14,
    color: THEME.cardMutedText,
    fontWeight: '600',
  },
  statusLine: {
    fontSize: 13,
    color: THEME.cardMutedText,
  },
  time: {
    fontSize: 12,
    color: THEME.cardMutedText,
  },
  dirBtn: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 999,
    backgroundColor: '#121812',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dirBtnDisabled: {
    opacity: 0.6,
  },
  dirBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
