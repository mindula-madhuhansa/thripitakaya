import { useCallback } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { hasText, Node, root } from '../../data/content';
import { F } from '../../theme';
import { Card, Icon, openReader, Page, T, toast, useColors } from '../../ui';

const readable = (n: Node): boolean => hasText(n.id) || !!n.children?.some(readable);

export default function Browse() {
  const c = useColors();
  const { path = '' } = useLocalSearchParams<{ path?: string }>();
  const ids = path.split('/').filter(Boolean);
  const chain = [root];
  for (const id of ids) { const n = chain[chain.length - 1].children?.find(x => x.id === id); if (!n) break; chain.push(n); }
  const node = chain[chain.length - 1];
  const goTo = (list: Node[]) => router.setParams({ path: list.slice(1).map(n => n.id).join('/') });

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (chain.length < 2) return false;
      goTo(chain.slice(0, -1)); return true;
    });
    return () => sub.remove();
  }, [path]));

  const open = (n: Node) => {
    if (n.children) goTo([...chain, n]);
    else if (hasText(n.id)) openReader(n.id);
    else toast('Not in this build yet · සාම්පල පාඨ Sn 1.8 පමණි');
  };

  return (
    <Page eyebrow="Browse" title="පිටක">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 4 }}>
        {chain.map((n, i) => {
          const last = i === chain.length - 1;
          return (
            <View key={n.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={() => goTo(chain.slice(0, i + 1))} disabled={last} accessibilityRole="link" style={{ paddingVertical: 10, paddingHorizontal: 2 }}>
                <T f={last ? F.paliB : F.pali} size={15} lh={1.2} color={last ? c.ink : c.acct} style={last ? null : { textDecorationLine: 'underline', textDecorationColor: c.line }}>
                  {n.short ?? n.pali}
                </T>
              </Pressable>
              {!last ? <Icon name="chevron_right" size={18} color={c.mut} /> : null}
            </View>
          );
        })}
      </View>

      {chain.length > 1 ? (
        <Card soft style={{ paddingHorizontal: 20, paddingVertical: 18, gap: 10, borderRadius: 20 }}>
          <View>
            <T f={F.si7} size={23} lh={1.65}>{node.si}</T>
            <T f={F.paliI} size={17} lh={1.3} color={c.mut}>{node.pali}</T>
          </View>
          {node.meta ? <T f={F.pali} size={14} lh={1.4}>{node.meta}</T> : null}
        </Card>
      ) : null}

      <View>
        {node.children?.map((n, i) => {
          const ok = readable(n);
          return (
            <Pressable key={n.id} onPress={() => open(n)} accessibilityRole="button" accessibilityHint={ok ? undefined : 'Not in this build yet'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, minHeight: 48, borderBottomWidth: 1, borderBottomColor: c.line, opacity: ok ? 1 : 0.5 }}>
              <T f={F.pali} size={15} lh={1.2} color={c.mut} style={{ width: 30 }}>{i + 1}</T>
              <View style={{ flex: 1, gap: 1 }}>
                <T f={F.si6} size={17} lh={1.65}>{n.si}</T>
                <T f={F.paliI} size={15} lh={1.3} color={c.mut}>{n.pali}</T>
                {chain.length === 1 && n.desc ? <T size={13.5} lh={1.6} color={c.mut} style={{ marginTop: 4 }}>{n.desc}</T> : null}
              </View>
              <T f={F.pali} size={13} lh={1.2} color={c.mut}>{ok ? n.meta : 'Not yet'}</T>
              <Icon name={ok ? 'chevron_right' : 'cloud_off'} color={c.mut} />
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}
