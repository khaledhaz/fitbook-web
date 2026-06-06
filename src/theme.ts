// FitBook design tokens — ported from brand.dart
// Use Tailwind classes where possible; import this for JS-side color usage (charts, etc.)

export const colors = {
  primary: '#F0B51D',
  primaryDark: '#C79516',
  primaryLight: '#FBCF54',
  tertiary: '#F9FAB0',

  bg: '#09111A',
  bgSecondary: '#081018',

  card: '#151E2F',
  cardElevated: '#1C2540',
  cardPressed: '#243150',

  inputBg: '#141E30',
  inputBgFocused: '#1F2C45',

  border: '#1F2D47',
  borderFocused: '#2C3A56',
  divider: '#172238',

  text: '#F5F7FA',
  textSecondary: '#C5CAD7',
  textTertiary: '#8B93A8',
  textMuted: '#3D4055',
  textOnPrimary: '#000000',

  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',

  macroProtein: '#FF6B6B',
  macroCarbs: '#51CF66',
  macroFat: '#FFD43B',

  mealBreakfast: '#FF9500',
  mealLunch: '#34C759',
  mealDinner: '#007AFF',
  mealSnack: '#AF52DE',

  chatSelf: '#2A2520',
  chatOther: '#1C2038',
  readReceipt: '#53BDEB',
} as const

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const

export const spacing = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32,
  10: 40, 12: 48, 14: 56, 16: 64,
} as const
