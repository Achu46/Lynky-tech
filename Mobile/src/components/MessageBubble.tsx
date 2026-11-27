import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
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
  const [menuVisible, setMenuVisible] = useState(false);
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

  const closeMenu = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMenuVisible(false);
    setCopied(false);
  };

  const openMenu = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCopied(false);
    setMenuVisible(true);
  };

  const handleCopy = () => {
    if (copied) {
      return;
    }
    Clipboard.setString(displayText);
    setCopied(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setMenuVisible(false);
      setCopied(false);
      timerRef.current = null;
    }, 650);
  };

  return (
    <>
      <View
        style={[
          styles.wrapper,
          isUser ? styles.userWrapper : styles.assistantWrapper,
        ]}>
        <TouchableOpacity
          activeOpacity={0.9}
          delayLongPress={300}
          onLongPress={openMenu}
          accessibilityHint="Long press to copy message"
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
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}>
        <Pressable style={styles.modalBackdrop} onPress={closeMenu}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.cardLight,
                borderColor: theme.cardLightBorder,
              },
            ]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copied ? 'Copied' : 'Copy'}
              activeOpacity={0.8}
              disabled={copied}
              onPress={handleCopy}
              style={[
                styles.modalActionBtn,
                {
                  backgroundColor: copied ? theme.successBg : 'transparent',
                },
              ]}>
              <Feather
                name={copied ? 'check' : 'copy'}
                size={16}
                color={copied ? theme.success : theme.cardDarkText}
              />
              <Text
                style={[
                  styles.modalActionText,
                  { color: copied ? theme.success : theme.cardDarkText },
                ]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
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
    maxWidth: '82%',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    minWidth: 156,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    elevation: 8,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  modalActionText: {
    fontSize: 15,
    fontWeight: '700',
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
