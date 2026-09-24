import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Pressable, TextInput, View, ViewToken } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { toRoman, withZwj } from '@thripitakaya/shared';
import {
  available, chain, cite, footnotes, getNode, getText, isHeading, neighbours, plain, romanTitle, type Node, type Seg,
} from '../../data/content';
import { install, PACKS, usePacks } from '../../data/packs';
import {
  listBookmarks, listHighlights, listNotes, recordHistory, saveNote, saveWord, setSettings, toggleBookmark,
  toggleHighlight, useSettings, useUserData,
} from '../../db/user';
import { ShareBody } from '../../share';
import { Marked } from '../../text';
import { F, FONT_STEPS, LINE_STEPS, SI_LINE_STEPS, SIZE_NAMES } from '../../theme';
import { Btn, Eyebrow, Icon, IconBtn, type IconName, Page, Seg as Segmented, Sheet, T, Toggle, toast, useColors, Wheel } from '../../ui';

type SheetKind = 'word' | 'display' | 'verse' | 'note' | 'share' | 'footnote' | null;
const PUNCT = /[,;.!?'"‘’“”—–]/g;

export default function Reader() {
  const { id, seg } = useLocalSearchParams<{ id: string; seg?: string }>();
  usePacks(); // re-render when a pack finishes downloading
  const node = getNode(id);
  if (!node) return <Page back eyebrow="Reader" title="පාඨය හමු නොවීය"><T f={F.pali} size={15}>This text could not be found.</T></Page>;
  if (!available(node)) return <NotDownloaded node={node} />;
  return <ReaderView key={id} node={node} startSeg={seg} />;
}

function NotDownloaded({ node }: { node: Node }) {
  const c = useColors(), { progress, error } = usePacks(), pack = PACKS.find(p => p.id === node.pack);
  const p = progress[node.pack];
  return (
    <Page back eyebrow={cite(node.id)} title={node.title_si}>
      <T f={F.paliI} size={17} lh={1.3} color={c.mut}>{romanTitle(node)}</T>
      <View style={{ padding: 18, borderRadius: 18, backgroundColor: c.soft, gap: 10 }}>
        <T f={F.si6} size={16} lh={1.6}>{pack?.si} බාගත කර නැත</T>
        <T f={F.pali} size={14.5} lh={1.5} color={c.mut}>This text is in the {pack?.name} collection. Download it once and it reads offline from then on.</T>
        {p != null
          ? <T f={F.paliB} size={15} color={c.acct}>Downloading… {Math.round(p * 100)}%</T>
          : <Btn label="Download · බාගත කරන්න" icon="download" onPress={() => install(node.pack).catch(() => {})} />}
        {error ? <T f={F.pali} size={13.5} lh={1.4} color={c.acct}>{error}</T> : null}
      </View>
    </Page>
  );
}

function ReaderView({ node, startSeg }: { node: Node; startSeg?: string }) {
  const id = node.id;
  const version = useUserData();
  const s = useSettings(), c = useColors(), insets = useSafeAreaInsets();
  const { segs } = useMemo(() => getText(id)!, [id]);
  const { prev, next } = useMemo(() => neighbours(id), [id]);
  const trail = useMemo(() => chain(id).slice(1, -1).map(romanTitle).join(' · '), [id]);
  // paragraph numbers count content only, not headings
  const nums = useMemo(() => { let n = 0; return segs.map(x => (isHeading(x) ? 0 : ++n)); }, [segs]);
  const total = nums.reduce((a, b) => Math.max(a, b), 0);
  const noSinhala = segs.every(x => !x.sinh);

  const [sheet, setSheet] = useState<SheetKind>(null);
  const [sel, setSel] = useState(0);
  const [word, setWord] = useState({ seg: -1, w: -1, text: '' });
  const [note, setNote] = useState({ lang: 'pali' as 'pali' | 'sinh', marker: '', texts: [] as string[] });
  const [cur, setCur] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const list = useRef<FlatList<Seg>>(null);
  const prog = useRef(new Animated.Value(0)).current, progN = useRef(0);

  const bms = new Set(listBookmarks().filter(b => b.sutta_id === id).map(b => b.seg_id));
  const hls = new Set(listHighlights().filter(h => h.sutta_id === id).map(h => h.seg_id));
  const notes = new Map(listNotes().filter(n => n.sutta_id === id).map(n => [n.seg_id, n.body]));

  useEffect(() => {
    const i = segs.findIndex(x => x.id === startSeg);
    if (i < 0) return;
    const t = setTimeout(() => { list.current?.scrollToIndex({ index: i, viewOffset: 12 }); setFocus(i); }, 250);
    const u = setTimeout(() => setFocus(null), 2100);
    return () => { clearTimeout(t); clearTimeout(u); };
  }, []);

  const onViewable = useRef(({ viewableItems }: { viewableItems: ViewToken<Seg>[] }) => {
    const first = viewableItems.find(v => v.index != null && !isHeading(v.item));
    if (first?.index == null) return;
    setCur(first.index);
    recordHistory(id, first.item.id, progN.current);
  }).current;

  // sizes
  const side = s.mode === 'side', k = side ? 0.84 : 1, ab = s.siFont === 'abhaya' ? 1.14 : 1;
  const [pf, sf] = FONT_STEPS[s.fontStep], LH = LINE_STEPS[s.lhStep], SLH = SI_LINE_STEPS[s.lhStep];
  const siFam = s.siFont === 'abhaya' ? F.abhaya : F.si;
  const roman = s.script === 'roman';
  const paliFam = roman ? (s.paFont === 'noto' ? F.noto : F.pali) : siFam;
  const showSi = s.lang !== 'en', showEn = s.lang !== 'si';
  const paliSize = pf * k, siSize = (s.mode === 'trans' ? sf * 1.08 : sf) * k * ab;
  const show = (x: string) => (roman ? toRoman(x) : withZwj(x));
  const lines = (x: Seg) => show(plain(x.pali)).split('\n');
  const snippet = (x: Seg) => toRoman(plain(x.pali)).split('\n')[0].slice(0, 140);

  // keep the last sheet's content while the sheet animates closed
  const lastSheet = useRef<SheetKind>(null);
  if (sheet) lastSheet.current = sheet;
  const kind = sheet ?? lastSheet.current;
  const selV = segs[sel];
  const openSheet = (k: SheetKind, i: number) => { setSel(i); setSheet(k); };
  const openFootnote = (i: number, lang: 'pali' | 'sinh', marker: string) => {
    setNote({ lang, marker, texts: footnotes(node, segs[i].id, lang, marker) });
    openSheet('footnote', i);
  };
  const goSutta = (n?: Node) => n && router.replace({ pathname: '/reader/[id]', params: { id: n.id } });

  const renderSeg = ({ item: x, index: i }: { item: Seg; index: number }) => {
    const head = isHeading(x);
    const trOnly = s.mode === 'trans' && !!x.sinh;
    const paliBlock = !trOnly && (
      <View style={{ flex: side ? 1 : undefined, paddingLeft: x.kind === 'gatha' ? 12 : 0 }}>
        <Marked text={x.pali} script={s.script} noteColor={c.acct} onNote={m => openFootnote(i, 'pali', m)}
          onWord={head ? undefined : (w, wi) => { setWord({ seg: i, w: wi, text: w }); openSheet('word', i); if (s.tip) setSettings({ tip: false }); }}
          activeWord={sheet === 'word' && word.seg === i ? word.w : undefined} activeStyle={{ backgroundColor: c.acc, color: c.onacc }}
          style={{ fontFamily: head ? (roman ? F.paliB : F.si7) : paliFam, fontSize: head ? paliSize * 1.08 : paliSize,
            lineHeight: Math.round(paliSize * LH), color: c.ink, textAlign: head ? 'center' : 'left' }} />
      </View>
    );
    const transBlock = s.mode !== 'pali' && showSi && x.sinh && (
      <View style={{ flex: side ? 1 : undefined, paddingLeft: x.kind === 'gatha' && !side ? 12 : 0 }}>
        <Marked text={x.sinh} noteColor={c.acct} onNote={m => openFootnote(i, 'sinh', m)}
          style={{ fontFamily: head ? F.si6 : siFam, fontSize: siSize, lineHeight: Math.round(siSize * SLH),
            color: s.mode === 'trans' || head ? c.ink : c.ink + 'D1', textAlign: head ? 'center' : 'left' }} />
      </View>
    );
    if (head) return <View style={{ paddingHorizontal: 24, paddingVertical: 10, gap: 4 }}>{paliBlock}{transBlock}</View>;
    const bg = focus === i ? c.hl : hls.has(x.id) ? c.hlSoft : 'transparent';
    return (
      <View style={{ paddingTop: 14, paddingBottom: 16, paddingLeft: 50, paddingRight: 12, marginHorizontal: 12, borderRadius: 16, backgroundColor: bg }}>
        <Pressable onPress={() => openSheet('verse', i)} accessibilityRole="button" accessibilityLabel={`Paragraph ${nums[i]}, actions`}
          style={{ position: 'absolute', left: 6, top: 12, width: 36, height: 36, borderRadius: 18, borderWidth: 1,
            borderColor: sheet && sheet !== 'word' && sel === i ? c.acc : c.line, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
          <T f={F.pali} size={nums[i] > 99 ? 11.5 : 14} lh={1.1} color={c.mut}>{nums[i]}</T>
        </Pressable>
        {bms.has(x.id) ? <View style={{ position: 'absolute', right: 8, top: -3 }}><Icon name="bookmark" color={c.acct} fill /></View> : null}
        <View style={{ flexDirection: side ? 'row' : 'column', gap: side ? 14 : 10 }}>{paliBlock}{transBlock}</View>
        {notes.has(x.id) ? (
          <Pressable onPress={() => { setNoteDraft(notes.get(x.id)!); openSheet('note', i); }} accessibilityRole="button"
            style={{ marginTop: 12, flexDirection: 'row', gap: 10, padding: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.card, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line }}>
            <Icon name="edit_note" size={19} color={c.acct} />
            <T size={14.5} lh={1.65} style={{ flex: 1 }}>{notes.get(x.id)}</T>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const header = (
    <View style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 6, gap: 6 }}>
      <T f={F.pali} size={13} lh={1.5} color={c.mut}>{trail}</T>
      <T f={roman ? F.pali : F.si6} size={28} lh={1.3}>{roman ? romanTitle(node) : withZwj(node.title_pali)}</T>
      <T f={F.si5} size={17} lh={1.6} color={c.mut}>{node.title_si}</T>
      {showSi && noSinhala && s.mode !== 'pali'
        ? <T f={F.pali} size={13} lh={1.4} color={c.acct}>No Sinhala translation for this text yet · සිංහල පරිවර්තනයක් නැත</T> : null}
      {showEn && s.mode !== 'pali'
        ? <T f={F.pali} size={13} lh={1.4} color={c.mut}>English translation arrives with the English pack.</T> : null}
      {s.tip ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingVertical: 4, paddingLeft: 14, paddingRight: 4, borderRadius: 14, backgroundColor: c.soft }}>
          <Icon name="touch_app" size={20} color={c.acct} />
          <T f={F.pali} size={14} lh={1.45} style={{ flex: 1 }}>Tap a Pāḷi word to look it up. Tap a paragraph number to bookmark, highlight, note or share.</T>
          <IconBtn name="close" label="Dismiss tip" size={20} color={c.mut} onPress={() => setSettings({ tip: false })} />
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
      <View style={{ alignItems: 'center', paddingTop: 26, paddingBottom: 8 }}><Wheel size={22} /></View>
      {next ? (
        <Pressable onPress={() => goSutta(next)} accessibilityRole="button"
          style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <View style={{ flex: 1 }}>
            <Eyebrow en="Next" si={`ඊළඟ · ${cite(next.id)}`} />
            <T f={F.si6} size={18} lh={1.55}>{next.title_si}</T>
            <T f={F.paliI} size={15} lh={1.3} color={c.mut}>{romanTitle(next)}</T>
          </View>
          <Icon name="arrow_forward" size={26} color={c.acct} />
        </Pressable>
      ) : null}
    </View>
  );

  const suttaBm = bms.has(null);
  const w = plain(word.text).replace(PUNCT, '');

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8 }}>
        <IconBtn name="arrow_back" label="Back" onPress={() => router.back()} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <T f={F.si6} size={15} lh={1.3} numberOfLines={1}>{node.title_si}</T>
          <T f={F.pali} size={12.5} lh={1.1} color={c.mut}>{cite(id)}</T>
        </View>
        <Pressable onPress={() => setSheet('display')} accessibilityRole="button" accessibilityLabel="Display settings"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <T f={F.pali} size={19} lh={1.1} allowFontScaling={false}>Aa</T>
        </Pressable>
        <IconBtn name="bookmark" label={suttaBm ? 'Remove bookmark' : 'Bookmark this text'} size={23} fill={suttaBm} color={suttaBm ? c.acct : c.ink}
          onPress={() => toast(toggleBookmark(id, null, romanTitle(node)) ? 'Bookmarked · සලකුණු කළා' : 'Bookmark removed')} />
      </View>
      <View style={{ height: 3, backgroundColor: c.line }}>
        <Animated.View style={{ height: 3, backgroundColor: c.acc, width: prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'], extrapolate: 'clamp' }) }} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line }}>
        <Segmented value={s.mode} onChange={mode => setSettings({ mode })} height={40} options={[
          { value: 'pali', label: 'Pāḷi' }, { value: 'trans', label: 'සිංහල' },
          { value: 'line', label: 'Parallel' }, { value: 'side', label: 'Side by side' }]} />
      </View>

      <FlatList
        ref={list} data={segs} keyExtractor={x => x.id} renderItem={renderSeg}
        extraData={[version, s, sheet, sel, word, focus]}
        ListHeaderComponent={header} ListFooterComponent={footer}
        initialNumToRender={12} windowSize={9}
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

      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 8 + insets.bottom, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line }}>
        <NavEnd n={prev} dir="prev" onPress={() => goSutta(prev)} />
        <T f={F.pali} size={14} lh={1.2} color={c.mut} style={{ paddingHorizontal: 8 }}>{nums[cur] || 1} / {total}</T>
        <NavEnd n={next} dir="next" onPress={() => goSutta(next)} />
      </View>

      <Sheet open={!!sheet} onClose={() => setSheet(null)}>
        {kind === 'word' && (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <T f={F.pali} size={31} lh={1.25}>{toRoman(w)}</T>
                <T size={18} lh={1.6} color={c.mut}>{withZwj(w)}</T>
              </View>
              <IconBtn name="bookmark_add" label="Save word" size={22} color={c.acct}
                onPress={() => { saveWord(toRoman(w).toLowerCase()); toast('Saved to word list · වචනය සුරැකිණි'); }}
                style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.soft }} />
            </View>
            <View style={{ gap: 6, padding: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line }}>
              <T f={F.si6} size={16} lh={1.6}>ශබ්දකෝෂය ළඟදීම</T>
              <T f={F.pali} size={14.5} lh={1.5} color={c.mut}>Meanings arrive with the dictionary pack (Buddhadatta, Sumaṅgala and the Digital Pāḷi Dictionary). Saved words will be ready for it.</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 4 }}>
              <T f={F.pali} size={13} lh={1.4} color={c.mut} style={{ flex: 1 }}>{cite(id)} · ¶{nums[word.seg] || '–'}</T>
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
              <Segmented value={s.lhStep} onChange={lhStep => setSettings({ lhStep })} height={54}
                options={[{ value: 0, label: 'ඝන', sub: 'Compact' }, { value: 1, label: 'සාමාන්‍ය', sub: 'Comfortable' }, { value: 2, label: 'ඉඩ සහිත', sub: 'Airy' }]} />
            </View>
            <View style={{ gap: 8 }}>
              <Eyebrow en="Theme" si="පසුබිම" />
              <Segmented value={s.theme} onChange={theme => setSettings({ theme })} height={48}
                options={[{ value: 'paper', label: 'කඩදාසි · Paper' }, { value: 'night', label: 'රාත්‍රී · Night' }]} />
            </View>
            <View style={{ gap: 8 }}>
              <Eyebrow en="Pāḷi script" si="පාළි අක්ෂර" />
              <Segmented value={s.script} onChange={script => setSettings({ script })} height={46}
                options={[{ value: 'roman', label: 'Roman · ā ṃ ñ' }, { value: 'sinhala', label: 'සිංහල අකුරු' }]} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <View><T f={F.si6} size={15.5} lh={1.65}>ඉංග්‍රීසි පරිවර්තනය</T><T f={F.pali} size={13.5} lh={1.3} color={c.mut}>Show English translation</T></View>
              <Toggle on={showEn} label="Show English translation" onPress={() => setSettings({ lang: showEn ? 'si' : 'both' })} />
            </View>
          </View>
        )}

        {kind === 'verse' && selV && (
          <View style={{ gap: 16 }}>
            <Eyebrow en={`Paragraph ${nums[sel]}`} si={`${cite(id)} · ¶${nums[sel]}`} />
            <View style={{ gap: 6 }}>
              <T f={roman ? F.paliI : F.si} size={18} lh={1.55} numberOfLines={3}>{lines(selV).join(' ')}</T>
              {selV.sinh ? <T size={15} lh={1.7} color={c.mut} numberOfLines={2}>{plain(selV.sinh)}</T> : null}
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
                await Clipboard.setStringAsync([lines(selV).join('\n'), plain(selV.sinh ?? ''), `— ${romanTitle(node)} · ${cite(id)} · ¶${nums[sel]}`].filter(Boolean).join('\n\n'));
                setSheet(null); toast('Copied · පිටපත් විය');
              }}>
              <Icon name="content_copy" size={20} color={c.mut} />
              <T f={F.si5} size={15} lh={1.65}>පිටපත් කරන්න · Copy text</T>
            </Pressable>
          </View>
        )}

        {kind === 'note' && selV && (
          <View style={{ gap: 14 }}>
            <View>
              <Eyebrow en={`Note · ¶${nums[sel]}`} />
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

        {kind === 'share' && selV && (
          <ShareBody item={{ ref: `${cite(id)} · ¶${nums[sel]}`, title: romanTitle(node), lines: lines(selV), si: plain(selV.sinh ?? '') }} onDone={() => setSheet(null)} />
        )}

        {kind === 'footnote' && (
          <View style={{ gap: 12 }}>
            <Eyebrow en={`Footnote ${note.marker}`} si={note.lang === 'pali' ? 'පාළි පාද සටහන' : 'පරිවර්තන සටහන'} />
            {note.texts.length ? note.texts.map((t, i) => (
              <Marked key={i} text={t} script={note.lang === 'pali' ? s.script : undefined} noteColor={c.acct}
                style={{ fontFamily: note.lang === 'pali' && roman ? F.pali : F.si, fontSize: 16, lineHeight: 27, color: c.ink }} />
            )) : <T f={F.pali} size={15} color={c.mut}>No footnote text on this page.</T>}
            <T f={F.pali} size={12.5} lh={1.4} color={c.mut}>As printed in the Buddha Jayanti edition.</T>
          </View>
        )}
      </Sheet>
    </View>
  );
}

function NavEnd({ n, dir, onPress }: { n?: Node; dir: 'prev' | 'next'; onPress: () => void }) {
  const c = useColors(), end = dir === 'next';
  if (!n) return <View style={{ flex: 1 }} />;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${end ? 'Next' : 'Previous'}: ${romanTitle(n)}`}
      style={{ flex: 1, minWidth: 0, height: 52, flexDirection: end ? 'row-reverse' : 'row', alignItems: 'center', gap: 4 }}>
      <Icon name={end ? 'chevron_right' : 'chevron_left'} size={24} color={c.mut} />
      <View style={{ flexShrink: 1, alignItems: end ? 'flex-end' : 'flex-start' }}>
        <T f={F.pali} size={12} lh={1.2} color={c.mut}>{cite(n.id)}</T>
        <T f={F.si6} size={14.5} lh={1.65} numberOfLines={1}>{n.title_si}</T>
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
