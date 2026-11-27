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
      <View style={styles.header}>
        <Text style={styles.title}>Order History</Text>
        <Text style={styles.subtitle}>Saved Sandbox Pickup Orders</Text>
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
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadOrders(true)}
              colors={['#0F766E']}
            />
          }
          contentContainerStyle={
            orders.length === 0 ? styles.center : styles.listContent
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No saved sandbox orders yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.mealName}>{item.dish_name}</Text>
                <Text style={styles.total}>Rs {item.total}</Text>
              </View>
              <Text style={styles.restaurant}>{item.restaurant_name}</Text>
              <Text style={styles.statusLine}>
                Status: Sandbox order saved
              </Text>
              <Text style={styles.statusLine}>
                Directions: {formatDirectionsStatus(item.directions_status)}
              </Text>
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleString()}
              </Text>

              <TouchableOpacity
                style={[
                  styles.dirBtn,
                  openingOrderId === item.id ? styles.dirBtnDisabled : null,
                ]}
                disabled={openingOrderId !== null}
                onPress={() => handleOpenDirections(item)}>
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  total: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F766E',
  },
  restaurant: {
    fontSize: 15,
    color: '#334155',
    marginTop: 4,
  },
  statusLine: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  dirBtn: {
    marginTop: 10,
    backgroundColor: '#0F766E',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dirBtnDisabled: {
    opacity: 0.6,
  },
  dirBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
