import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { cite, firstLeaf, type LangFilter, romanTitle, search } from '../../data/content';
import { isInstalled, PACKS, usePacks } from '../../data/packs';
import { addRecentSearch, recentSearches, useUserData } from '../../db/user';
import { F } from '../../theme';
import { Btn, Card, Chip, Chips, Eyebrow, Icon, IconBtn, openReader, Page, T, useColors } from '../../ui';

const LANG: [LangFilter, string][] = [['all', 'All · සියල්ල'], ['pali', 'Pāḷi'], ['si', 'සිංහල'], ['en', 'English']];
const PIT = [['all', 'All piṭakas'], ['vinaya', 'Vinaya'], ['sutta', 'Sutta'], ['abhi', 'Abhidhamma']];
const NIK = [['all', 'All nikāyas'], ['dn', 'Dīgha'], ['mn', 'Majjhima'], ['sn', 'Saṃyutta'], ['an', 'Aṅguttara'], ['kn', 'Khuddaka']];
const WINDOW = 110; // characters of context kept on each side of the match

export default function Search() {
  useUserData(); usePacks();
  const c = useColors();
  const [q, setQ] = useState('');
  const [lang, setLang] = useState<LangFilter>('all');
  const [pitaka, setPitaka] = useState('all');
  const [nikaya, setNikaya] = useState('all');
  const hits = search(q, { lang, pitaka, nikaya });
  const typed = q.trim().length > 0;
  const packs = PACKS.filter(p => isInstalled(p.id)).length;

  return (
    <Page eyebrow="Search" title="සෙවීම" gap={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 54, paddingLeft: 18, paddingRight: 6, borderRadius: 27, backgroundColor: c.card, borderWidth: 1.5, borderColor: c.line }}>
        <Icon name="search" size={23} color={c.mut} />
        <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => addRecentSearch(q)} returnKeyType="search"
          placeholder="සිංහල or Pāḷi" placeholderTextColor={c.mut} accessibilityLabel="Search the texts"
          autoCorrect={false} autoCapitalize="none"
          style={{ flex: 1, minWidth: 0, fontFamily: F.pali, fontSize: 17, color: c.ink, paddingVertical: 0 }} />
        {typed ? <IconBtn name="close" label="Clear search" size={20} color={c.mut} onPress={() => setQ('')} /> : null}
      </View>
      <T f={F.pali} size={13.5} lh={1.4} color={c.mut} style={{ marginTop: -4, paddingLeft: 4 }}>
        Diacritics optional: “metta” finds “mettā”. Pāḷi in either script. Searching Khp, Dhp, Snp{packs ? ` + ${packs} downloaded collection${packs > 1 ? 's' : ''}` : ''}.
      </T>

      <Chips>{LANG.map(([v, l]) => <Chip key={v} label={l} on={lang === v} onPress={() => setLang(v)} />)}</Chips>
      <Chips>{PIT.map(([v, l]) => <Chip key={v} label={l} on={pitaka === v} onPress={() => { setPitaka(v); setNikaya('all'); }} />)}</Chips>
      {pitaka === 'sutta' ? <Chips>{NIK.map(([v, l]) => <Chip key={v} square label={l} on={nikaya === v} onPress={() => setNikaya(v)} />)}</Chips> : null}

      {lang === 'en' ? (
        <T f={F.pali} size={15} lh={1.5} color={c.mut} style={{ paddingTop: 12 }}>English search arrives with the English pack.</T>
      ) : !typed ? (
        <View style={{ gap: 10, paddingTop: 8 }}>
          <Eyebrow en="Recent" si="මෑත සෙවීම්" />
          {(recentSearches().length ? recentSearches() : ['mettā', 'anicca', 'සතිපට්ඨාන', 'nibbāna']).map(r => (
            <Pressable key={r} onPress={() => setQ(r)} accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Icon name="history" size={20} color={c.mut} />
              <T f={F.pali} size={16.5} lh={1.5} style={{ flex: 1 }}>{r}</T>
              <Icon name="north_west" size={20} color={c.mut} />
            </Pressable>
          ))}
        </View>
      ) : hits.length ? <>
        <T f={F.pali} size={14} lh={1.4} color={c.mut} style={{ paddingTop: 4 }}>
          {hits.length === 100 ? 'First 100 passages' : `${hits.length} ${hits.length === 1 ? 'passage' : 'passages'}`} · ප්‍රතිඵල {hits.length}
        </T>
        {hits.map(h => {
          const a = Array.from(h.text), [s0, s1] = h.range ?? [0, 0];
          const from = Math.max(0, s0 - WINDOW), to = Math.min(a.length, s1 + WINDOW);
          const font = h.field === 'pali' ? F.pali : F.si;
          return (
            <Card key={h.seg.id} onPress={() => { addRecentSearch(q); openReader(firstLeaf(h.node.id), h.seg.id); }} style={{ paddingHorizontal: 18, paddingVertical: 16, gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <T f={F.si6} size={16.5} lh={1.65}>{h.node.title_si}</T>
                  <T f={F.paliI} size={14.5} lh={1.3} color={c.mut}>{romanTitle(h.node)}</T>
                </View>
                {cite(h.node.id) ? (
                  <View style={{ paddingVertical: 6, paddingHorizontal: 9, borderRadius: 9, backgroundColor: c.soft }}>
                    <T f={F.paliB} size={12.5} lh={1.1} color={c.acct}>{cite(h.node.id)}</T>
                  </View>
                ) : null}
              </View>
              <T f={font} size={16} lh={1.7}>
                {from > 0 ? '…' : ''}{a.slice(from, s0).join('')}
                <T f={font} size={16} lh={1.7} style={{ backgroundColor: c.hl }}>{a.slice(s0, s1).join('')}</T>
                {a.slice(s1, to).join('')}{to < a.length ? '…' : ''}
              </T>
              <T f={F.pali} size={12.5} lh={1.2} color={c.mut}>{h.field === 'pali' ? 'Pāḷi' : 'සිංහල'}</T>
            </Card>
          );
        })}
      </> : (
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 40, paddingHorizontal: 16 }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="search_off" size={34} color={c.mut} />
          </View>
          <T f={F.si6} size={19} lh={1.6} style={{ marginTop: 6 }}>කිසිවක් හමු නොවීය</T>
          <T f={F.pali} size={15} lh={1.5} color={c.mut} style={{ textAlign: 'center' }}>
            No passages found. Try fewer words or a different spelling. Collections you have not downloaded are not searched.
          </T>
          <Btn outline label="Clear filters" style={{ marginTop: 8, height: 48 }} onPress={() => { setLang('all'); setPitaka('all'); setNikaya('all'); }} />
        </View>
      )}
    </Page>
  );
}
