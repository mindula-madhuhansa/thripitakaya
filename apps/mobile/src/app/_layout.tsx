import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
// Per-weight subpaths: the package index would bundle every weight (~15 MB).
import { GentiumBookPlus_400Regular } from '@expo-google-fonts/gentium-book-plus/400Regular';
import { GentiumBookPlus_400Regular_Italic } from '@expo-google-fonts/gentium-book-plus/400Regular_Italic';
import { GentiumBookPlus_700Bold } from '@expo-google-fonts/gentium-book-plus/700Bold';
import { NotoSerifSinhala_400Regular } from '@expo-google-fonts/noto-serif-sinhala/400Regular';
import { NotoSerifSinhala_500Medium } from '@expo-google-fonts/noto-serif-sinhala/500Medium';
import { NotoSerifSinhala_600SemiBold } from '@expo-google-fonts/noto-serif-sinhala/600SemiBold';
import { NotoSerifSinhala_700Bold } from '@expo-google-fonts/noto-serif-sinhala/700Bold';
import { AbhayaLibre_500Medium } from '@expo-google-fonts/abhaya-libre/500Medium';
import { NotoSerif_400Regular } from '@expo-google-fonts/noto-serif/400Regular';
import { NotoSerif_400Regular_Italic } from '@expo-google-fonts/noto-serif/400Regular_Italic';
import { initContent } from '../data/content';
import { useSettings } from '../db/user';
import { ToastHost, useColors } from '../ui';

SplashScreen.preventAutoHideAsync();

export default function Root() {
  const [loaded, error] = useFonts({
    GentiumBookPlus_400Regular, GentiumBookPlus_400Regular_Italic, GentiumBookPlus_700Bold,
    NotoSerifSinhala_400Regular, NotoSerifSinhala_500Medium, NotoSerifSinhala_600SemiBold, NotoSerifSinhala_700Bold,
    AbhayaLibre_500Medium, NotoSerif_400Regular, NotoSerif_400Regular_Italic,
    Sym0: require('../../assets/fonts/MaterialSymbolsRounded-Fill0.ttf'),
    Sym1: require('../../assets/fonts/MaterialSymbolsRounded-Fill1.ttf'),
  });
  const s = useSettings(), c = useColors();
  const [dbReady, setDbReady] = useState(false), [dbError, setDbError] = useState('');
  useEffect(() => { initContent().then(() => setDbReady(true), e => setDbError(String(e?.message ?? e))); }, []);
  const ready = (loaded || !!error) && (dbReady || !!dbError);
  useEffect(() => { if (ready) SplashScreen.hideAsync(); }, [ready]);
  if (!ready) return null;
  if (dbError) return <View style={{ flex: 1, justifyContent: 'center', padding: 32, backgroundColor: c.bg }}><Text style={{ color: c.ink, fontSize: 16 }}>{dbError}</Text></View>;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={s.theme === 'night' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Protected guard={s.onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="reader/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="about" />
        </Stack.Protected>
        <Stack.Protected guard={!s.onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </View>
  );
}
