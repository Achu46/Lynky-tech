import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { ApiError, getRuns, getRunTrace } from '../api/client';
import type { ActivityStep, RunRecord, RunTrace } from '../api/types';
import { StatusBanner } from '../components/StatusBanner';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useAppState } from '../context/AppState';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../theme';

function isNegativeStatus(status?: string): boolean {
  if (!status) {
    return false;
  }
  return /fail|error|cancel|denied|could_not|timeout|stale|reject/i.test(
    status,
  );
}

function getFriendlyRunStatus(status?: string): string {
  switch (status) {
    case 'done':
      return 'Completed';
    case 'needs_approval':
      return 'Ready to Confirm';
    case 'needs_answer':
      return 'Waiting for Reply';
    case 'failed':
      return 'Could Not Finish';
    case 'running':
      return 'In Progress';
    default:
      return status || 'Completed';
  }
}

function getFriendlyStepMeta(toolName: string): { title: string; icon: string } {
  switch (toolName) {
    case 'search_menu':
      return { title: 'Checked Menu', icon: 'search' };
    case 'prepare_order':
      return { title: 'Prepared Order', icon: 'shopping-bag' };
    case 'ask_user':
      return { title: 'Asked Follow-up Question', icon: 'help-circle' };
    case 'get_last_order':
      return { title: 'Checked Last Order', icon: 'clock' };
    case 'request_directions':
      return { title: 'Got Map Directions', icon: 'map-pin' };
    default:
      return { title: 'Blocked Action', icon: 'shield' };
  }
}

function getFriendlyOutcome(outcome: string): string {
  switch (outcome) {
    case 'ok':
      return 'Done';
    case 'rejected':
      return 'Skipped';
    case 'error':
      return 'Failed';
    default:
      return outcome;
  }
}

function getFriendlyNote(step: ActivityStep): string {
  const note = (step.short_note || '').trim();
  if (!note) {
    return 'Action completed.';
  }

  const searchMatch = note.match(
    /Searched\s+\S+\s+(.+?):\s*(\d+)\s+result\(s\)(?:,\s*cheapest\s+\S+\s+Rs(\d+(?:\.\d+)?))?/i,
  );
  if (searchMatch) {
    const count = Number(searchMatch[2]);
    const cheapest = searchMatch[3];
    if (count === 0) {
      return 'No matching dishes were found for that budget.';
    }
    return cheapest
      ? `Found ${count} matching ${count === 1 ? 'dish' : 'dishes'} (cheapest: Rs ${cheapest}).`
      : `Found ${count} matching ${count === 1 ? 'dish' : 'dishes'}.`;
  }

  const propMatch = note.match(/Prepared proposal\s+\S+\s+for\s+\S+\s+Rs(\d+(?:\.\d+)?)/i);
  if (propMatch) {
    return `Prepared order preview for Rs ${propMatch[1]}. Tap Confirm in Assistant to place it.`;
  }

  if (note.startsWith('Asked user:')) {
    return note.replace(/^Asked user:\s*/i, 'Asked: ');
  }
  if (note.startsWith('Prepared maps handoff')) {
    return 'Loaded restaurant location so you can open Maps.';
  }
  if (note.startsWith('Fetched last order')) {
    return 'Loaded your most recent saved order.';
  }
  if (note.includes('no saved order')) {
    return 'No saved order was found yet.';
  }
  if (note.startsWith('Rejected prepare_order: missing')) {
    return 'Needed your budget and veg/non-veg choice before preparing an order.';
  }
  if (note.startsWith('Rejected unknown tool')) {
    return 'Blocked an unsupported action safely.';
  }
  if (note.startsWith('Proposal rejected:')) {
    return note.replace(/^Proposal rejected:\s*/i, 'Could not prepare order: ');
  }
  return note;
}

function getToneColors(theme: AppTheme, negative: boolean) {
  return negative
    ? {
        bg: theme.errorBg,
        border: theme.error,
        badgeText: theme.error,
        bodyText: theme.bannerErrorText,
      }
    : {
        bg: theme.successBg,
        border: theme.success,
        badgeText: theme.success,
        bodyText: theme.bannerSuccessText,
      };
}

