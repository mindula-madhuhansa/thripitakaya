import { useEffect, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, Text, TextInput, View, ViewToken } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { getSutta, hasText, IS_SAMPLE, lookup, neighbours, Node, Seg as Verse } from '../../data/content';
import {
  listBookmarks, listHighlights, listNotes, recordHistory, saveNote, saveWord, setSettings, toggleBookmark,
  toggleHighlight, useSettings, useUserData,
} from '../../db/user';
import { ShareBody } from '../../share';
import { F, FONT_STEPS, LINE_STEPS, SI_LINE_STEPS, SIZE_NAMES } from '../../theme';
import { Btn, Eyebrow, Icon, IconBtn, IconName, Page, Seg, Sheet, T, Toggle, toast, useColors, Wheel } from '../../ui';

type SheetKind = 'word' | 'display' | 'verse' | 'note' | 'share' | null;
const PUNCT = /[,;.!?'"‘’“”—–]/g;

export default function Reader() {
  const { id, seg } = useLocalSearchParams<{ id: string; seg?: string }>();
  const sutta = getSutta(id);
  if (!sutta) return <Page back eyebrow="Reader" title="මෙම පාඨය නැත"><T f={F.pali} size={15}>This text is not in this build yet.</T></Page>;
  return <ReaderView key={id} id={id} startSeg={seg} />;
}

function ReaderView({ id, startSeg }: { id: string; startSeg?: string }) {
  const version = useUserData();
  const s = useSettings(), c = useColors(), insets = useSafeAreaInsets();
  const sutta = getSutta(id)!, segs = sutta.segs, { prev, next } = neighbours(id);

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [sel, setSel] = useState(0);
  const [word, setWord] = useState({ v: 0, l: 0, w: 0 });
  const [cur, setCur] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const list = useRef<FlatList<Verse>>(null);
  const prog = useRef(new Animated.Value(0)).current, progN = useRef(0);

  // user data for this sutta
  const bms = new Set(listBookmarks().filter(b => b.sutta_id === id).map(b => b.seg_id));
  const hls = new Set(listHighlights().filter(h => h.sutta_id === id).map(h => h.seg_id));
  const notes = new Map(listNotes().filter(n => n.sutta_id === id).map(n => [n.seg_id, n.body]));

  // jump to ?seg= once, then flash it
  useEffect(() => {
    const i = segs.findIndex(x => x.id === startSeg);
    if (i < 0) return;
    const t = setTimeout(() => { list.current?.scrollToIndex({ index: i, viewOffset: 12 }); setFocus(i); }, 250);
    const u = setTimeout(() => setFocus(null), 2100);
    return () => { clearTimeout(t); clearTimeout(u); };
  }, []);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken<Verse>[] }) => {
    const first = viewableItems.find(v => v.index != null);
    if (first?.index == null) return;
    setCur(first.index);
    recordHistory(id, first.item.id, progN.current);
  }).current;

  // sizes (design renderVals)
  const side = s.mode === 'side', k = side ? 0.84 : 1, ab = s.siFont === 'abhaya' ? 1.14 : 1;
  const [pf, sf] = FONT_STEPS[s.fontStep], LH = LINE_STEPS[s.lhStep], SLH = SI_LINE_STEPS[s.lhStep];
  const siFam = s.siFont === 'abhaya' ? F.abhaya : F.si;
  const paliFam = s.script === 'sinhala' ? siFam : s.paFont === 'noto' ? F.noto : F.pali;
  const showSi = s.lang !== 'en', showEn = s.lang !== 'si';
  const sin = s.script === 'sinhala';
  const paliSize = pf * k, siSize = (s.mode === 'trans' ? sf * 1.08 : sf) * k * ab, enSize = (sf - 1) * k;

  // keep the last sheet's content while the sheet animates closed
  const lastSheet = useRef<SheetKind>(null);
  if (sheet) lastSheet.current = sheet;
  const kind = sheet ?? lastSheet.current;
  const selV = segs[sel];
  const snippet = (v: Verse) => v.roman[0];
  const openSheet = (kind: SheetKind, i: number) => { setSel(i); setSheet(kind); };
  const goSutta = (n?: Node) => n && (hasText(n.id) ? router.replace({ pathname: '/reader/[id]', params: { id: n.id } }) : toast('Not in this build yet'));

  const renderVerse = ({ item: v, index: i }: { item: Verse; index: number }) => {
    const bg = focus === i ? c.hl : hls.has(v.id) ? c.hlSoft : 'transparent';
    const pali = (
      <View style={{ flex: side ? 1 : undefined, gap: 2 }}>
        {v.roman.map((line, l) => {
          const rw = line.split(' '), sw = v.pali[l].split(' ');
          return (
            <Text key={l} maxFontSizeMultiplier={1.6} style={{ fontFamily: paliFam, fontSize: paliSize, lineHeight: Math.round(paliSize * LH), color: c.ink }}>
              {rw.map((w, wi) => {
                const act = sheet === 'word' && word.v === i && word.l === l && word.w === wi;
                return (
                  <Text key={wi} onPress={() => { setWord({ v: i, l, w: wi }); openSheet('word', i); if (s.tip) setSettings({ tip: false }); }}
                    style={act ? { backgroundColor: c.acc, color: c.onacc } : null}>
                    {(sin ? sw[wi] ?? w : w) + (wi < rw.length - 1 ? ' ' : '')}
                  </Text>
                );
              })}
            </Text>
          );
        })}
      </View>
    );
    const trans = (
      <View style={{ flex: side ? 1 : undefined, gap: 8 }}>
        {showSi ? <Text maxFontSizeMultiplier={1.6} style={{ fontFamily: siFam, fontSize: siSize, lineHeight: Math.round(siSize * SLH), color: s.mode === 'trans' ? c.ink : c.ink + 'D1' }}>{v.si}</Text> : null}
        {showEn && !(side && showSi) ? <Text maxFontSizeMultiplier={1.6} style={{ fontFamily: F.paliI, fontSize: enSize, lineHeight: Math.round(enSize * LH), color: c.mut }}>{v.en}</Text> : null}
      </View>
    );
    return (
      <View style={{ paddingTop: 14, paddingBottom: 16, paddingLeft: 50, paddingRight: 12, marginHorizontal: 12, borderRadius: 16, backgroundColor: bg }}>
        <Pressable onPress={() => openSheet('verse', i)} accessibilityRole="button" accessibilityLabel={`Verse ${v.n}, actions`}
          style={{ position: 'absolute', left: 6, top: 12, width: 36, height: 36, borderRadius: 18, borderWidth: 1,
            borderColor: sheet && sheet !== 'word' && sel === i ? c.acc : c.line, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <T f={F.pali} size={14} lh={1.1} color={c.mut}>{v.n}</T>
        </Pressable>
        {bms.has(v.id) ? <View style={{ position: 'absolute', right: 8, top: -3 }}><Icon name="bookmark" color={c.acct} fill /></View> : null}
        <View style={{ flexDirection: side ? 'row' : 'column', gap: side ? 14 : 10 }}>
          {s.mode !== 'trans' ? pali : null}
          {s.mode !== 'pali' ? trans : null}
        </View>
        {notes.has(v.id) ? (
          <Pressable onPress={() => { setNoteDraft(notes.get(v.id)!); openSheet('note', i); }} accessibilityRole="button"
            style={{ marginTop: 12, flexDirection: 'row', gap: 10, padding: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line }}>
            <Icon name="edit_note" size={19} color={c.acct} />
            <T size={14.5} lh={1.65} style={{ flex: 1 }}>{notes.get(v.id)}</T>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const header = (
    <View style={{ paddingHorizontal: 24, paddingTop: 22, gap: 6 }}>
      <T f={F.pali} size={13} lh={1.5} color={c.mut}>{sutta.trail}</T>
      <T f={sin ? F.si6 : F.pali} size={28} lh={1.3}>{sin ? sutta.titlePali : sutta.titleRoman}</T>
      <T f={F.si5} size={17} lh={1.6} color={c.mut}>{sutta.titleSi}</T>
      {IS_SAMPLE ? <T f={F.pali} size={12.5} lh={1.4} color={c.acct}>Sample text for development · not the Buddha Jayanti edition</T> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
        <T f={sin ? F.si : F.paliI} size={14.5} lh={1.5} color={c.mut} style={{ textAlign: 'center', maxWidth: 250 }}>{sutta.namo[sin ? 1 : 0]}</T>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </View>
      {s.tip ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, paddingLeft: 14, paddingRight: 4, borderRadius: 14, backgroundColor: c.soft, marginBottom: 8 }}>
          <Icon name="touch_app" size={20} color={c.acct} />
          <T f={F.pali} size={14} lh={1.45} style={{ flex: 1 }}>Tap a Pāḷi word for its meaning. Tap a verse number to bookmark, highlight, note or share.</T>
          <IconBtn name="close" label="Dismiss tip" size={20} color={c.mut} onPress={() => setSettings({ tip: false })} />
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
      <View style={{ alignItems: 'center', gap: 10, paddingTop: 26, paddingBottom: 8 }}>
        <Wheel size={22} />
        <T f={sin ? F.si : F.paliI} size={16} lh={1.4} color={c.mut}>{sutta.end[sin ? 1 : 0]}</T>
      </View>
      {next ? (
        <Pressable onPress={() => goSutta(next)} accessibilityRole="button"
          style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <View style={{ flex: 1 }}>
            <Eyebrow en="Next" si={`ඊළඟ · ${next.ref ?? ''}`} />
            <T f={F.si6} size={18} lh={1.55}>{next.si}</T>
            <T f={F.paliI} size={15} lh={1.3} color={c.mut}>{next.pali}</T>
          </View>
          <Icon name="arrow_forward" size={26} color={c.acct} />
        </Pressable>
      ) : null}
    </View>
  );

  const suttaBm = bms.has(null);
  const wv = segs[word.v], rawW = (wv.roman[word.l] ?? '').split(' ')[word.w] ?? '', ent = lookup(rawW);
  const sinW = (wv.pali[word.l] ?? '').split(' ')[word.w] ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      {/* top bar */}
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
        <IconBtn name="arrow_back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T f={F.si6} size={15} lh={1.3} numberOfLines={1}>{sutta.titleSi}</T>
          <T f={F.pali} size={12.5} lh={1.1} color={c.mut}>{sutta.ref}</T>
        </View>
        <Pressable onPress={() => setSheet('display')} accessibilityRole="button" accessibilityLabel="Display settings"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T f={F.pali} size={19} lh={1.1} allowFontScaling={false}>Aa</T>
        </Pressable>
        <IconBtn name="bookmark" label={suttaBm ? 'Remove sutta bookmark' : 'Bookmark sutta'} size={23} fill={suttaBm} color={suttaBm ? c.acct : c.ink}
          onPress={() => toast(toggleBookmark(id, null, sutta.titleRoman) ? 'Sutta bookmarked · සලකුණු කළා' : 'Bookmark removed')} />
      </View>
      <View style={{ height: 3, backgroundColor: c.line }}>
        <Animated.View style={{ height: 3, backgroundColor: c.acc, width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <Seg value={s.mode} onChange={mode => setSettings({ mode })} height={40} options={[
          { value: 'pali', label: 'Pāḷi' }, { value: 'trans', label: s.lang === 'en' ? 'English' : 'සිංහල' },
          { value: 'line', label: 'Parallel' }, { value: 'side', label: 'Side by side' }]} />
      </View>

      <FlatList
        ref={list} data={segs} keyExtractor={v => v.id} renderItem={renderVerse}
        extraData={[version, s, sheet, sel, word, focus]}
        ListHeaderComponent={header} ListFooterComponent={footer}
        onViewableItemsChanged={onViewable} viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        scrollEventThrottle={32}
        onScroll={e => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const max = contentSize.height - layoutMeasurement.height;
          progN.current = max > 0 ? Math.min(1, contentOffset.y / max) : 1;
          prog.setValue(progN.current);
        }}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          list.current?.scrollToOffset({ offset: averageItemLength * index, animated: false });
          setTimeout(() => list.current?.scrollToIndex({ index, viewOffset: 12 }), 100);
        }}
      />

      {/* bottom bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 + insets.bottom, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line }}>
        <NavEnd n={prev} dir="prev" onPress={() => goSutta(prev)} />
        <T f={F.pali} size={14} lh={1.2} color={c.mut} style={{ paddingHorizontal: 8 }}>{cur + 1} / {segs.length}</T>
        <NavEnd n={next} dir="next" onPress={() => goSutta(next)} />
      </View>

      <Sheet open={!!sheet} onClose={() => setSheet(null)}>
        {kind === 'word' && (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T f={F.pali} size={31} lh={1.25}>{rawW.replace(PUNCT, '')}</T>
                <T size={18} lh={1.6} color={c.mut}>{sinW}</T>
              </View>
              <IconBtn name="bookmark_add" label="Save word" size={22} color={c.acct}
                onPress={() => { saveWord(rawW.replace(PUNCT, '').toLowerCase()); toast('Saved to word list · වචනය සුරැකිණි'); }}
                style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.soft }} />
            </View>
            {ent ? <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {[ent.grammar, '√ / ' + ent.construction].map(g => (
                  <View key={g} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9, backgroundColor: c.soft }}><T f={F.pali} size={13.5} lh={1.2}>{g}</T></View>
                ))}
              </View>
              <View style={{ height: 1, backgroundColor: c.line }} />
              {/* Sinhala meaning (සිංහල අර්ථය) comes from the Buddhadatta/Sumaṅgala dictionary pack; the sample glossary has none */}
              <View style={{ gap: 4 }}>
                <Eyebrow en="English" />
                <T f={F.paliI} size={18} lh={1.5}>{ent.en}</T>
              </View>
            </> : (
              <View style={{ gap: 6, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line }}>
                <T f={F.si6} size={16} lh={1.6}>කෙටි ශබ්දකෝෂයේ මෙම වචනය නැත</T>
                <T f={F.pali} size={14.5} lh={1.5} color={c.mut}>This word isn’t in the dictionary yet. It may be a sandhi form — try tapping a neighbouring word.</T>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4 }}>
              <T f={F.pali} size={13} lh={1.4} color={c.mut} style={{ flex: 1 }}>{sutta.ref} · verse {word.v + 1} · works offline</T>
              <Btn label="Done" onPress={() => setSheet(null)} style={{ height: 46 }} />
            </View>
          </View>
        )}

        {kind === 'display' && (
          <View style={{ gap: 18 }}>
            <T f={F.si7} size={20} lh={1.65}>කියවීමේ සැකසුම් <T f={F.pali} size={15} color={c.mut}>· Display</T></T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <SizeBtn label="A−" size={16} a11y="Smaller text" onPress={() => setSettings({ fontStep: Math.max(0, s.fontStep - 1) })} />
              <View style={{ flex: 1, alignItems: 'center', gap: 8 }}>
                <T f={F.si6} size={15} lh={1.4}>{SIZE_NAMES[s.fontStep]}</T>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {SIZE_NAMES.map((_, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i <= s.fontStep ? c.acct : c.line }} />)}
                </View>
              </View>
              <SizeBtn label="A+" size={23} a11y="Larger text" onPress={() => setSettings({ fontStep: Math.min(4, s.fontStep + 1) })} />
            </View>
            <View style={{ gap: 8 }}>
              <Eyebrow en="Line spacing" si="පේළි පරතරය" />
              <Seg value={s.lhStep} onChange={lhStep => setSettings({ lhStep })} height={54}
                options={[{ value: 0, label: 'ඝන', sub: 'Compact' }, { value: 1, label: 'සාමාන්‍ය', sub: 'Comfortable' }, { value: 2, label: 'ඉඩ සහිත', sub: 'Airy' }]} />
            </View>
            <View style={{ gap: 8 }}>
              <Eyebrow en="Theme" si="පසුබිම" />
              <Seg value={s.theme} onChange={theme => setSettings({ theme })} height={48}
                options={[{ value: 'paper', label: 'කඩදාසි · Paper' }, { value: 'night', label: 'රාත්‍රී · Night' }]} />
            </View>
            <View style={{ gap: 8 }}>
              <Eyebrow en="Pāḷi script" si="පාළි අක්ෂර" />
              <Seg value={s.script} onChange={script => setSettings({ script })} height={46}
                options={[{ value: 'roman', label: 'Roman · ā ṃ ñ' }, { value: 'sinhala', label: 'සිංහල අකුරු' }]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View><T f={F.si6} size={15.5} lh={1.65}>ඉංග්‍රීසි පරිවර්තනය</T><T f={F.pali} size={13.5} lh={1.3} color={c.mut}>Show English translation</T></View>
              <Toggle on={showEn} label="Show English translation" onPress={() => setSettings({ lang: showEn ? 'si' : 'both' })} />
            </View>
          </View>
        )}

        {kind === 'verse' && (
          <View style={{ gap: 16 }}>
            <Eyebrow en={`Verse ${selV.n}`} si={`ගාථා ${selV.n} · ${sutta.ref}`} />
            <View style={{ gap: 6 }}>
              <T f={F.paliI} size={18} lh={1.55}>{selV.roman[0]}</T>
              <T size={15} lh={1.7} color={c.mut} numberOfLines={2}>{selV.si}</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <Action icon="bookmark" si="සලකුණ" en={bms.has(selV.id) ? 'Saved' : 'Bookmark'} on={bms.has(selV.id)}
                onPress={() => toast(toggleBookmark(id, selV.id, snippet(selV)) ? 'Bookmarked · සලකුණු කළා' : 'Bookmark removed')} />
              <Action icon="ink_highlighter" si="ඉස්මතු" en={hls.has(selV.id) ? 'On' : 'Highlight'} on={hls.has(selV.id)}
                onPress={() => { toggleHighlight(id, selV.id, snippet(selV)); setSheet(null); }} />
              <Action icon="edit_note" si="සටහන" en="Note" onPress={() => { setNoteDraft(notes.get(selV.id) ?? ''); setSheet('note'); }} />
              <Action icon="ios_share" si="බෙදාගන්න" en="Share" onPress={() => setSheet('share')} />
            </View>
            <Pressable accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: c.line }}
              onPress={async () => {
                await Clipboard.setStringAsync([selV.roman.join('\n'), selV.si, `— ${sutta.titleRoman} · ${sutta.ref} · v${selV.n}`].join('\n\n'));
                setSheet(null); toast('Verse copied · පිටපත් විය');
              }}>
              <Icon name="content_copy" size={20} color={c.mut} />
              <T f={F.si5} size={15} lh={1.65}>පිටපත් කරන්න · Copy text</T>
            </Pressable>
          </View>
        )}

        {kind === 'note' && (
          <View style={{ gap: 14 }}>
            <View>
              <Eyebrow en={`Note · Verse ${selV.n}`} />
              <T f={F.si7} size={20} lh={1.65}>පුද්ගලික සටහන</T>
            </View>
            <TextInput value={noteDraft} onChangeText={setNoteDraft} multiline numberOfLines={5} placeholder="ඔබේ සටහන මෙහි ලියන්න…"
              placeholderTextColor={c.mut} textAlignVertical="top" accessibilityLabel="Note"
              style={{ minHeight: 140, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1.5, borderColor: c.line,
                backgroundColor: c.bg, fontFamily: F.si, fontSize: 16.5, lineHeight: 29, color: c.ink }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="lock" size={18} color={c.mut} />
              <T f={F.pali} size={13.5} lh={1.4} color={c.mut} style={{ flex: 1 }}>Stays on your phone and in your own device backup. We never see it.</T>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn outline label="Delete" style={{ flex: 1 }} onPress={() => { saveNote(id, selV.id, ''); setNoteDraft(''); setSheet(null); }} />
              <Btn label="සුරකින්න · Save" style={{ flex: 2 }} onPress={() => { saveNote(id, selV.id, noteDraft, snippet(selV)); setSheet(null); toast('Note saved · සටහන සුරැකිණි'); }} />
            </View>
          </View>
        )}

        {kind === 'share' && (
          <ShareBody item={{ ref: `${sutta.ref} · verse ${selV.n}`, title: sutta.titleRoman, lines: selV.roman, si: selV.si }} onDone={() => setSheet(null)} />
        )}
      </Sheet>
    </View>
  );
}

