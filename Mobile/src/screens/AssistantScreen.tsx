import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Keyboard,
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
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { VoiceOrb } from '../components/VoiceOrb';
import { VoiceOverlay } from '../components/VoiceOverlay';
import { useAppState } from '../context/AppState';
import { useTheme } from '../context/ThemeContext';
import { useAssistant } from '../hooks/useAssistant';
import { useVoice } from '../hooks/useVoice';

export const AssistantScreen: React.FC = () => {
  const { theme } = useTheme();
  const {
    messages,
    pendingProposal,
    statusBanner,
    staleMessage,
    confirmRetryPending,
    isOffline,
    setStatusBanner,
    setStaleMessage,
    recheckConnectivity,
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
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;
  const isSendingRef = useRef(isSending);
  isSendingRef.current = isSending;

  const {
    voiceAvailable,
    permissionDenied,
    isOverlayOpen,
    isRecording,
    isReady,
    isProcessing,
    overlayPrompt,
    volumeAnim,
    partialText,
    voiceNotice,
    startRecording,
    stopRecording,
    cancelRecording,
    clearNotice,
    openAppSettings,
  } = useVoice((finalText) => {
    const trimmed = finalText.trim();
    if (!trimmed) {
      return;
    }
    if (isSendingRef.current) {
      setInputText(trimmed);
      return;
    }
    setInputText('');
    sendMessageRef.current(trimmed);
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
    Keyboard.dismiss();
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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.bgDeep }]}
      edges={['top', 'left', 'right']}>
      <View
        pointerEvents="none"
        style={[styles.ambientGlowTop, { backgroundColor: theme.bgGlow }]}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[styles.header, { borderBottomColor: theme.subtleBorder }]}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.brandIcon,
                { borderColor: theme.cardLightBorder },
              ]}>
              <Image
                source={require('../assets/logo.png')}
                style={styles.brandLogoImage}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Pocket Operator
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Sandbox Food Pickup Assistant
              </Text>
            </View>
          </View>
          <ThemeToggleButton />
        </View>

        {isOffline ? (
          <StatusBanner
            banner={{
              kind: 'error',
              text: 'You are offline. Check your internet connection and tap Retry.',
            }}
            actionLabel="Retry"
            onAction={() => {
              recheckConnectivity();
            }}
          />
        ) : null}

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
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (messages.length > 0) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
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
              <Text
                style={[styles.emptyOverline, { color: theme.textSecondary }]}>
                Voice Food Concierge
              </Text>
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                How Can I Help?
              </Text>
              <View
                style={[
                  styles.exampleCard,
                  {
                    backgroundColor: theme.glass,
                    borderColor: theme.glassBorder,
                  },
                ]}>
                <View style={styles.exampleHeader}>
                  <Feather name="compass" size={14} color={theme.accent} />
                  <Text
                    style={[styles.exampleLabel, { color: theme.accent }]}>
                    Try asking
                  </Text>
                </View>
                <Text
                  style={[styles.emptyHint, { color: theme.textSecondary }]}>
                  "Find me the cheapest vegetarian lunch for no more than 200
                  rupees. Prepare an order and then show me how to get there."
                </Text>
              </View>
            </View>
          }
        />

        {isSending ? (
          <View style={styles.typingRow}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={[styles.typingText, { color: theme.textSecondary }]}>
              Assistant is thinking...
            </Text>
          </View>
        ) : null}

        {pendingProposal ? (
          <ProposalCard
            proposal={pendingProposal.proposal}
            isConfirming={isConfirming}
            retryPending={confirmRetryPending}
            onConfirm={() => {
              Keyboard.dismiss();
              confirmPending();
            }}
            onCancel={cancelPending}
          />
        ) : null}

        <View style={styles.composerWrap}>
          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: theme.glass,
                borderColor: theme.glassBorder,
              },
            ]}>
            <TextInput
              style={[styles.input, { color: theme.textPrimary }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything or tap mic..."
              placeholderTextColor={theme.textMuted}
              multiline
              editable={!isSending}
            />
            <MicButton
              voiceAvailable={voiceAvailable}
              isRecording={isRecording}
              disabled={isSending}
              onPress={handleMicPress}
            />
            <TouchableOpacity
              accessibilityLabel="Send"
              style={[
                styles.sendBtn,
                {
                  backgroundColor: canSend
                    ? theme.accent
                    : theme.accentDisabled,
                },
              ]}
              disabled={!canSend}
              onPress={handleSend}>
              <Feather
                name="arrow-up"
                size={20}
                color={canSend ? theme.accentInk : theme.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      <VoiceOverlay
        visible={isOverlayOpen}
        isListening={isRecording}
        isReady={isReady}
        isProcessing={isProcessing}
        overlayPrompt={overlayPrompt}
        partialText={partialText}
        volumeAnim={volumeAnim}
        onRetryListen={startRecording}
        onStop={stopRecording}
        onCancel={cancelRecording}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
    borderWidth: 1,
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
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
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
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 18,
    textAlign: 'center',
  },
  exampleCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
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
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  emptyHint: {
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: '500',
  },
  composerWrap: {
    paddingBottom: 92,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: 16,
    marginTop: 6,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 26,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    paddingVertical: 7,
    fontSize: 15,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
