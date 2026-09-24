import { ReactNode, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextProps, View, ViewStyle, StyleProp, TextStyle,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, night, paper } from './theme';
import { useSettings } from './db/user';

export const useColors = () => (useSettings().theme === 'night' ? night : paper);

// --- text. Chrome text caps OS font scaling; the reader has its own size control.
type TP = TextProps & { f?: string; size?: number; lh?: number; color?: string; style?: StyleProp<TextStyle> };
export function T({ f = F.si, size = 16, lh = 1.5, color, style, ...rest }: TP) {
  const c = useColors();
  return <Text maxFontSizeMultiplier={1.3} {...rest}
    style={[{ fontFamily: f, fontSize: size, lineHeight: Math.round(size * lh), color: color ?? c.ink }, style]} />;
}

/** Small uppercase label, optionally followed by a Sinhala gloss: "BROWSE · පිටක". */
export function Eyebrow({ en, si, style }: { en: string; si?: string; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <T f={F.paliB} size={12} lh={1.4} color={c.mut} style={[{ letterSpacing: 1.7 }, style]}>
      {en.toUpperCase()}{si ? <T f={F.si6} size={12} color={c.mut} style={{ letterSpacing: 0 }}>{' · ' + si}</T> : null}
    </T>
  );
}

// --- icons: subset static Material Symbols Rounded (assets/fonts), FILL 0 and FILL 1.
// Regenerate: fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,<0|1>,0&icon_names=<sorted,list>
// with a non-browser User-Agent to get TTF. Codepoints below are valid in both subsets.
const GLYPH = {
  arrow_back: 0xe5c4, arrow_forward: 0xe5c8, arrow_upward: 0xe5d8, bookmark: 0xe866, bookmark_add: 0xe598, bookmarks: 0xe98b,
  chevron_left: 0xe408, chevron_right: 0xe409, close: 0xe14c, cloud_off: 0xe2c1, content_copy: 0xe14d, download: 0xe171,
  download_done: 0xe9aa, downloading: 0xf001, edit: 0xe3c9, edit_note: 0xe745, edit_square: 0xf88d, flag: 0xe153,
  forum: 0xe0bf, history: 0xe28e, home: 0xe88a, info: 0xe88e, ink_highlighter: 0xe6d1, ios_share: 0xe6b8, lock: 0xe897,
  menu_book: 0xea19, north_east: 0xf1e1, north_west: 0xf1e2, person_off: 0xe510, phone_android: 0xe324, replay: 0xe042,
  search: 0xe8b6, search_off: 0xea76, settings: 0xe8b8, touch_app: 0xe913, volunteer_activism: 0xea70,
};
export type IconName = keyof typeof GLYPH;
export function Icon({ name, size = 22, color, fill }: { name: IconName; size?: number; color?: string; fill?: boolean }) {
  const c = useColors();
  return <Text allowFontScaling={false} importantForAccessibility="no" accessibilityElementsHidden
    style={{ fontFamily: fill ? F.symFill : F.sym, fontSize: size, lineHeight: size, color: color ?? c.ink }}>
    {String.fromCodePoint(GLYPH[name])}
  </Text>;
}

/** 44pt touch target around an icon. `label` is required: icon-only buttons need a screen-reader name. */
export function IconBtn({ name, label, onPress, size = 24, color, fill, style }:
  { name: IconName; label: string; onPress: () => void; size?: number; color?: string; fill?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={name} size={size} color={color} fill={fill} />
    </Pressable>
  );
}

/** Dhammacakka mark from the design, drawn with Views (no SVG dependency). */
export function Wheel({ size = 24, color, stroke = 1.5 }: { size?: number; color?: string; stroke?: number }) {
  const c = useColors(), col = color ?? c.acc, w = stroke * size / 24, len = size * 0.85, hub = size * 0.19;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', width: size * 0.85, height: size * 0.85, borderRadius: size, borderWidth: w, borderColor: col }} />
      {[0, 45, 90, 135].map(r => (
        <View key={r} style={{ position: 'absolute', width: len, height: w, backgroundColor: col, transform: [{ rotate: r + 'deg' }] }} />
      ))}
      <View style={{ width: hub, height: hub, borderRadius: hub, borderWidth: w, borderColor: col, backgroundColor: c.bg }} />
    </View>
  );
}

export function Card({ children, style, onPress, soft }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; soft?: boolean }) {
  const c = useColors();
  const s = [{ borderRadius: 18, backgroundColor: soft ? c.soft : c.card, borderWidth: soft ? 0 : 1, borderColor: c.line }, style];
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" style={s}>{children}</Pressable> : <View style={s}>{children}</View>;
}

