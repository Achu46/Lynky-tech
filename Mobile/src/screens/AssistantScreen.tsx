import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MicButton } from '../components/MicButton';
import { MessageBubble } from '../components/MessageBubble';
import { ProposalCard } from '../components/ProposalCard';
import { StatusBanner } from '../components/StatusBanner';
import { useAppState } from '../context/AppState';
import { useAssistant } from '../hooks/useAssistant';
import { useVoice } from '../hooks/useVoice';

export const AssistantScreen: React.FC = () => {
  const {
    messages,
    pendingProposal,
    statusBanner,
    staleMessage,
    confirmRetryPending,
    setStatusBanner,
    setStaleMessage,
  } = useAppState();

  const {
    isSending,
    isConfirming,
    sendMessage,
    confirmPending,
    cancelPending,
  } = useAssistant();

  const [inputText, setInputText] = useState('');
  const listRef = useRef<FlatList>(null);

  const {
    voiceAvailable,
    permissionDenied,
    isRecording,
    partialText,
    voiceNotice,
    startRecording,
    stopRecording,
    clearNotice,
    openAppSettings,
  } = useVoice((finalText) => {
    setInputText(finalText);
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
      }, 50);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) {
      return;
    }
    setInputText('');
    await sendMessage(text);
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text style={styles.title}>Pocket Operator</Text>
          <Text style={styles.subtitle}>Sandbox Food Pickup Assistant</Text>
        </View>

        {staleMessage ? (
          <StatusBanner
            banner={{ kind: 'warning', text: staleMessage }}
            onDismiss={() => setStaleMessage(null)}
          />
        ) : null}

        {statusBanner ? (
          <StatusBanner
            banner={statusBanner}
            actionLabel={confirmRetryPending ? 'Retry' : undefined}
            onAction={confirmRetryPending ? confirmPending : undefined}
            onDismiss={() => setStatusBanner(null)}
          />
        ) : null}

        {voiceNotice ? (
          <StatusBanner
            banner={{
              kind: permissionDenied ? 'warning' : 'info',
              text: voiceNotice,
            }}
            actionLabel={permissionDenied ? 'Open Settings' : undefined}
            onAction={permissionDenied ? openAppSettings : undefined}
            onDismiss={clearNotice}
          />
        ) : null}

        {!voiceAvailable ? (
          <StatusBanner
            banner={{
              kind: 'info',
              text: 'Speech recognition is unavailable on this device. Text input works normally.',
            }}
          />
        ) : null}

        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={
            messages.length === 0 ? styles.emptyContainer : styles.listContent
          }
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              disabled={isSending}
              onRetry={(text, runId) => sendMessage(text, { retryRunId: runId })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Ask for a sandbox meal</Text>
              <Text style={styles.emptyHint}>
                Example: "Find me the cheapest vegetarian lunch for no more than
                200 rupees. Prepare an order and then show me how to get there."
              </Text>
            </View>
          }
        />

        {isSending ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color="#0F766E" />
            <Text style={styles.typingText}>Assistant is thinking...</Text>
          </View>
        ) : null}

        {pendingProposal ? (
          <ProposalCard
            proposal={pendingProposal.proposal}
            isConfirming={isConfirming}
            retryPending={confirmRetryPending}
            onConfirm={confirmPending}
            onCancel={cancelPending}
          />
        ) : null}

        {isRecording ? (
          <View style={styles.partialBox}>
            <Text style={styles.partialLabel}>Listening...</Text>
            <Text style={styles.partialText}>
              {partialText || 'Speak now (en-IN)...'}
            </Text>
          </View>
        ) : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type or edit your request..."
            placeholderTextColor="#64748B"
            multiline
            editable={!isSending}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() || isSending ? styles.sendDisabled : null,
            ]}
            disabled={!inputText.trim() || isSending}
            onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>

        <MicButton
          voiceAvailable={voiceAvailable}
          isRecording={isRecording}
          disabled={isSending}
          onPress={handleMicPress}
        />
      </KeyboardAvoidingView>
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 10,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  typingText: {
    fontSize: 14,
    color: '#0F766E',
    fontWeight: '600',
  },
  partialBox: {
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  partialLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  partialText: {
    fontSize: 15,
    color: '#0F172A',
    marginTop: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 6,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#0F172A',
  },
  sendBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.45,
  },
  sendText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
