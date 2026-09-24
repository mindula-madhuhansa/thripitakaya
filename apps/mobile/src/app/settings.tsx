import { useEffect } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { install, installedBytes, installedVersion, isInstalled, loadManifest, PACKS, remove, usePacks } from '../data/packs';
import { setSettings, useSettings } from '../db/user';
import { F, LANGS, SIZE_NAMES } from '../theme';
import { Card, Eyebrow, Icon, IconName, Page, Ring, Seg, T, Toggle, useColors } from '../ui';

const confirmRemove = (id: string, name: string) =>
  Alert.alert(`Remove ${name}?`, 'Your bookmarks and notes stay. You can download it again any time.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => remove(id) },
  ]);

export default function Settings() {
  const s = useSettings(), c = useColors(), { manifest, progress, error } = usePacks();
  useEffect(() => { loadManifest().catch(() => {}); }, []);   // update check: a plain GET, no identifiers
  const row = { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line, gap: 10 };

  return (
    <Page back eyebrow="Settings" title="සැකසුම්" gap={22}>
      <View style={{ gap: 10 }}>
        <Eyebrow en="Language" si="භාෂාව" />
        <Card style={{ padding: 16, gap: 12 }}>
          <T f={F.si6} size={15.5} lh={1.65}>පරිවර්තනය <T f={F.pali} size={13.5} color={c.mut}>· Translation</T></T>
          <Seg value={s.lang} onChange={lang => setSettings({ lang })} options={LANGS.map(l => ({ value: l.value, label: l.label }))} />
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <Eyebrow en="Reading" si="කියවීම" />
        <Card style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          <View style={row}>
            <T f={F.si6} size={15.5} lh={1.65}>සිංහල අකුරු <T f={F.pali} size={13.5} color={c.mut}>· Sinhala font</T></T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Ring on={s.siFont === 'noto'} onPress={() => setSettings({ siFont: 'noto' })} style={{ flex: 1, gap: 4 }} label="Noto Serif Sinhala">
                <T size={18} lh={1.6}>බුද්ධං සරණං</T><T f={F.pali} size={12} lh={1.2} color={c.mut}>Noto Serif Sinhala</T>
              </Ring>
              <Ring on={s.siFont === 'abhaya'} onPress={() => setSettings({ siFont: 'abhaya' })} style={{ flex: 1, gap: 4 }} label="Abhaya Libre">
                <T f={F.abhaya} size={21} lh={1.45}>බුද්ධං සරණං</T><T f={F.pali} size={12} lh={1.2} color={c.mut}>Abhaya Libre</T>
              </Ring>
            </View>
          </View>
          <View style={row}>
            <T f={F.si6} size={15.5} lh={1.65}>පාළි අකුරු <T f={F.pali} size={13.5} color={c.mut}>· Pāḷi font & script</T></T>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Ring on={s.script === 'roman' && s.paFont === 'gentium'} onPress={() => setSettings({ paFont: 'gentium', script: 'roman' })} style={{ flex: 1, gap: 4, padding: 10 }} label="Gentium">
                <T f={F.pali} size={17} lh={1.4}>saraṇaṃ</T><T f={F.pali} size={11.5} lh={1.2} color={c.mut}>Gentium</T>
              </Ring>
              <Ring on={s.script === 'roman' && s.paFont === 'noto'} onPress={() => setSettings({ paFont: 'noto', script: 'roman' })} style={{ flex: 1, gap: 4, padding: 10 }} label="Noto Serif">
                <T f={F.noto} size={16} lh={1.5}>saraṇaṃ</T><T f={F.pali} size={11.5} lh={1.2} color={c.mut}>Noto Serif</T>
              </Ring>
              <Ring on={s.script === 'sinhala'} onPress={() => setSettings({ script: 'sinhala' })} style={{ flex: 1, gap: 4, padding: 10 }} label="Sinhala script">
                <T size={16} lh={1.65}>සරණං</T><T f={F.pali} size={11.5} lh={1.2} color={c.mut}>Sinhala script</T>
              </Ring>
            </View>
          </View>
          <View style={[row, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View><T f={F.si6} size={15.5} lh={1.65}>අකුරු ප්‍රමාණය</T><T f={F.pali} size={13.5} lh={1.3} color={c.mut}>Text size · {SIZE_NAMES[s.fontStep]}</T></View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([['A−', 15, -1, 'Smaller text'], ['A+', 20, 1, 'Larger text']] as const).map(([l, fs, d, a11y]) => (
                <Pressable key={l} onPress={() => setSettings({ fontStep: Math.min(4, Math.max(0, s.fontStep + d)) })} accessibilityRole="button" accessibilityLabel={a11y}
                  style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
                  <T f={F.pali} size={fs} lh={1.1} allowFontScaling={false}>{l}</T>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={[row, { borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <View><T f={F.si6} size={15.5} lh={1.65}>රාත්‍රී පසුබිම</T><T f={F.pali} size={13.5} lh={1.3} color={c.mut}>Night theme</T></View>
            <Toggle on={s.theme === 'night'} label="Night theme" onPress={() => setSettings({ theme: s.theme === 'night' ? 'paper' : 'night' })} />
          </View>
        </Card>
      </View>

      <View style={{ gap: 10 }}>
        <Eyebrow en="Offline downloads" si="බාගත කිරීම්" />
        <Card style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
          <T f={F.pali} size={14} lh={1.45} color={c.mut} style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
            {`${(installedBytes() / 1e6).toFixed(0)} MB on this phone. Khuddakapāṭha, Dhammapada and Sutta Nipāta are always included.`}
            {!manifest ? ' Connect to the internet to download more.' : ''}
          </T>
          {PACKS.map((p, i) => {
            const m = manifest?.packs.find(x => x.id === p.id), have = isInstalled(p.id), pct = progress[p.id];
            const update = have && m && installedVersion(p.id) !== m.version;
            const [icon, label, act]: [IconName, string, (() => void) | undefined] =
              pct != null ? ['downloading', `${Math.round(pct * 100)}%`, undefined]
              : update ? ['download', 'Update', () => install(p.id).catch(() => {})]
              : have ? ['download_done', 'Saved', () => confirmRemove(p.id, p.name)]
              : ['download', 'Download', m ? () => install(p.id).catch(() => {}) : undefined];
            return (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, borderBottomWidth: i < PACKS.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
                <View style={{ flex: 1 }}>
                  <T f={F.si5} size={15.5} lh={1.65}>{p.si}</T>
                  <T f={F.pali} size={13} lh={1.3} color={c.mut}>{p.name}{m ? ` · ${(m.bytes / 1e6).toFixed(1)} MB` : ''}</T>
                </View>
                <Pressable onPress={act} disabled={!act} accessibilityRole="button" accessibilityLabel={`${label} ${p.name}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1,
                    borderColor: have && !update ? c.line : c.acc, opacity: act || pct != null ? 1 : 0.5 }}>
                  <Icon name={icon} size={18} color={have && !update ? c.mut : c.acct} />
                  <T f={F.paliB} size={13} lh={1.2} color={have && !update ? c.mut : c.acct}>{label}</T>
                </Pressable>
              </View>
            );
          })}
          {error ? <T f={F.pali} size={13.5} lh={1.4} color={c.acct} style={{ paddingVertical: 10 }}>{error}</T> : null}
        </Card>
      </View>

      <Card style={{ paddingHorizontal: 16 }}>
        {([['volunteer_activism', 'මෙම ධර්ම දානය ගැන', 'About', () => router.push('/about')],
          ['replay', 'පිළිගැනීම නැවත', 'Replay welcome', () => setSettings({ onboarded: false })]] as [IconName, string, string, () => void][]).map(([ic, si, en, go], i) => (
          <Pressable key={en} onPress={go} accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
            <Icon name={ic} size={21} color={c.acct} />
            <T f={F.si5} size={15.5} lh={1.65} style={{ flex: 1 }}>{si} <T f={F.pali} size={13.5} color={c.mut}>· {en}</T></T>
            <Icon name="chevron_right" color={c.mut} />
          </Pressable>
        ))}
      </Card>
    </Page>
  );
}
