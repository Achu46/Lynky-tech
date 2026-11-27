import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  getCancelledOrders,
  getOrders,
  reportDirectionsResult,
  runAgent,
} from '../api/client';
import type { Order, Proposal } from '../api/types';
import { StatusBanner } from '../components/StatusBanner';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useAppState } from '../context/AppState';
import { useTheme } from '../context/ThemeContext';
import { formatDirectionsStatus, openDirections } from '../services/maps';
import {
  cacheRestaurantCoords,
  getCachedRestaurantCoords,
  getOrCreateSessionId,
} from '../services/storage';
import { formatTimeAmPm } from '../utils/time';

type HistoryTab = 'confirmed' | 'cancelled';

export const HistoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const { sessionId, isOffline, recheckConnectivity } = useAppState();
  const prevOfflineRef = useRef(isOffline);
  const [activeTab, setActiveTab] = useState<HistoryTab>('confirmed');
  const [orders, setOrders] = useState<Order[]>([]);
  const [cancelledOrders, setCancelledOrders] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [bannerInfo, setBannerInfo] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (isPull = false) => {
      if (isPull) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorText(null);
      try {
        const [confirmedList, cancelledList] = await Promise.all([
          getOrders(),
          getCancelledOrders(),
        ]);
        setOrders(confirmedList);
        setCancelledOrders(cancelledList);
      } catch (err: any) {
        const isNetErr = err instanceof ApiError && err.isNetworkOrTimeout;
        const online = isNetErr ? await recheckConnectivity() : true;
        setErrorText(
          !online
            ? "You're offline right now. Connect to the internet to see your saved orders."
            : err instanceof ApiError
              ? err.message
              : 'Could not load order history. Tap Retry.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [recheckConnectivity],
  );

  useEffect(() => {
    if (prevOfflineRef.current && !isOffline) {
      loadHistory(false);
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline, loadHistory]);

  useFocusEffect(
    useCallback(() => {
      loadHistory(false);
    }, [loadHistory]),
  );

  const handleOpenDirections = async (order: Order) => {
    if (openingOrderId) {
      return;
    }
    setOpeningOrderId(order.id);
    setBannerInfo(null);

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
        setBannerInfo({
          kind: 'error',
          text: 'Could not open directions — restaurant location unavailable.',
        });
        await loadHistory(false);
        return;
      }

      const res = await openDirections(
        coords.latitude,
        coords.longitude,
        coords.label,
      );
      setBannerInfo({
        kind: res.outcome === 'could_not_open' ? 'error' : 'success',
        text: `${formatDirectionsStatus(res.outcome)} — ${res.message}`,
      });
      await reportDirectionsResult(order.id, res.outcome).catch(() => {});
      await loadHistory(false);
    } catch (err: any) {
      const isNetErr = err instanceof ApiError && err.isNetworkOrTimeout;
      const online = isNetErr ? await recheckConnectivity() : true;
      setBannerInfo({
        kind: 'error',
        text: !online
          ? "You're offline — connect to the internet to open directions for this order."
          : 'Could not open directions right now. Please try again.',
      });
    } finally {
      setOpeningOrderId(null);
    }
  };

  const isConfirmedTab = activeTab === 'confirmed';
  const activeCount = isConfirmedTab ? orders.length : cancelledOrders.length;

  const renderConfirmedCard = ({ item }: { item: Order }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.cardLight,
          borderColor: theme.cardLightBorder,
        },
      ]}>
      <View style={styles.cardTopRow}>
        <View style={[styles.sandboxBadge, { backgroundColor: theme.badgeBg }]}>
          <Feather name="shield" size={11} color={theme.badgeText} />
          <Text style={[styles.sandboxBadgeText, { color: theme.badgeText }]}>
            Sandbox order saved
          </Text>
        </View>
        <Text style={[styles.time, { color: theme.cardMutedText }]}>
          {`${new Date(item.created_at).toLocaleDateString()} • ${formatTimeAmPm(item.created_at)}`}
        </Text>
      </View>

      <View style={styles.cardHeader}>
        <Text style={[styles.mealName, { color: theme.cardDarkText }]}>
          {item.dish_name}
        </Text>
        <Text style={[styles.total, { color: theme.cardDarkText }]}>
          Rs {item.total}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Feather name="map-pin" size={14} color={theme.cardMutedText} />
        <Text style={[styles.restaurant, { color: theme.cardMutedText }]}>
          {item.restaurant_name}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Feather name="check-circle" size={14} color="#04A75C" />
        <Text style={[styles.statusLine, { color: theme.cardMutedText }]}>
          Status: Confirmed sandbox pickup order
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Feather name="compass" size={14} color={theme.cardMutedText} />
        <Text style={[styles.statusLine, { color: theme.cardMutedText }]}>
          Directions: {formatDirectionsStatus(item.directions_status)}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.dirBtn,
          { backgroundColor: theme.confirmBtnBg },
          openingOrderId === item.id ? styles.dirBtnDisabled : null,
        ]}
        disabled={openingOrderId !== null}
        onPress={() => handleOpenDirections(item)}>
        <Feather name="navigation" size={15} color={theme.confirmBtnText} />
        <Text style={[styles.dirBtnText, { color: theme.confirmBtnText }]}>
          {openingOrderId === item.id ? 'Opening...' : 'Open directions'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCancelledCard = ({ item }: { item: Proposal }) => {
    const timestamp = item.resolved_at || item.created_at;
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.cardLight,
            borderColor: theme.cardLightBorder,
          },
        ]}>
        <View style={styles.cardTopRow}>
          <View
            style={[styles.sandboxBadge, { backgroundColor: theme.errorBg }]}>
            <Feather name="x-circle" size={11} color={theme.error} />
            <Text style={[styles.sandboxBadgeText, { color: theme.error }]}>
              Order cancelled
            </Text>
          </View>
          <Text style={[styles.time, { color: theme.cardMutedText }]}>
            {`${new Date(timestamp).toLocaleDateString()} • ${formatTimeAmPm(timestamp)}`}
          </Text>
        </View>

        <View style={styles.cardHeader}>
          <Text style={[styles.mealName, { color: theme.cardDarkText }]}>
            {item.dish_name || item.dish_id}
          </Text>
          <Text style={[styles.total, { color: theme.cardDarkText }]}>
            Rs {item.price}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="map-pin" size={14} color={theme.cardMutedText} />
          <Text style={[styles.restaurant, { color: theme.cardMutedText }]}>
            {item.restaurant_name || item.restaurant_id}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="tag" size={14} color={theme.cardMutedText} />
          <Text style={[styles.statusLine, { color: theme.cardMutedText }]}>
            {item.vegetarian ? 'Veg' : 'Non-Veg'} • Qty {item.quantity}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Feather name="x-circle" size={14} color={theme.error} />
          <Text style={[styles.statusLine, { color: theme.cardMutedText }]}>
            Cancelled on {new Date(timestamp).toLocaleDateString()} at{' '}
            {formatTimeAmPm(timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.bgDeep }]}
      edges={['top', 'left', 'right']}>
      <View
        pointerEvents="none"
        style={[styles.ambientGlowTop, { backgroundColor: theme.bgGlow }]}
      />
      <View style={[styles.header, { borderBottomColor: theme.subtleBorder }]}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.headerIcon,
              {
                backgroundColor: theme.glass,
                borderColor: theme.glassBorder,
              },
            ]}>
            <Feather name="shopping-bag" size={18} color={theme.accent} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Order History
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Confirmed and Cancelled Orders
            </Text>
          </View>
        </View>
        <ThemeToggleButton />
      </View>

      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.glass,
            borderColor: theme.glassBorder,
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.tabBtn,
            isConfirmedTab ? { backgroundColor: theme.accent } : null,
          ]}
          onPress={() => setActiveTab('confirmed')}>
          <Feather
            name="check-circle"
            size={14}
            color={isConfirmedTab ? theme.accentInk : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              {
                color: isConfirmedTab ? theme.accentInk : theme.textSecondary,
              },
            ]}>
            Confirmed ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.tabBtn,
            !isConfirmedTab ? { backgroundColor: theme.error } : null,
          ]}
          onPress={() => setActiveTab('cancelled')}>
          <Feather
            name="x-circle"
            size={14}
            color={!isConfirmedTab ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.tabBtnText,
              {
                color: !isConfirmedTab ? '#FFFFFF' : theme.textSecondary,
              },
            ]}>
            Cancelled ({cancelledOrders.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isOffline && !errorText ? (
        <StatusBanner
          banner={{
            kind: 'error',
            text: "You're offline right now. Connect to the internet to refresh orders.",
          }}
          actionLabel="Retry"
          onAction={() => {
            recheckConnectivity();
            loadHistory(false);
          }}
        />
      ) : null}

      {errorText ? (
        <StatusBanner
          banner={{ kind: 'error', text: errorText }}
          actionLabel="Retry"
          onAction={() => loadHistory(false)}
        />
      ) : null}

      {bannerInfo ? (
        <StatusBanner
          banner={bannerInfo}
          onDismiss={() => setBannerInfo(null)}
        />
      ) : null}

      {loading && activeCount === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : isConfirmedTab ? (
        <FlatList
          key="confirmed-list"
          data={orders}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadHistory(true)}
              colors={[theme.accent]}
              tintColor={theme.accent}
            />
          }
          contentContainerStyle={
            orders.length === 0 ? styles.center : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: isOffline ? theme.errorBg : theme.glass,
                    borderColor: isOffline ? theme.error : theme.glassBorder,
                  },
                ]}>
                <Feather
                  name={isOffline ? 'wifi-off' : 'check-circle'}
                  size={26}
                  color={isOffline ? theme.error : theme.accent}
                />
              </View>
              <Text style={[styles.emptyText, { color: theme.textPrimary }]}>
                {isOffline
                  ? "You're offline right now"
                  : 'No confirmed orders yet.'}
              </Text>
              <Text
                style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                {isOffline
                  ? 'Turn on Wi-Fi or mobile data, then tap Retry to see your orders.'
                  : 'Confirm a meal proposal in Assistant to see it here.'}
              </Text>
              {isOffline ? (
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: theme.error }]}
                  onPress={() => loadHistory(false)}>
                  <Feather name="rotate-cw" size={14} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={renderConfirmedCard}
        />
      ) : (
        <FlatList
          key="cancelled-list"
          data={cancelledOrders}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadHistory(true)}
              colors={[theme.accent]}
              tintColor={theme.accent}
            />
          }
          contentContainerStyle={
            cancelledOrders.length === 0 ? styles.center : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: isOffline ? theme.errorBg : theme.glass,
                    borderColor: isOffline ? theme.error : theme.glassBorder,
                  },
                ]}>
                <Feather
                  name={isOffline ? 'wifi-off' : 'x-circle'}
                  size={26}
                  color={isOffline ? theme.error : theme.textSecondary}
                />
              </View>
              <Text style={[styles.emptyText, { color: theme.textPrimary }]}>
                {isOffline
                  ? "You're offline right now"
                  : 'No cancelled orders yet.'}
              </Text>
              <Text
                style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                {isOffline
                  ? 'Turn on Wi-Fi or mobile data, then tap Retry to see your orders.'
                  : 'Meal proposals you cancel in Assistant will appear here.'}
              </Text>
              {isOffline ? (
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: theme.error }]}
                  onPress={() => loadHistory(false)}>
                  <Feather name="rotate-cw" size={14} color="#FFFFFF" />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          }
          renderItem={renderCancelledCard}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -110,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.65,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  tabBar: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 4,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
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
    maxWidth: 280,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    paddingBottom: 104,
  },
  card: {
    borderWidth: 1,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sandboxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
    paddingRight: 8,
  },
  total: {
    fontSize: 18,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 4,
  },
  restaurant: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusLine: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
  },
  dirBtn: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dirBtnDisabled: {
    opacity: 0.6,
  },
  dirBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
});
