import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ChatMessage } from '../api/types';

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
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 5,
    marginHorizontal: 12,
    flexDirection: 'row',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#0F766E',
  },
  assistantBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  failedBubble: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  assistantText: {
    color: '#0F172A',
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#0F766E',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  retryDisabled: {
    opacity: 0.5,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
