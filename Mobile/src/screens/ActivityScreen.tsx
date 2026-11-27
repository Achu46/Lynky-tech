import React, { useCallback, useState } from 'react';
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
import type { RunRecord, RunTrace } from '../api/types';
import { StatusBanner } from '../components/StatusBanner';
import { THEME } from '../theme';

export const ActivityScreen: React.FC = () => {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<RunTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [traceLoading, setTraceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const loadRuns = useCallback(async (isPull = false) => {
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
      setErrorText(
        err instanceof ApiError ? err.message : 'Could not load activity runs.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
      setErrorText(
        err instanceof ApiError ? err.message : 'Could not load run trace.',
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
    setCopiedMsg('Trace JSON copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View pointerEvents="none" style={styles.ambientGlowTop} />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Feather name="activity" size={18} color={THEME.accent} />
          </View>
          <View>
            <Text style={styles.title}>Activity & Traces</Text>
            <Text style={styles.subtitle}>
              Recent assistant runs and tool steps
            </Text>
          </View>
        </View>
      </View>

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

      {selectedTrace ? (
        <ScrollView
          style={styles.traceContainer}
          contentContainerStyle={styles.traceScrollContent}>
          <View style={styles.traceActions}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setSelectedTrace(null)}>
              <Feather name="chevron-left" size={16} color={THEME.textPrimary} />
              <Text style={styles.backText}>Back to Runs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyTrace}>
              <Feather name="copy" size={15} color={THEME.accentInk} />
              <Text style={styles.copyText}>Copy trace JSON</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.traceSummary}>
            <Text style={styles.runPrompt}>{selectedTrace.user_message}</Text>
            <View style={styles.metaRow}>
              <Feather name="clock" size={13} color={THEME.textSecondary} />
              <Text style={styles.runMeta}>
                Status: {selectedTrace.status} |{' '}
                {new Date(selectedTrace.started_at).toLocaleString()}
              </Text>
            </View>
            <Text style={styles.runId}>Run ID: {selectedTrace.id}</Text>
          </View>

          <Text style={styles.stepsHeading}>
            Steps ({selectedTrace.steps.length})
          </Text>
          {selectedTrace.steps.length === 0 ? (
            <Text style={styles.emptyStepText}>No tool steps recorded.</Text>
          ) : (
            selectedTrace.steps.map((step) => (
              <View key={step.step_number} style={styles.stepCard}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepTool}>
                    #{step.step_number} {step.tool_name}
                  </Text>
                  <View
                    style={[
                      styles.outcomeBadge,
                      step.outcome === 'ok'
                        ? styles.outcomeOk
                        : styles.outcomeErr,
                    ]}>
                    <Text
                      style={[
                        styles.outcomeText,
                        step.outcome === 'ok'
                          ? styles.outcomeOkText
                          : styles.outcomeErrText,
                      ]}>
                      {step.outcome}
                    </Text>
                  </View>
                </View>
                <Text style={styles.stepNote}>{step.short_note}</Text>
                <Text style={styles.stepTime}>
                  {new Date(step.started_at).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      ) : loading && runs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.accent} />
        </View>
      ) : (
        <View style={styles.flex}>
          {traceLoading ? (
            <View style={styles.loadingTraceRow}>
              <ActivityIndicator size="small" color={THEME.accent} />
              <Text style={styles.loadingTraceText}>Loading trace...</Text>
            </View>
          ) : null}
          <FlatList
            data={runs}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadRuns(true)}
                colors={[THEME.accent]}
                tintColor={THEME.accent}
              />
            }
            contentContainerStyle={
              runs.length === 0 ? styles.center : styles.listContent
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Feather name="activity" size={26} color={THEME.accent} />
                </View>
                <Text style={styles.emptyText}>No assistant runs yet.</Text>
                <Text style={styles.emptySubtext}>
                  Tool calls and traces will appear here after your first chat.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.runCard}
                onPress={() => handleSelectRun(item.id)}>
                <View style={styles.runCardTop}>
                  <View style={styles.statusPill}>
                    <Text style={styles.runStatus}>{item.status}</Text>
                  </View>
                  <Text style={styles.runTime}>
                    {new Date(item.started_at).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.runMsg} numberOfLines={2}>
                  {item.user_message}
                </Text>
                <View style={styles.tapHintRow}>
                  <Text style={styles.tapHint}>Tap to inspect trace</Text>
                  <Feather
                    name="chevron-right"
                    size={15}
                    color={THEME.accent}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
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
  flex: {
    flex: 1,
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
  loadingTraceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 8,
  },
  loadingTraceText: {
    color: THEME.textSecondary,
    fontSize: 13,
  },
  runCard: {
    backgroundColor: THEME.glass,
    borderRadius: 18,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  runCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusPill: {
    backgroundColor: THEME.accentTint,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  runStatus: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.accent,
    textTransform: 'uppercase',
  },
  runTime: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  runMsg: {
    fontSize: 15,
    color: THEME.textPrimary,
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
    color: THEME.accent,
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
    backgroundColor: THEME.glass,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  backText: {
    color: THEME.textPrimary,
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
    backgroundColor: THEME.accent,
  },
  copyText: {
    color: THEME.accentInk,
    fontWeight: '700',
    fontSize: 13,
  },
  traceSummary: {
    backgroundColor: THEME.glass,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    marginBottom: 16,
  },
  runPrompt: {
    fontSize: 16,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  runMeta: {
    fontSize: 13,
    color: THEME.textSecondary,
  },
  runId: {
    fontSize: 11,
    color: THEME.textMuted,
    marginTop: 2,
  },
  stepsHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginBottom: 10,
  },
  emptyStepText: {
    color: THEME.textSecondary,
    fontSize: 14,
  },
  stepCard: {
    backgroundColor: THEME.glass,
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    marginBottom: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepTool: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.textPrimary,
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  outcomeOk: {
    backgroundColor: THEME.accentTint,
  },
  outcomeErr: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  outcomeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  outcomeOkText: {
    color: THEME.accent,
  },
  outcomeErrText: {
    color: THEME.error,
  },
  stepNote: {
    fontSize: 13,
    color: THEME.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  stepTime: {
    fontSize: 11,
    color: THEME.textMuted,
  },
});
