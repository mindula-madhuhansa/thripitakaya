import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { toRoman, withZwj } from '@thripitakaya/shared';
import { available, cite, describe, getNode, plain, romanTitle, todayVerse } from '../../data/content';
import { listBookmarks, listHistory, useSettings, useUserData } from '../../db/user';
import { ShareBody } from '../../share';
import { F } from '../../theme';
import { Card, Eyebrow, Icon, IconBtn, openReader, Page, Sheet, T, useColors, Wheel } from '../../ui';

const DAYS = ['ඉරිදා', 'සඳුදා', 'අඟහරුවාදා', 'බදාදා', 'බ්‍රහස්පතින්දා', 'සිකුරාදා', 'සෙනසුරාදා'];
const MONTHS = ['ජනවාරි', 'පෙබරවාරි', 'මාර්තු', 'අප්‍රේල්', 'මැයි', 'ජූනි', 'ජූලි', 'අගෝස්තු', 'සැප්තැම්බර්', 'ඔක්තෝබර්', 'නොවැම්බර්', 'දෙසැම්බර්'];
const FIRST_READ = 'kn-snp-1-8'; // Metta Sutta, shown before anything has been read (ships in core.db)

export default function Home() {
  useUserData();
  const c = useColors(), s = useSettings(), now = new Date(), verse = todayVerse(now);
  const [sharing, setSharing] = useState(false);
  const roman = s.script === 'roman';
  const verseLines = (roman ? toRoman(plain(verse.seg.pali)) : withZwj(plain(verse.seg.pali))).split('\n');

  // ponytail: Poya chip skipped until an official Poya calendar is bundled.
  const last = listHistory().find(h => { const n = getNode(h.sutta_id); return n && available(n); });
  const node = getNode(last?.sutta_id ?? FIRST_READ)!;
  const bookmarks = listBookmarks().slice(0, 3);

  return (
    <Page gap={26}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ gap: 6 }}>
          <T f={F.si5} size={14} lh={1.65} color={c.mut}>{`${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Wheel size={26} />
            <T f={F.si7} size={28} lh={1.35} accessibilityRole="header">ත්‍රිපිටකය</T>
          </View>
        </View>
        <IconBtn name="settings" label="Settings" onPress={() => router.push('/settings')}
          style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: c.line }} />
      </View>

      <Card onPress={() => openReader(node.id, last?.last_seg_id)} style={{ padding: 20, gap: 14, borderRadius: 22 }}>
        <Eyebrow en={last ? 'Continue' : 'Begin reading'} si={last ? 'නැවත කියවන්න' : 'කියවීම අරඹන්න'} />
        <View style={{ gap: 2 }}>
          <T f={F.pali} size={23} lh={1.3}>{romanTitle(node)}</T>
          <T f={F.si5} size={17} lh={1.6}>{node.title_si}</T>
          <T f={F.pali} size={14} lh={1.4} color={c.mut}>{cite(node.id)}</T>
        </View>
        <View style={{ gap: 9 }}>
          <View style={{ height: 5, borderRadius: 3, backgroundColor: c.soft, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.round((last?.progress ?? 0) * 100)}%`, backgroundColor: c.acc, borderRadius: 3 }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T f={F.pali} size={14} lh={1.2} color={c.mut}>{Math.round((last?.progress ?? 0) * 100)}% read</T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T f={F.paliB} size={15} lh={1.2} color={c.acct}>{last ? 'Resume' : 'Open'}</T>
              <Icon name="arrow_forward" size={20} color={c.acct} />
            </View>
          </View>
        </View>
      </Card>

      <Card soft onPress={() => openReader(verse.node.id, verse.seg.id)} style={{ padding: 22, gap: 14, borderRadius: 22 }}>
        <Eyebrow en="Today’s verse" si="අද දින ගාථාව" />
        <T f={roman ? F.paliI : F.si} size={roman ? 20 : 18} lh={1.6}>{verseLines.join('\n')}</T>
        {verse.seg.sinh ? <T size={16} lh={1.8}>{plain(verse.seg.sinh)}</T> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <T f={F.pali} size={14} lh={1.4} color={c.mut} style={{ flex: 1 }}>{verse.ref}</T>
          <IconBtn name="ios_share" label="Share today’s verse" size={22} onPress={() => setSharing(true)}
            style={{ borderRadius: 22, backgroundColor: c.card }} />
        </View>
      </Card>

      <View style={{ gap: 12 }}>
        <Eyebrow en="The three baskets" si="තුන් පිටකය" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[['vp', 'විනය\nපිටකය', 'Vinaya', '5 books'], ['sp', 'සූත්‍ර\nපිටකය', 'Sutta', '5 nikāyas'], ['ap', 'අභිධර්ම\nපිටකය', 'Abhidhamma', '7 books']].map(([id, si, en, meta]) => (
            <Card key={id} onPress={() => router.navigate({ pathname: '/browse', params: { path: id } })}
              style={{ flex: 1, minHeight: 124, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 14, gap: 6 }}>
              <T f={F.si6} size={17} lh={1.6}>{si}</T>
              <T f={F.paliI} size={14} lh={1.2} color={c.mut} style={{ marginTop: 'auto' }}>{en}</T>
              <T f={F.pali} size={12.5} lh={1.2} color={c.mut}>{meta}</T>
            </Card>
          ))}
        </View>
      </View>

      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Eyebrow en="Bookmarks" si="සලකුණු" />
          <Pressable onPress={() => router.navigate('/library')} accessibilityRole="link" hitSlop={12}>
            <T f={F.paliB} size={14.5} color={c.acct}>See all</T>
          </Pressable>
        </View>
        {bookmarks.length ? (
          <Card style={{ overflow: 'hidden' }}>
            {bookmarks.map((b, i) => {
              const d = describe(b.sutta_id, b.seg_id);
              return (
                <Pressable key={b.id} onPress={() => openReader(b.sutta_id, b.seg_id)} accessibilityRole="button"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 13, paddingHorizontal: 16, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                  <Icon name="bookmark" size={21} color={c.acct} fill />
                  <View style={{ flex: 1 }}>
                    <T f={F.si5} size={16} lh={1.65}>{d.si}</T>
                    <T f={F.paliI} size={14} lh={1.3} color={c.mut}>{d.pali}</T>
                  </View>
                  <T f={F.pali} size={13.5} lh={1.2} color={c.mut}>{d.ref}</T>
                </Pressable>
              );
            })}
          </Card>
        ) : (
          <View style={{ padding: 18, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line, gap: 4 }}>
            <T f={F.si5} size={15} lh={1.6}>තවම සලකුණු නැත</T>
            <T f={F.pali} size={14} lh={1.45} color={c.mut}>While reading, tap a paragraph number and choose Bookmark.</T>
          </View>
        )}
      </View>

      <Pressable onPress={() => router.push('/about')} accessibilityRole="link" style={{ alignItems: 'center', gap: 6, paddingTop: 14 }}>
        <Wheel size={20} color={c.mut} />
        <T f={F.si5} size={14.5} lh={1.65} color={c.mut}>ධර්ම දානයකි · සැමට නොමිලේ</T>
        <T f={F.paliB} size={14} lh={1.4} color={c.acct}>About this gift</T>
      </Pressable>

      <Sheet open={sharing} onClose={() => setSharing(false)}>
        <ShareBody item={{ ref: verse.ref, title: 'Dhammapada', lines: verseLines, si: plain(verse.seg.sinh ?? '') }} onDone={() => setSharing(false)} />
      </Sheet>
    </Page>
  );
}
