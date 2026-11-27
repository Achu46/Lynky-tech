const fs = require('node:fs');
const path = require('node:path');

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native-voice',
  'voice',
  'android',
  'src',
  'main',
  'java',
  'com',
  'wenkesj',
  'voice',
  'VoiceModule.java',
);

if (!fs.existsSync(target)) {
  console.log('VoiceModule.java not found; skipping patch.');
  process.exit(0);
}

let src = fs.readFileSync(target, 'utf8');

const patchedMarker = '// Null-safe guard for Android 15+ empty/segment recognition bundles';
if (src.includes(patchedMarker)) {
  console.log('VoiceModule.java already patched.');
  process.exit(0);
}

const partialBefore = `  @Override
  public void onPartialResults(Bundle results) {
    WritableArray arr = Arguments.createArray();

    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
    for (String result : matches) {
      arr.pushString(result);
    }`;

const partialAfter = `  ${patchedMarker}
  @Override
  public void onPartialResults(Bundle results) {
    WritableArray arr = Arguments.createArray();

    if (results != null) {
      ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
      if (matches != null) {
        for (String result : matches) {
          arr.pushString(result);
        }
      }
    }`;

const resultsBefore = `  @Override
  public void onResults(Bundle results) {
    WritableArray arr = Arguments.createArray();

    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
    for (String result : matches) {
      arr.pushString(result);
    }`;

const resultsAfter = `  @Override
  public void onResults(Bundle results) {
    isRecognizing = false;
    WritableArray arr = Arguments.createArray();

    if (results != null) {
      ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
      if (matches != null) {
        for (String result : matches) {
          arr.pushString(result);
        }
      }
    }`;

if (!src.includes(partialBefore) || !src.includes(resultsBefore)) {
  console.warn('Expected VoiceModule.java pattern not matched cleanly; skipping.');
  process.exit(0);
}

src = src.replace(partialBefore, partialAfter).replace(resultsBefore, resultsAfter);
fs.writeFileSync(target, src, 'utf8');
console.log('Patched VoiceModule.java successfully.');
