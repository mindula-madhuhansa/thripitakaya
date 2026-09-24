import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { describe } from '../../data/content';

const FIRST_READ = 'kn-snp-1-8';
import { History, listBookmarks, listHighlights, listHistory, listNotes, useUserData } from '../../db/user';
import { F } from '../../theme';
import { ago, Btn, Card, Icon, IconName, openReader, Page, Seg, T, useColors } from '../../ui';

type Tab = 'bm' | 'hl' | 'notes' | 'hist';
const EMPTY: Record<Tab, [IconName, string, string]> = {
  bm: ['bookmark', 'තවම සලකුණු නැත', 'No bookmarks yet. While reading, tap a verse number and choose Bookmark.'],
  hl: ['ink_highlighter', 'ඉස්මතු කළ ගාථා නැත', 'Highlight verses you want to return to. They gather here.'],
  notes: ['edit_note', 'සටහන් නැත', 'Write a personal note on any verse. Notes stay on your phone.'],
  hist: ['history', 'කියවීමේ ඉතිහාසය හිස්ය', 'Suttas you open will appear here, newest first.'],
};

export default function Library() {
  useUserData();
  const c = useColors();
  const [tab, setTab] = useState<Tab>('bm');
  const rows = { bm: listBookmarks(), hl: listHighlights(), notes: listNotes(), hist: listHistory() }[tab];

  const body = () => {
    if (!rows.length) {
      const [icon, si, en] = EMPTY[tab];
      return (
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 44, paddingHorizontal: 18 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: c.soft, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={36} color={c.mut} />
          </View>
          <T f={F.si6} size={19} lh={1.6} style={{ marginTop: 6 }}>{si}</T>
          <T f={F.pali} size={15} lh={1.55} color={c.mut} style={{ textAlign: 'center' }}>{en}</T>
          <Btn outline label="Open today’s reading" style={{ marginTop: 10, height: 50 }} onPress={() => openReader(FIRST_READ)} />
        </View>
      );
    }
    if (tab === 'bm') return (
      <Card style={{ overflow: 'hidden' }}>
        {listBookmarks().map((b, i) => {
          const d = describe(b.sutta_id, b.seg_id);
          return (
            <Pressable key={b.id} onPress={() => openReader(b.sutta_id, b.seg_id)} accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16, minHeight: 60, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Icon name="bookmark" size={21} color={c.acct} fill />
              <View style={{ flex: 1 }}>
                <T f={F.si5} size={16} lh={1.65}>{d.si}</T>
                <T f={F.paliI} size={14} lh={1.3} color={c.mut}>{d.pali} · {d.ref}</T>
              </View>
              <T f={F.pali} size={12.5} lh={1.2} color={c.mut}>{ago(b.created_at)}</T>
            </Pressable>
          );
        })}
      </Card>
    );
    if (tab === 'hl') return listHighlights().map(h => {
      const d = describe(h.sutta_id, h.seg_id);
      return (
        <Card key={h.id} onPress={() => openReader(h.sutta_id, h.seg_id)} style={{ padding: 18, gap: 10 }}>
          <T f={F.paliI} size={18} lh={1.7}><T f={F.paliI} size={18} lh={1.7} style={{ backgroundColor: c.hl }}>{h.snippet}</T></T>
          <T size={15} lh={1.6}>{d.si}</T>
          <T f={F.pali} size={13} lh={1.2} color={c.mut}>{d.pali} · {d.ref}</T>
        </Card>
      );
    });
    if (tab === 'notes') return listNotes().map(n => {
      const d = describe(n.sutta_id, n.seg_id);
      return (
        <Card key={n.id} onPress={() => openReader(n.sutta_id, n.seg_id)} style={{ padding: 18, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
            <T f={F.paliB} size={12} lh={1.4} color={c.mut} style={{ letterSpacing: 1.2 }}>{d.ref.toUpperCase()}</T>
            <T f={F.pali} size={12.5} lh={1.4} color={c.mut}>{ago(n.updated_at)}</T>
          </View>
          <T size={16} lh={1.75}>{n.body}</T>
          <T f={F.paliI} size={14} lh={1.5} color={c.mut}>“{n.snippet}”</T>
        </Card>
      );
    });
    // history, grouped by day
    const groups = new Map<string, History[]>();
    for (const h of listHistory()) {
      const k = ago(h.opened_at), label = k === 'Today' ? 'Today · අද' : k === 'Yesterday' ? 'Yesterday · ඊයේ' : 'Earlier';
      groups.set(label, [...(groups.get(label) ?? []), h]);
    }
    return [...groups].map(([label, items]) => (
      <View key={label} style={{ gap: 6 }}>
        <T f={F.paliB} size={12} lh={1.4} color={c.mut} style={{ letterSpacing: 1.7, paddingTop: 6 }}>{label.toUpperCase()}</T>
        {items.map(h => {
          const d = describe(h.sutta_id);
          return (
            <Pressable key={h.sutta_id} onPress={() => openReader(h.sutta_id, h.last_seg_id)} accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 58, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <Icon name="history" size={20} color={c.mut} />
              <View style={{ flex: 1 }}>
                <T f={F.si5} size={16} lh={1.65}>{d.si}</T>
                <T f={F.paliI} size={14} lh={1.3} color={c.mut}>{d.pali}</T>
              </View>
              <T f={F.pali} size={13} lh={1.2} color={c.mut}>{Math.round(h.progress * 100)}%</T>
            </Pressable>
          );
        })}
      </View>
    ));
  };

  return (
    <Page eyebrow="Library" title="මගේ පුස්තකාලය" gap={16}>
      <Seg value={tab} onChange={setTab} height={48} options={[
        { value: 'bm', label: 'සලකුණු', sub: 'Bookmarks' }, { value: 'hl', label: 'ඉස්මතු', sub: 'Highlights' },
        { value: 'notes', label: 'සටහන්', sub: 'Notes' }, { value: 'hist', label: 'ඉතිහාසය', sub: 'History' }]} />
      {body()}
    </Page>
  );
}