function NavEnd({ n, dir, onPress }: { n?: Node; dir: 'prev' | 'next'; onPress: () => void }) {
  const c = useColors(), end = dir === 'next';
  if (!n) return <View style={{ flex: 1 }} />;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${end ? 'Next' : 'Previous'}: ${n.pali}`}
      style={{ flex: 1, minWidth: 0, height: 52, flexDirection: end ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={end ? 'chevron_right' : 'chevron_left'} size={24} color={c.mut} />
      <View style={{ flexShrink: 1, alignItems: end ? 'flex-end' : 'flex-start' }}>
        <T f={F.pali} size={12} lh={1.2} color={c.mut}>{n.ref}</T>
        <T f={F.si6} size={14.5} lh={1.65} numberOfLines={1}>{n.si}</T>
      </View>
    </Pressable>
  );
}

function SizeBtn({ label, size, a11y, onPress }: { label: string; size: number; a11y: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}
      style={{ width: 56, height: 56, borderRadius: 16, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' }}>
      <T f={F.pali} size={size} lh={1.1} allowFontScaling={false}>{label}</T>
    </Pressable>
  );
}

function Action({ icon, si, en, on, onPress }: { icon: IconName; si: string; en: string; on?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={en} accessibilityState={{ selected: !!on }}
      style={{ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 4 }}>
      <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: on ? c.hl : c.soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={25} fill={on} />
      </View>
      <T f={F.si6} size={13} lh={1.4}>{si}</T>
      <T f={F.pali} size={11.5} lh={1.1} color={c.mut}>{en}</T>
    </Pressable>
  );
}
