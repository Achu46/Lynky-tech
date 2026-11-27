import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import type { ChatMessage } from '../api/types';
import { THEME } from '../theme';

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (text: string, runId: string) => void;
  disabled?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRetry,
  disabled,
}) => {
  const isUser = message.role === 'user';
  return (
    <View
      style={[
        styles.wrapper,
        isUser ? styles.userWrapper : styles.assistantWrapper,
      ]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          message.status === 'failed' ? styles.failedBubble : null,
        ]}>
        <Text
          style={[
            styles.text,
            isUser ? styles.userText : styles.assistantText,
          ]}>
          {message.text}
        </Text>
        {message.retryable &&
        message.retryRunId &&
        message.retryText &&
        onRetry ? (
          <TouchableOpacity
            style={[styles.retryBtn, disabled ? styles.retryDisabled : null]}
            disabled={disabled}
            onPress={() => onRetry(message.retryText!, message.retryRunId!)}>
            <Feather name="rotate-cw" size={14} color={THEME.accentInk} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    marginHorizontal: 14,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userBubble: {
    backgroundColor: THEME.accent,
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    backgroundColor: THEME.glass,
    borderWidth: 1,
    borderColor: THEME.subtleBorder,
    borderBottomLeftRadius: 6,
  },
  failedBubble: {
    borderColor: 'rgba(239, 68, 68, 0.55)',
    backgroundColor: THEME.errorBg,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: THEME.accentInk,
    fontWeight: '600',
  },
  assistantText: {
    color: THEME.textPrimary,
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  retryDisabled: {
    opacity: 0.5,
  },
  retryText: {
    color: THEME.accentInk,
    fontWeight: '700',
    fontSize: 13,
  },
});

