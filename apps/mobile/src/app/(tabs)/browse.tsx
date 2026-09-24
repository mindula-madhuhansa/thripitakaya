import { useCallback } from 'react';
import { BackHandler, Pressable, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { available, chain, children, cite, getNode, romanTitle, type Node } from '../../data/content';
import { install, isInstalled, PACKS, usePacks } from '../../data/packs';
import { F } from '../../theme';
import { Btn, Card, Icon, openReader, Page, T, useColors } from '../../ui';

const DESC: Record<string, string> = {
  vp: 'භික්ෂු, භික්ෂුණී විනය හා සංඝ පාලනය',
  sp: 'බුදුරජාණන් වහන්සේගේ හා ශ්‍රාවකයන්ගේ දේශනා',
  ap: 'චිත්ත, චෛතසික, රූප හා නිර්වාණ විග්‍රහය',
};

export default function Browse() {
  const c = useColors(), { progress, manifest } = usePacks();
  const { path = '' } = useLocalSearchParams<{ path?: string }>();   // path = current node id ('' = the three piṭakas)
  const here = path ? getNode(path) : undefined;
  const trail: (Node | undefined)[] = [undefined, ...(here ? chain(here.id) : [])];
  const go = (n?: Node) => router.setParams({ path: n?.id ?? '' });

  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!here) return false;
      go(here.parent_id ? getNode(here.parent_id) : undefined); return true;
    });
    return () => sub.remove();
  }, [path]));

  const rows = children(here?.id ?? null);
  const pack = here && here.pack !== 'core' ? PACKS.find(p => p.id === here.pack) : undefined;
  const mb = pack && manifest?.packs.find(p => p.id === pack.id)?.bytes;

  return (
    <Page eyebrow="Browse" title="පිටක">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 4 }}>
        {trail.map((n, i) => {
          const last = i === trail.length - 1;
          return (
            <View key={n?.id ?? 'root'} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable onPress={() => go(n)} disabled={last} accessibilityRole="link" style={{ paddingVertical: 10, paddingHorizontal: 2 }}>
                <T f={last ? F.paliB : F.pali} size={15} lh={1.2} color={last ? c.ink : c.acct} style={last ? null : { textDecorationLine: 'underline', textDecorationColor: c.line }}>
                  {n ? romanTitle(n) : 'Tipiṭaka'}
                </T>
              </Pressable>
              {!last ? <Icon name="chevron_right" size={18} color={c.mut} /> : null}
            </View>
          );
        })}
      </View>

      {here ? (
        <Card soft style={{ paddingHorizontal: 20, paddingVertical: 18, gap: 10, borderRadius: 20 }}>
          <View>
            <T f={F.si7} size={23} lh={1.65}>{here.title_si}</T>
            <T f={F.paliI} size={17} lh={1.3} color={c.mut}>{romanTitle(here)}{cite(here.id) ? ` · ${cite(here.id)}` : ''}</T>
          </View>
          {pack ? (isInstalled(pack.id)
            ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon name="download_done" size={18} color={c.acct} /><T f={F.pali} size={14} color={c.mut}>Available offline</T></View>
            : progress[pack.id] != null
              ? <T f={F.paliB} size={14.5} color={c.acct}>Downloading {pack.name}… {Math.round(progress[pack.id] * 100)}%</T>
              : <Btn outline icon="download" label={`Download ${pack.name}${mb ? ` · ${(mb / 1e6).toFixed(1)} MB` : ''}`}
                  style={{ alignSelf: 'flex-start', height: 44 }} onPress={() => install(pack.id).catch(() => {})} />
          ) : null}
        </Card>
      ) : null}

      <View>
        {rows.map((n, i) => {
          const ok = !n.leaf || available(n);
          return (
            <Pressable key={n.id} onPress={() => (n.leaf ? openReader(n.id) : go(n))} accessibilityRole="button"
              accessibilityHint={ok ? undefined : 'Not downloaded'}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, minHeight: 48, borderBottomWidth: 1, borderBottomColor: c.line, opacity: ok ? 1 : 0.55 }}>
              <T f={F.pali} size={15} lh={1.2} color={c.mut} style={{ width: 30 }}>{i + 1}</T>
              <View style={{ flex: 1, gap: 1 }}>
                <T f={F.si6} size={17} lh={1.65}>{n.title_si}</T>
                <T f={F.paliI} size={15} lh={1.3} color={c.mut}>{romanTitle(n)}</T>
                {!here && DESC[n.id] ? <T size={13.5} lh={1.6} color={c.mut} style={{ marginTop: 4 }}>{DESC[n.id]}</T> : null}
              </View>
              <T f={F.pali} size={13} lh={1.2} color={c.mut}>{n.leaf ? cite(n.id) : ''}</T>
              <Icon name={ok ? 'chevron_right' : 'download'} color={c.mut} />
            </Pressable>
          );
        })}
      </View>
    </Page>
  );
}
