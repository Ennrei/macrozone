import { StyleSheet } from 'react-native';

export const colors = {
  background: '#0A0B0D',
  header: '#101216',
  surface: '#14161A',
  surfaceHigh: '#1C1F25',
  border: '#262A31',
  primary: '#C6FF3D', // electric lime
  text: '#F4F6F8',
  textSecondary: '#8A919C',
  alert: '#FF4D5E',

  // one color per macro
  calories: '#C6FF3D',
  protein: '#3DE0FF',
  carbs: '#FFB020',
  fat: '#FF4FA3',
};

// Bottom padding so content is never hidden behind the floating tab bar
export const TAB_BAR_SPACE = 120;

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 64,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginTop: 30,
    marginBottom: 16,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});