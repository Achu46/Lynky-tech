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
import { ApiError, getRuns, getRunTrace } from '../api/client';
import type { RunRecord, RunTrace } from '../api/types';
import { StatusBanner } from '../components/StatusBanner';

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
      <View style={styles.header}>
        <Text style={styles.title}>Activity & Traces</Text>
        <Text style={styles.subtitle}>Recent assistant runs and tool steps</Text>
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
        <ScrollView style={styles.traceContainer}>
          <View style={styles.traceActions}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setSelectedTrace(null)}>
              <Text style={styles.backText}>Back to Runs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyTrace}>
              <Text style={styles.copyText}>Copy trace JSON</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.traceSummary}>
            <Text style={styles.runPrompt}>{selectedTrace.user_message}</Text>
            <Text style={styles.runMeta}>
              Status: {selectedTrace.status} •{' '}
              {new Date(selectedTrace.started_at).toLocaleString()}
            </Text>
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
                  <Text
                    style={[
                      styles.outcomeBadge,
                      step.outcome === 'ok'
                        ? styles.outcomeOk
                        : styles.outcomeErr,
                    ]}>
                    {step.outcome}
                  </Text>
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
          <ActivityIndicator size="large" color="#0F766E" />
        </View>
      ) : (
        <View style={styles.flex}>
          {traceLoading ? (
            <View style={styles.loadingTraceRow}>
              <ActivityIndicator size="small" color="#0F766E" />
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
                colors={['#0F766E']}
              />
            }
            contentContainerStyle={
              runs.length === 0 ? styles.center : styles.listContent
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>No assistant runs yet.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.runCard}
                onPress={() => handleSelectRun(item.id)}>
                <View style={styles.runCardTop}>
                  <Text style={styles.runStatus}>{item.status}</Text>
                  <Text style={styles.runTime}>
                    {new Date(item.started_at).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.runMsg} numberOfLines={2}>
                  {item.user_message}
                </Text>
                <Text style={styles.tapHint}>Tap to inspect trace</Text>
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
    backgroundColor: '#F8FAFC',
  },
  flex: {
    flex: 1,
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
  loadingTraceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingTraceText: {
    color: '#0F766E',
    fontWeight: '600',
  },
  runCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
  },
  runCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  runStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    textTransform: 'uppercase',
  },
  runTime: {
    fontSize: 12,
    color: '#64748B',
  },
  runMsg: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 12,
    color: '#0F766E',
    marginTop: 6,
    fontWeight: '600',
  },
  traceContainer: {
    flex: 1,
    padding: 12,
  },
  traceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  backBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  copyBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  copyText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  traceSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 14,
    marginBottom: 14,
  },
  runPrompt: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  runMeta: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
  },
  runId: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  stepsHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyStepText: {
    fontSize: 14,
    color: '#64748B',
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 12,
    marginBottom: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTool: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  outcomeBadge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  outcomeOk: {
    backgroundColor: '#DCFCE7',
    color: '#14532D',
  },
  outcomeErr: {
    backgroundColor: '#FEE2E2',
    color: '#7F1D1D',
  },
  stepNote: {
    fontSize: 14,
    color: '#334155',
    marginTop: 6,
  },
  stepTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
