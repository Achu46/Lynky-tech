import React from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { THEME } from '../theme';

interface VoiceOrbProps {
  active?: boolean;
  size?: number;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  active = false,
  size = 124,
}) => {
  const ring2 = Math.round(size * 0.78);
  const ring3 = Math.round(size * 0.56);
  const core = Math.round(size * 0.36);

  return (
    <View
      style={[
        styles.outer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: active
            ? 'rgba(154, 230, 27, 0.16)'
            : 'rgba(154, 230, 27, 0.10)',
          borderColor: active
            ? 'rgba(154, 230, 27, 0.45)'
            : 'rgba(154, 230, 27, 0.22)',
        },
      ]}>
      <View
        style={[
          styles.mid,
          {
            width: ring2,
            height: ring2,
            borderRadius: ring2 / 2,
            backgroundColor: active
              ? 'rgba(154, 230, 27, 0.24)'
              : 'rgba(154, 230, 27, 0.16)',
          },
        ]}>
        <View
          style={[
            styles.inner,
            {
              width: ring3,
              height: ring3,
              borderRadius: ring3 / 2,
              backgroundColor: active
                ? 'rgba(154, 230, 27, 0.42)'
                : 'rgba(154, 230, 27, 0.28)',
            },
          ]}>
          <View
            style={[
              styles.core,
              {
                width: core,
                height: core,
                borderRadius: core / 2,
                backgroundColor: active ? THEME.accent : '#B7EE4F',
              },
            ]}>
            <Feather
              name={active ? 'mic' : 'zap'}
              size={Math.round(core * 0.48)}
              color={THEME.accentInk}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  mid: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
