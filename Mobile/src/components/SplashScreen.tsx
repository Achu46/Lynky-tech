import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const LOGO_SOURCE = require('../assets/logo.png');

interface Props {
  onFinish: () => void;
}

/**
 * Full-screen animated brand splash overlay rendered over the root app shell.
 */
export const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  const { theme } = useTheme();
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.72)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const entrance = Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.7,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.parallel([
            Animated.timing(ringScale, {
              toValue: 1.5,
              duration: 750,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0,
              duration: 750,
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.sequence([
          Animated.delay(180),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(textTranslateY, {
              toValue: 0,
              duration: 420,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]),
      Animated.delay(450),
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 380,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.05,
          duration: 380,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    entrance.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    return () => {
      entrance.stop();
    };
  }, [
    containerOpacity,
    containerScale,
    logoOpacity,
    logoScale,
    onFinish,
    ringOpacity,
    ringScale,
    textOpacity,
    textTranslateY,
  ]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.overlay,
        {
          backgroundColor: theme.bgDeep,
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}>
      <View
        pointerEvents="none"
        style={[styles.ambientGlowTop, { backgroundColor: theme.bgGlow }]}
      />
      <View
        pointerEvents="none"
        style={[styles.ambientGlowBottom, { backgroundColor: theme.bgGlow }]}
      />

      <View style={styles.centerStage}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              borderColor: theme.accent,
              backgroundColor: theme.accentTint,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.logoBadge,
            {
              borderColor: theme.accent,
              shadowColor: theme.accent,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}>
          <Image
            source={LOGO_SOURCE}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}>
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
            Pocket Operator
          </Text>
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
            Sandbox Food Pickup Assistant
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 24,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    opacity: 0.78,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -140,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.45,
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    top: -12,
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 2,
  },
  logoBadge: {
    width: 128,
    height: 128,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  textBlock: {
    marginTop: 24,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
