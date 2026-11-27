jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-voice/voice', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn(async () => true),
    getSpeechRecognitionServices: jest.fn(async () => ['com.google.android.tts']),
    start: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
    cancel: jest.fn(async () => {}),
    destroy: jest.fn(async () => {}),
    removeAllListeners: jest.fn(),
  },
}));

jest.mock('@react-native-clipboard/clipboard', () => ({
  __esModule: true,
  default: {
    setString: jest.fn(),
    getString: jest.fn(async () => ''),
  },
}));

jest.mock('react-native-vector-icons/Feather', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props) => React.createElement(Text, null, props.name);
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props) => React.createElement(Text, null, props.name);
});
