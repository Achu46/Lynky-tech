export interface AppTheme {
  mode: 'dark' | 'light';
  bgDeep: string;
  bgSurface: string;
  bgGlow: string;
  glass: string;
  glassStrong: string;
  glassBorder: string;
  subtleBorder: string;

  cardLight: string;
  cardLightBorder: string;
  cardDarkText: string;
  cardMutedText: string;

  accent: string;
  accentDark: string;
  accentInk: string;
  accentTint: string;
  accentDisabled: string;

  accentRing1: string;
  accentRing2: string;
  accentRing3: string;
  accentCoreIdle: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;

  bannerInfoBg: string;
  bannerInfoBorder: string;
  bannerInfoText: string;
  bannerSuccessText: string;
  bannerWarningText: string;
  bannerErrorText: string;

  overlayBackdrop: string;
  overlayVeil: string;

  confirmBtnBg: string;
  confirmBtnText: string;
  cancelBtnBg: string;
  badgeBg: string;
  badgeText: string;

  userBubbleBg: string;
  userBubbleText: string;

  tabBarBg: string;
  tabBarBorder: string;
  tabBarActiveTint: string;
  tabBarInactiveTint: string;
}

export const DARK_THEME: AppTheme = {
  mode: 'dark',
  bgDeep: '#06130D',
  bgSurface: '#0B1F16',
  bgGlow: '#0C3D27',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassStrong: 'rgba(11, 31, 22, 0.92)',
  glassBorder: 'rgba(14, 217, 109, 0.28)',
  subtleBorder: 'rgba(255, 255, 255, 0.14)',

  cardLight: '#F4FBF7',
  cardLightBorder: '#D3EDE0',
  cardDarkText: '#071A11',
  cardMutedText: '#3B5E4E',

  accent: '#0ED96D',
  accentDark: '#04A75C',
  accentInk: '#042414',
  accentTint: 'rgba(14, 217, 109, 0.16)',
  accentDisabled: 'rgba(14, 217, 109, 0.16)',

  accentRing1: 'rgba(14, 217, 109, 0.16)',
  accentRing2: 'rgba(14, 217, 109, 0.24)',
  accentRing3: 'rgba(14, 217, 109, 0.42)',
  accentCoreIdle: '#34E88B',

  textPrimary: '#F4FBF7',
  textSecondary: '#A7CEBA',
  textMuted: '#6F9B85',

  success: '#0ED96D',
  successBg: 'rgba(14, 217, 109, 0.16)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.16)',
  error: '#EF4444',
  errorBg: 'rgba(239, 68, 68, 0.22)',

  bannerInfoBg: 'rgba(14, 217, 109, 0.14)',
  bannerInfoBorder: 'rgba(14, 217, 109, 0.42)',
  bannerInfoText: '#A7F3D0',
  bannerSuccessText: '#A7F3D0',
  bannerWarningText: '#FDE68A',
  bannerErrorText: '#FCA5A5',

  overlayBackdrop: 'rgba(4, 15, 10, 0.90)',
  overlayVeil: 'rgba(10, 38, 25, 0.42)',

  confirmBtnBg: '#062015',
  confirmBtnText: '#0ED96D',
  cancelBtnBg: '#DFF2E8',
  badgeBg: '#DCFCE7',
  badgeText: '#046C3C',

  userBubbleBg: '#0ED96D',
  userBubbleText: '#042414',

  tabBarBg: '#07160F',
  tabBarBorder: 'rgba(14, 217, 109, 0.24)',
  tabBarActiveTint: '#0ED96D',
  tabBarInactiveTint: '#6F9B85',
};

export const LIGHT_THEME: AppTheme = {
  mode: 'light',
  bgDeep: '#FFFFFF',
  bgSurface: '#F3FBF7',
  bgGlow: 'rgba(14, 217, 109, 0.14)',
  glass: '#F3FBF7',
  glassStrong: 'rgba(255, 255, 255, 0.96)',
  glassBorder: 'rgba(4, 167, 92, 0.26)',
  subtleBorder: '#D5EFE2',

  cardLight: '#FFFFFF',
  cardLightBorder: '#CBEAD9',
  cardDarkText: '#072216',
  cardMutedText: '#3C6250',

  accent: '#04A75C',
  accentDark: '#038549',
  accentInk: '#FFFFFF',
  accentTint: 'rgba(4, 167, 92, 0.12)',
  accentDisabled: 'rgba(4, 167, 92, 0.18)',

  accentRing1: 'rgba(4, 167, 92, 0.10)',
  accentRing2: 'rgba(14, 217, 109, 0.18)',
  accentRing3: 'rgba(14, 217, 109, 0.34)',
  accentCoreIdle: '#0ED96D',

  textPrimary: '#072216',
  textSecondary: '#3C6250',
  textMuted: '#688B7A',

  success: '#04A75C',
  successBg: '#DCFCE7',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  error: '#DC2626',
  errorBg: '#FEE2E2',

  bannerInfoBg: '#DCFCE7',
  bannerInfoBorder: 'rgba(4, 167, 92, 0.40)',
  bannerInfoText: '#065F46',
  bannerSuccessText: '#065F46',
  bannerWarningText: '#92400E',
  bannerErrorText: '#991B1B',

  overlayBackdrop: 'rgba(244, 251, 247, 0.95)',
  overlayVeil: 'rgba(220, 248, 234, 0.55)',

  confirmBtnBg: '#04A75C',
  confirmBtnText: '#FFFFFF',
  cancelBtnBg: '#E7F3EC',
  badgeBg: '#E1F8EC',
  badgeText: '#046C3C',

  userBubbleBg: '#04A75C',
  userBubbleText: '#FFFFFF',

  tabBarBg: '#FFFFFF',
  tabBarBorder: '#CBEAD9',
  tabBarActiveTint: '#04A75C',
  tabBarInactiveTint: '#688B7A',
};

export const THEME = DARK_THEME;
