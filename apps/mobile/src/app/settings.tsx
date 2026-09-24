import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { PACKS } from '../data/content';
import { setSettings, useSettings } from '../db/user';
import { F, LANGS, SIZE_NAMES } from '../theme';
import { Card, Eyebrow, Icon, IconName, Page, Ring, Seg, T, Toggle, useColors } from '../ui';

export default function Settings() {
  const s = useSettings(), c = useColors();
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
          {/* ponytail: packs are not published yet. Rows list the collections; downloads come with the pack manifest. */}
          <T f={F.pali} size={14} lh={1.45} color={c.mut} style={{ paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
            Collections become downloadable with the first data release. Sizes are estimates.
          </T>
          {PACKS.map((p, i) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 62, borderBottomWidth: i < PACKS.length - 1 ? 1 : 0, borderBottomColor: c.line }}>
              <View style={{ flex: 1 }}>
                <T f={F.si5} size={15.5} lh={1.65}>{p.si}</T>
                <T f={F.pali} size={13} lh={1.3} color={c.mut}>{p.name} · ~{p.mb} MB</T>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: c.line }}>
                <Icon name="download" size={18} color={c.mut} />
                <T f={F.paliB} size={13} lh={1.2} color={c.mut}>Soon</T>
              </View>
            </View>
          ))}
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
