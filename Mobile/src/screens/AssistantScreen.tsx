import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { MicButton } from '../components/MicButton';
import { MessageBubble } from '../components/MessageBubble';
import { ProposalCard } from '../components/ProposalCard';
import { StatusBanner } from '../components/StatusBanner';
import { VoiceOrb } from '../components/VoiceOrb';
import { useAppState } from '../context/AppState';
import { useAssistant } from '../hooks/useAssistant';
import { useVoice } from '../hooks/useVoice';
import { THEME } from '../theme';

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

  const canSend = Boolean(inputText.trim()) && !isSending;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View pointerEvents="none" style={styles.ambientGlowTop} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.brandIcon}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.brandLogoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.title}>Pocket Operator</Text>
              <Text style={styles.subtitle}>Sandbox Food Pickup Assistant</Text>
            </View>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Sandbox</Text>
          </View>
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
              <VoiceOrb active={isRecording} size={136} />
              <Text style={styles.emptyOverline}>Voice Food Concierge</Text>
              <Text style={styles.emptyTitle}>How Can I Help?</Text>
              <View style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Feather name="compass" size={14} color={THEME.accent} />
                  <Text style={styles.exampleLabel}>Try asking</Text>
                </View>
                <Text style={styles.emptyHint}>
                  "Find me the cheapest vegetarian lunch for no more than 200
                  rupees. Prepare an order and then show me how to get there."
                </Text>
              </View>
            </View>
          }
        />

        {isSending ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={THEME.accent} />
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
            <View style={styles.partialHeader}>
              <Feather name="radio" size={14} color={THEME.accent} />
              <Text style={styles.partialLabel}>Listening (en-IN)...</Text>
            </View>
            <Text style={styles.partialText}>
              {partialText || 'Speak your meal request now...'}
            </Text>
          </View>
        ) : null}

        <View style={styles.composerWrap}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything or edit transcript..."
              placeholderTextColor={THEME.textMuted}
              multiline
              editable={!isSending}
            />
            <TouchableOpacity
              accessibilityLabel="Send"
              style={[styles.sendBtn, !canSend ? styles.sendDisabled : null]}
              disabled={!canSend}
              onPress={handleSend}>
              <Feather
                name="arrow-up"
                size={20}
                color={canSend ? THEME.accentInk : THEME.textMuted}
              />
            </TouchableOpacity>
          </View>

          <MicButton
            voiceAvailable={voiceAvailable}
            isRecording={isRecording}
            disabled={isSending}
            onPress={handleMicPress}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.bgDeep,
  },
  flex: {
    flex: 1,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -110,
    alignSelf: 'center',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: THEME.bgGlow,
    opacity: 0.72,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: THEME.subtleBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: THEME.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.textSecondary,
    marginTop: 1,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: THEME.glass,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.accent,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  emptyBox: {
    alignItems: 'center',
  },
  emptyOverline: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginTop: 4,
    marginBottom: 18,
    textAlign: 'center',
  },
  exampleCard: {
    width: '100%',
    backgroundColor: THEME.glass,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    padding: 14,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  exampleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyHint: {
    fontSize: 14,
    color: THEME.textSecondary,
    lineHeight: 20,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 8,
  },
  typingText: {
    color: THEME.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  partialBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: THEME.accentTint,
    borderWidth: 1,
    borderColor: THEME.accent,
  },
  partialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  partialLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.accent,
  },
  partialText: {
    fontSize: 15,
    color: THEME.textPrimary,
    lineHeight: 21,
  },
  composerWrap: {
    paddingBottom: 88,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    marginTop: 4,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: THEME.glass,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 110,
    paddingVertical: 6,
    fontSize: 15,
    color: THEME.textPrimary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: 'rgba(154, 230, 27, 0.16)',
  },
});