/** Segmented control. */
export function Seg<V extends string | number>({ options, value, onChange, height = 44 }:
  { options: { value: V; label: string; sub?: string }[]; value: V; onChange: (v: V) => void; height?: number }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 3, padding: 3, borderRadius: 14, backgroundColor: c.soft }} accessibilityRole="radiogroup">
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: height, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
              backgroundColor: on ? c.card : 'transparent', elevation: on ? 1 : 0, shadowColor: '#28180A', shadowOpacity: on ? 0.14 : 0, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } }}>
            <T f={F.si6} size={13.5} lh={1.4} color={on ? c.ink : c.mut} numberOfLines={1}>{o.label}</T>
            {o.sub ? <T f={F.pali} size={11.5} lh={1.1} color={c.mut}>{o.sub}</T> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, on, onPress, square }: { label: string; on: boolean; onPress: () => void; square?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }}
      style={{ height: 44, paddingHorizontal: 16, borderRadius: square ? 12 : 22, borderWidth: 1, justifyContent: 'center',
        borderColor: on ? c.ink : c.line, backgroundColor: on ? c.ink : 'transparent' }}>
      <T f={F.si6} size={14.5} lh={1.3} color={on ? c.bg : c.ink}>{label}</T>
    </Pressable>
  );
}

export function Chips({ children }: { children: ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}
    contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>{children}</ScrollView>;
}

/** On-state track uses --acct, not saffron: saffron on paper is only ~2.5:1 contrast. */
export function Toggle({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: on }}
      style={{ width: 54, height: 32, borderRadius: 16, backgroundColor: on ? c.acct : c.line, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', left: on ? 25 : 3, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FBF8F2', elevation: 2 }} />
    </Pressable>
  );
}

export function Btn({ label, onPress, icon, outline, style }:
  { label: string; onPress: () => void; icon?: IconName; outline?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={[{ height: 52, paddingHorizontal: 22, borderRadius: 26, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
        backgroundColor: outline ? 'transparent' : c.ink, borderWidth: outline ? 1 : 0, borderColor: c.line }, style]}>
      {icon ? <Icon name={icon} size={20} color={outline ? c.ink : c.bg} /> : null}
      <T f={F.si6} size={15.5} lh={1.3} color={outline ? c.acct : c.bg}>{label}</T>
    </Pressable>
  );
}

/** Option card with a ring when selected (fonts, themes, onboarding). */
export function Ring({ on, onPress, children, style, label }:
  { on: boolean; onPress: () => void; children: ReactNode; style?: StyleProp<ViewStyle>; label?: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label}
      style={[{ borderRadius: 14, borderWidth: 1.5, borderColor: on ? c.acc : c.line, padding: 12 }, style]}>{children}</Pressable>
  );
}

// --- bottom sheet
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const c = useColors(), insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(open);
  useEffect(() => {
    if (open) { setShown(true); Animated.timing(a, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }
    else Animated.timing(a, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setShown(false));
  }, [open]);
  if (!shown) return null;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.dim, opacity: a }]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={{ maxHeight: '86%', backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [700, 0] }) }] }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center', marginTop: 10, marginBottom: 16 }} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 30 + insets.bottom }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// --- toast (one host in the root layout)
let showToast: (m: string) => void = () => {};
export const toast = (m: string) => showToast(m);
export function ToastHost() {
  const c = useColors(), insets = useSafeAreaInsets();
  const [msg, setMsg] = useState('');
  const a = useRef(new Animated.Value(0)).current, timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  showToast = m => {
    setMsg(m); AccessibilityInfo.announceForAccessibility(m);
    Animated.timing(a, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(a, { toValue: 0, duration: 250, useNativeDriver: true }).start(), 2200);
  };
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: 100 + insets.bottom, alignItems: 'center', opacity: a }}>
      <View style={{ paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22, backgroundColor: c.ink, maxWidth: 320 }}>
        <T f={F.si5} size={14.5} lh={1.45} color={c.bg} style={{ textAlign: 'center' }}>{msg}</T>
      </View>
    </Animated.View>
  );
}

// --- page shell for tab and stack screens
export function Page({ children, eyebrow, title, back, gap = 18, scroll = true }:
  { children?: ReactNode; eyebrow?: string; title?: string; back?: boolean; gap?: number; scroll?: boolean }) {
  const c = useColors(), insets = useSafeAreaInsets();
  const head = (eyebrow || back) ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: back ? -12 : 0 }}>
      {back ? <IconBtn name="arrow_back" label="Back" onPress={() => router.back()} /> : null}
      <View>
        {eyebrow ? <Eyebrow en={eyebrow} /> : null}
        {title ? <T f={F.si7} size={27} lh={1.55}>{title}</T> : null}
      </View>
    </View>
  ) : null;
  const pad = { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, gap };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {scroll
        ? <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled">{head}{children}</ScrollView>
        : <View style={[pad, { flex: 1 }]}>{head}{children}</View>}
    </View>
  );
}

export function ago(ts: number) {
  const days = Math.floor((new Date().setHours(24, 0, 0, 0) - ts) / 864e5);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days` : new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const openReader = (id: string, seg?: string | null) =>
  router.push({ pathname: '/reader/[id]', params: seg ? { id, seg } : { id } });

export const Divider = () => { const c = useColors(); return <View style={{ height: 1, backgroundColor: c.line }} />; };
