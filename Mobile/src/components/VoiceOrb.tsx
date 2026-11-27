import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

const ORB_SKY = require('../assets/orb_sky.png');
const ORB_CLOUDS_A = require('../assets/orb_clouds_a.png');
const ORB_CLOUDS_B = require('../assets/orb_clouds_b.png');

interface VoiceOrbProps {
  active?: boolean;
  size?: number;
  volumeAnim?: Animated.Value;
}

/**
 * ChatGPT-style luminous swirling cloud sphere orb driven natively without re-renders.
 */
export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  active = false,
  size = 136,
  volumeAnim,
}) => {
  const swirlRotate = useRef(new Animated.Value(0)).current;
  const counterRotate = useRef(new Animated.Value(0)).current;
  const driftPhase = useRef(new Animated.Value(0)).current;
  const staticScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const rot1 = Animated.loop(
      Animated.timing(swirlRotate, {
        toValue: 1,
        duration: active ? 5200 : 9500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const rot2 = Animated.loop(
      Animated.timing(counterRotate, {
        toValue: 1,
        duration: active ? 7200 : 12500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const drift = Animated.loop(
      Animated.sequence([
        Animated.timing(driftPhase, {
          toValue: 1,
          duration: active ? 1600 : 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftPhase, {
          toValue: 0,
          duration: active ? 1600 : 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    rot1.start();
    rot2.start();
    drift.start();

    return () => {
      rot1.stop();
      rot2.stop();
      drift.stop();
    };
  }, [active, counterRotate, driftPhase, swirlRotate]);

  const orbScale = useMemo(() => {
    if (!active || !volumeAnim) {
      return staticScale;
    }
    return volumeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.15],
      extrapolate: 'clamp',
    });
  }, [active, staticScale, volumeAnim]);

  const spinCW = swirlRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const spinCCW = counterRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });
  const driftX = driftPhase.interpolate({
    inputRange: [0, 1],
    outputRange: [-size * 0.08, size * 0.08],
  });
  const driftY = driftPhase.interpolate({
    inputRange: [0, 1],
    outputRange: [size * 0.05, -size * 0.06],
  });

  const layerSize = Math.round(size * 1.48);
  const offset = -(layerSize - size) / 2;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: orbScale }],
        },
      ]}>
      <View
        style={[
          styles.sphereClip,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}>
        <Image
          source={ORB_SKY}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />

        <Animated.Image
          source={ORB_CLOUDS_A}
          style={[
            styles.cloudLayer,
            {
              width: layerSize,
              height: layerSize,
              left: offset,
              top: offset,
              transform: [
                { translateX: driftX },
                { translateY: driftY },
                { rotate: spinCW },
              ],
            },
          ]}
          resizeMode="cover"
        />

        <Animated.Image
          source={ORB_CLOUDS_B}
          style={[
            styles.cloudLayer,
            {
              width: layerSize,
              height: layerSize,
              left: offset,
              top: offset,
              transform: [{ rotate: spinCCW }, { translateY: driftX }],
            },
          ]}
          resizeMode="cover"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0ED96D',
    shadowOpacity: 0.48,
    shadowRadius: 28,
    elevation: 18,
  },
  sphereClip: {
    overflow: 'hidden',
  },
  cloudLayer: {
    position: 'absolute',
  },
});
