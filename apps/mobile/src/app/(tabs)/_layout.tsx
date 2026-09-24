import { Pressable, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '../../theme';
import { Icon, IconName, T, useColors } from '../../ui';

const TABS: { name: string; icon: IconName; label: string; en: string }[] = [
  { name: 'index', icon: 'home', label: 'මුල් පිටුව', en: 'Home' },
  { name: 'browse', icon: 'menu_book', label: 'පිටක', en: 'Browse' },
  { name: 'search', icon: 'search', label: 'සෙවීම', en: 'Search' },
  { name: 'ask', icon: 'forum', label: 'විමසන්න', en: 'Ask' },
  { name: 'library', icon: 'bookmarks', label: 'පුස්තකාලය', en: 'Library' },
];

export default function TabsLayout() {
  const c = useColors(), insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}
      tabBar={({ state, navigation }) => (
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingTop: 6, paddingBottom: 8 + insets.bottom, paddingHorizontal: 4,
          backgroundColor: c.bg, borderTopWidth: 1, borderTopColor: c.line }}>
          {TABS.map((t, i) => {
            const on = state.index === i, col = on ? c.acct : c.mut;
            return (
              <Pressable key={t.name} onPress={() => navigation.navigate(t.name)} accessibilityRole="tab"
                accessibilityState={{ selected: on }} accessibilityLabel={`${t.label}, ${t.en}`}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 52 }}>
                <Icon name={t.icon} size={25} color={col} fill={on} />
                <T f={F.si6} size={12} lh={1.65} color={col}>{t.label}</T>
              </Pressable>
            );
          })}
        </View>
      )}>
      {TABS.map(t => <Tabs.Screen key={t.name} name={t.name} />)}
    </Tabs>
  );
}