export const ActivityScreen: React.FC = () => {
  const { theme } = useTheme();
  const { isOffline, recheckConnectivity } = useAppState();
  const prevOfflineRef = useRef(isOffline);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<RunTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [traceLoading, setTraceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const loadRuns = useCallback(
    async (isPull = false) => {
      if (isPull) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorText(null);
      try {
        const list = await getRuns();
        setRuns(list);
      } catch (err: any) {
        const isNetErr = err instanceof ApiError && err.isNetworkOrTimeout;
        const online = isNetErr ? await recheckConnectivity() : true;
        setErrorText(
          !online
            ? "You're offline right now. Connect to the internet to see recent activity."
            : err instanceof ApiError
              ? err.message
              : 'Could not load recent activity. Tap Retry.',
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
      loadRuns(false);
    }
    prevOfflineRef.current = isOffline;
  }, [isOffline, loadRuns]);

  useFocusEffect(
    useCallback(() => {
      loadRuns(false);
    }, [loadRuns]),
  );

  const handleSelectRun = async (runId: string) => {
    setTraceLoading(true);
    setCopiedMsg(null);
    setErrorText(null);
    try {
      const trace = await getRunTrace(runId);
      setSelectedTrace(trace);
    } catch (err: any) {
      const isNetErr = err instanceof ApiError && err.isNetworkOrTimeout;
      const online = isNetErr ? await recheckConnectivity() : true;
      setErrorText(
        !online
          ? "You're offline right now. Connect to the internet to inspect details."
          : err instanceof ApiError
            ? err.message
            : 'Could not load step details.',
      );
    } finally {
      setTraceLoading(false);
    }
  };

  const handleCopyTrace = () => {
    if (!selectedTrace) {
      return;
    }
    Clipboard.setString(JSON.stringify(selectedTrace, null, 2));
    setCopiedMsg('Technical trace JSON copied to clipboard.');
  };

  const traceTone = selectedTrace
    ? getToneColors(theme, isNegativeStatus(selectedTrace.status))
    : null;

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
            <Feather name="activity" size={18} color={theme.accent} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Activity
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              What the assistant did for your requests
            </Text>
          </View>
        </View>
        <ThemeToggleButton />
      </View>

      {isOffline && !errorText ? (
        <StatusBanner
          banner={{
            kind: 'error',
            text: "You're offline right now. Connect to the internet to refresh activity.",
          }}
          actionLabel="Retry"
          onAction={() => {
            recheckConnectivity();
            loadRuns(false);
          }}
        />
      ) : null}

      {errorText ? (
        <StatusBanner
          banner={{ kind: 'error', text: errorText }}
          actionLabel="Retry"
          onAction={() => loadRuns(false)}
        />
      ) : null}

      {copiedMsg ? (
        <StatusBanner
          banner={{ kind: 'success', text: copiedMsg }}
          onDismiss={() => setCopiedMsg(null)}
        />
      ) : null}

      {selectedTrace && traceTone ? (
        <ScrollView
          style={styles.traceContainer}
          contentContainerStyle={styles.traceScrollContent}>
          <View style={styles.traceActions}>
            <TouchableOpacity
              style={[
                styles.backBtn,
                {
                  backgroundColor: theme.glass,
                  borderColor: theme.glassBorder,
                },
              ]}
              onPress={() => setSelectedTrace(null)}>
              <Feather
                name="chevron-left"
                size={16}
                color={theme.textPrimary}
              />
              <Text style={[styles.backText, { color: theme.textPrimary }]}>
                Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.copyBtn, { backgroundColor: theme.accent }]}
              onPress={handleCopyTrace}>
              <Feather name="copy" size={15} color={theme.accentInk} />
              <Text style={[styles.copyText, { color: theme.accentInk }]}>
                Copy trace JSON
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.traceSummary,
              {
                backgroundColor: traceTone.bg,
                borderColor: traceTone.border,
              },
            ]}>
            <View style={styles.summaryTopRow}>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: isNegativeStatus(selectedTrace.status)
                      ? theme.error
                      : theme.success,
                    borderColor: traceTone.border,
                  },
                ]}>
                <Text
                  style={[
                    styles.runStatus,
                    {
                      color: isNegativeStatus(selectedTrace.status)
                        ? '#FFFFFF'
                        : theme.accentInk,
                    },
                  ]}>
                  {getFriendlyRunStatus(selectedTrace.status)}
                </Text>
              </View>
            </View>
            <Text style={[styles.runPromptLabel, { color: theme.textSecondary }]}>
              Your request
            </Text>
            <Text style={[styles.runPrompt, { color: traceTone.bodyText }]}>
              "{selectedTrace.user_message}"
            </Text>
            <View style={styles.metaRow}>
              <Feather name="clock" size={13} color={theme.textSecondary} />
              <Text style={[styles.runMeta, { color: theme.textSecondary }]}>
                {new Date(selectedTrace.started_at).toLocaleString()}
              </Text>
            </View>
          </View>

          <Text style={[styles.stepsHeading, { color: theme.textPrimary }]}>
            What happened ({selectedTrace.steps.length}{' '}
            {selectedTrace.steps.length === 1 ? 'step' : 'steps'})
          </Text>
          {selectedTrace.steps.length === 0 ? (
            <Text
              style={[styles.emptyStepText, { color: theme.textSecondary }]}>
              Replied directly without extra tool steps.
            </Text>
          ) : (
            selectedTrace.steps.map((step) => {
              const stepNegative = isNegativeStatus(step.outcome);
              const stepTone = getToneColors(theme, stepNegative);
              const meta = getFriendlyStepMeta(step.tool_name);
              return (
                <View
                  key={step.step_number}
                  style={[
                    styles.stepCard,
                    {
                      backgroundColor: stepTone.bg,
                      borderColor: stepTone.border,
                    },
                  ]}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepTitleRow}>
                      <Feather
                        name={meta.icon}
                        size={15}
                        color={stepTone.badgeText}
                      />
                      <Text
                        style={[styles.stepTool, { color: theme.textPrimary }]}>
                        Step {step.step_number}: {meta.title}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.outcomeBadge,
                        {
                          backgroundColor: stepNegative
                            ? theme.error
                            : theme.success,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.outcomeText,
                          {
                            color: stepNegative ? '#FFFFFF' : theme.accentInk,
                          },
                        ]}>
                        {getFriendlyOutcome(step.outcome)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.stepNote, { color: stepTone.bodyText }]}>
                    {getFriendlyNote(step)}
                  </Text>
                  <Text style={[styles.stepTime, { color: theme.textMuted }]}>
                    {new Date(step.started_at).toLocaleTimeString()}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : loading && runs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <View style={styles.flex}>
          {traceLoading ? (
            <View style={styles.loadingTraceRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text
                style={[
                  styles.loadingTraceText,
                  { color: theme.textSecondary },
                ]}>
                Loading details...
              </Text>
            </View>
          ) : null}
          <FlatList
            data={runs}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadRuns(true)}
                colors={[theme.accent]}
                tintColor={theme.accent}
              />
            }
            contentContainerStyle={
              runs.length === 0 ? styles.center : styles.listContent
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
                    name={isOffline ? 'wifi-off' : 'activity'}
                    size={26}
                    color={isOffline ? theme.error : theme.accent}
                  />
                </View>
                <Text style={[styles.emptyText, { color: theme.textPrimary }]}>
                  {isOffline
                    ? "You're offline right now"
                    : 'No assistant activity yet.'}
                </Text>
                <Text
                  style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                  {isOffline
                    ? 'Turn on Wi-Fi or mobile data, then tap Retry to load activity.'
                    : 'Ask a question in Assistant to see each step explained simply here.'}
                </Text>
                {isOffline ? (
                  <TouchableOpacity
                    style={[styles.retryBtn, { backgroundColor: theme.error }]}
                    onPress={() => loadRuns(false)}>
                    <Feather name="rotate-cw" size={14} color="#FFFFFF" />
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            }
            renderItem={({ item }) => {
              const negative = isNegativeStatus(item.status);
              const tone = getToneColors(theme, negative);
              return (
                <TouchableOpacity
                  style={[
                    styles.runCard,
                    {
                      backgroundColor: tone.bg,
                      borderColor: tone.border,
                    },
                  ]}
                  onPress={() => handleSelectRun(item.id)}>
                  <View style={styles.runCardTop}>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: negative
                            ? theme.error
                            : theme.success,
                          borderColor: tone.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.runStatus,
                          { color: negative ? '#FFFFFF' : theme.accentInk },
                        ]}>
                        {getFriendlyRunStatus(item.status)}
                      </Text>
                    </View>
                    <Text style={[styles.runTime, { color: theme.textMuted }]}>
                      {new Date(item.started_at).toLocaleString()}
                    </Text>
                  </View>
                  <Text
                    style={[styles.runMsg, { color: tone.bodyText }]}
                    numberOfLines={2}>
                    {item.user_message}
                  </Text>
                  <View style={styles.tapHintRow}>
                    <Text style={[styles.tapHint, { color: tone.badgeText }]}>
                      See what happened
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={15}
                      color={tone.badgeText}
                    />
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
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
  flex: {
    flex: 1,
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
  loadingTraceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 8,
  },
  loadingTraceText: {
    fontSize: 13,
  },
  runCard: {
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
  },
  runCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  runStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  runTime: {
    fontSize: 12,
  },
  runMsg: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 21,
  },
  tapHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapHint: {
    fontSize: 13,
    fontWeight: '600',
  },
  traceContainer: {
    flex: 1,
  },
  traceScrollContent: {
    padding: 16,
    paddingBottom: 104,
  },
  traceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  backText: {
    fontWeight: '600',
    fontSize: 13,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  copyText: {
    fontWeight: '700',
    fontSize: 13,
  },
  traceSummary: {
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  runPromptLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  runPrompt: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  runMeta: {
    fontSize: 13,
  },
  stepsHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyStepText: {
    fontSize: 14,
  },
  stepCard: {
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    marginBottom: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  stepTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  stepTool: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  outcomeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stepNote: {
    fontSize: 13,
    marginBottom: 5,
    lineHeight: 19,
  },
  stepTime: {
    fontSize: 11,
  },
});
