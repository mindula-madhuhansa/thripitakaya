// Renders upstream text markup: **bold**, __underline__, $$heading$$, {n} footnote markers, \n line breaks (verses).
// Pāḷi is stored in Sinhala script; `roman` converts per run at display time. Words are nested <Text> spans
// (cheap, not views) so each can be tapped.
import { Text, TextStyle } from 'react-native';
import { toRoman, withZwj } from '@thripitakaya/shared';
import { F } from './theme';

type Run = { t: string; b: boolean; u: boolean; h: boolean } | { note: string };
export function parse(text: string): Run[] {
  const out: Run[] = [];
  let b = false, u = false, h = false;
  for (const part of text.split(/(\*\*|__|\$\$|\{[^}]*\})/)) {
    if (part === '**') b = !b;
    else if (part === '__') u = !u;
    else if (part === '$$') h = !h;
    else if (/^\{[^}]*\}$/.test(part)) out.push({ note: part.slice(1, -1) });
    else if (part) out.push({ t: part, b, u, h });
  }
  return out;
}

type Props = {
  text: string; style: TextStyle; noteColor: string;
  /** Pāḷi only: display script. Omit for the Sinhala translation. */
  script?: 'roman' | 'sinhala';
  onWord?: (word: string, index: number) => void; activeWord?: number; activeStyle?: TextStyle;
  onNote?: (marker: string) => void;
};

export function Marked({ text, style, noteColor, script, onWord, activeWord, activeStyle, onNote }: Props) {
  const show = (s: string) => (script === 'roman' ? toRoman(s) : script === 'sinhala' ? withZwj(s) : s);
  const bold = style.fontFamily?.startsWith('Noto') || style.fontFamily?.startsWith('Abhaya') ? F.si7 : F.paliB;
  let w = 0;
  return (
    <Text maxFontSizeMultiplier={1.6} style={style}>
      {parse(text).map((r, i) => {
        if ('note' in r) return (
          <Text key={i} onPress={onNote && (() => onNote(r.note))} accessibilityRole="button" accessibilityLabel={`Footnote ${r.note}`}
            style={{ fontSize: (style.fontSize ?? 16) * 0.62, color: noteColor, fontFamily: F.paliB }}>{` ${r.note} `}</Text>
        );
        const runStyle: TextStyle | null = r.b || r.h ? { fontFamily: bold } : r.u ? { textDecorationLine: 'underline' } : null;
        if (!onWord) return <Text key={i} style={runStyle}>{show(r.t)}</Text>;
        return (
          <Text key={i} style={runStyle}>
            {r.t.split(/(\s+)/).map((tok, j) => {
              if (!tok || /^\s+$/.test(tok)) return tok;
              const n = w++;
              return <Text key={j} onPress={() => onWord(tok, n)} style={n === activeWord ? activeStyle : null}>{show(tok)}</Text>;
            })}
          </Text>
        );
      })}
    </Text>
  );
}
