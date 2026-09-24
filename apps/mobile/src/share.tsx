import { useState } from 'react';
import { Share, View } from 'react-native';
import { F } from './theme';
import { Btn, Ring, Seg, T, useColors, Wheel } from './ui';

export type ShareItem = { ref: string; title: string; lines: string[]; si: string };

const STYLES = {
  paper: { bg: '#F3EADB', ink: '#33251A', mut: '#7A6450', acc: '#C27A36' },
  night: { bg: '#1B140F', ink: '#EFE3D0', mut: '#A89580', acc: '#D9954E' },
  saffron: { bg: '#E9B97F', ink: '#2E1D0F', mut: '#5E3F22', acc: '#7A4A1C' },
};

// ponytail: shares text via the OS share sheet. Image export needs react-native-view-shot (dev build).
export function ShareBody({ item, onDone }: { item: ShareItem; onDone: () => void }) {
  const c = useColors();
  const [style, setStyle] = useState<keyof typeof STYLES>('paper');
  const [content, setContent] = useState<'both' | 'pali' | 'si'>('both');
  const k = STYLES[style], showP = content !== 'si', showS = content !== 'pali';

  const share = async () => {
    const parts = [showP ? item.lines.join('\n') : '', showS ? item.si : '', `— ${item.title} · ${item.ref}`, 'ත්‍රිපිටකය · ධර්ම දානයකි'];
    await Share.share({ message: parts.filter(Boolean).join('\n\n') });
    onDone();
  };

  return (
    <View style={{ gap: 14 }}>
      <T f={F.si7} size={20} lh={1.65}>රූපයක් ලෙස <T f={F.pali} size={15} color={c.mut}>· Share</T></T>
      <View style={{ aspectRatio: 4 / 5, borderRadius: 18, backgroundColor: k.bg, paddingHorizontal: 24, paddingTop: 26, paddingBottom: 22, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Wheel size={22} color={k.acc} />
          <T f={F.pali} size={12.5} color={k.mut} style={{ letterSpacing: 1 }}>{item.ref.toUpperCase()}</T>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
          {showP ? <T f={F.paliI} size={18.5} lh={1.6} color={k.ink}>{item.lines.join('\n')}</T> : null}
          {showS ? <T size={15} lh={1.8} color={k.ink}>{item.si}</T> : null}
        </View>
        <View style={{ height: 1, backgroundColor: k.mut, opacity: 0.35 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T f={F.pali} size={14} lh={1.3} color={k.ink}>{item.title}</T>
          <T size={12} lh={1.3} color={k.mut}>ධර්ම දානයකි</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(Object.keys(STYLES) as (keyof typeof STYLES)[]).map(s => (
          <Ring key={s} on={style === s} onPress={() => setStyle(s)}
            style={{ flex: 1, height: 44, borderRadius: 22, padding: 0, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: STYLES[s].bg, borderWidth: 1, borderColor: c.line }} />
            <T f={F.paliB} size={14} lh={1.2}>{s[0].toUpperCase() + s.slice(1)}</T>
          </Ring>
        ))}
      </View>
      <Seg value={content} onChange={setContent} height={42}
        options={[{ value: 'both', label: 'Pāḷi + සිංහල' }, { value: 'pali', label: 'Pāḷi' }, { value: 'si', label: 'සිංහල' }]} />
      <Btn label="Share…" icon="ios_share" onPress={share} />
    </View>
  );
}
