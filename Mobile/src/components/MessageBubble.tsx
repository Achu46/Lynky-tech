import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Feather from 'react-native-vector-icons/Feather';
import type { ChatMessage } from '../api/types';
import { useTheme } from '../context/ThemeContext';
import { formatTimeAmPm } from '../utils/time';

interface MessageBubbleProps {
  message: ChatMessage;
  onRetry?: (text: string, runId: string) => void;
  disabled?: boolean;
}

function formatDisplayText(raw: string): string {
  return raw
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\s*\*\s+/gm, '- ');
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onRetry,
  disabled,
}) => {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const isUser = message.role === 'user';
  const isFailed = message.status === 'failed';
  const isPositiveOrder =
    !isUser &&
    !isFailed &&
    message.text.toLowerCase().startsWith('sandbox order saved');
  const displayText = isUser ? message.text : formatDisplayText(message.text);
  const assistantTime = !isUser ? formatTimeAmPm(message.createdAt) : '';

  const handleCopy = () => {
    Clipboard.setString(displayText);
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  const copyButton = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Message copied' : 'Copy message'}
      hitSlop={8}
      onPress={handleCopy}
      style={[
        styles.copyBtn,
        {
          backgroundColor: copied ? theme.successBg : theme.glass,
          borderColor: copied ? theme.success : theme.subtleBorder,
        },
      ]}>
      <Feather
        name={copied ? 'check' : 'copy'}
        size={13}
        color={copied ? theme.success : theme.textSecondary}
      />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.wrapper,
        isUser ? styles.userWrapper : styles.assistantWrapper,
      ]}>
      {isUser ? copyButton : null}
      <View
        style={[
          styles.bubble,
          isUser
            ? [styles.userBubble, { backgroundColor: theme.userBubbleBg }]
            : [
                styles.assistantBubble,
                {
                  backgroundColor: isPositiveOrder
                    ? theme.successBg
                    : theme.glass,
                  borderColor: isPositiveOrder
                    ? theme.success
                    : theme.subtleBorder,
                },
              ],
          isFailed
            ? {
                borderColor: theme.error,
                backgroundColor: theme.errorBg,
              }
            : null,
        ]}>
        <Text
          style={[
            styles.text,
            isUser
              ? { color: theme.userBubbleText, fontWeight: '600' }
              : isFailed
                ? { color: theme.bannerErrorText }
                : isPositiveOrder
                  ? { color: theme.bannerSuccessText, fontWeight: '500' }
                  : { color: theme.textPrimary },
          ]}>
          {displayText}
        </Text>
        {assistantTime ? (
          <Text
            style={[
              styles.timeText,
              {
                color: isFailed
                  ? theme.bannerErrorText
                  : isPositiveOrder
                    ? theme.bannerSuccessText
                    : theme.textSecondary,
              },
            ]}>
            {assistantTime}
          </Text>
        ) : null}
        {message.retryable &&
        message.retryRunId &&
        message.retryText &&
        onRetry ? (
          <TouchableOpacity
            style={[
              styles.retryBtn,
              { backgroundColor: isFailed ? theme.error : theme.accent },
              disabled ? styles.retryDisabled : null,
            ]}
            disabled={disabled}
            onPress={() => onRetry(message.retryText!, message.retryRunId!)}>
            <Feather
              name="rotate-cw"
              size={14}
              color={isFailed ? '#FFFFFF' : theme.accentInk}
            />
            <Text
              style={[
                styles.retryText,
                { color: isFailed ? '#FFFFFF' : theme.accentInk },
              ]}>
              Retry
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {!isUser ? copyButton : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 6,
    marginHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  assistantWrapper: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 6,
  },
  copyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  timeText: {
    marginTop: 5,
    fontSize: 11,
    textAlign: 'right',
    opacity: 0.78,
  },
  retryBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  retryDisabled: {
    opacity: 0.5,
  },
  retryText: {
    fontWeight: '700',
    fontSize: 13,
  },
});
