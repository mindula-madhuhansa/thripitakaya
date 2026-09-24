import { Linking, Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import { IS_SAMPLE } from '../data/content';
import { F } from '../theme';
import { Card, Eyebrow, Icon, Page, T, useColors, Wheel } from '../ui';

// Source credits. tipitaka.lk granted use of the Sinhala translation, Roman script, dictionaries and AI (2026-09-24).
const CREDITS: [string, string][] = [
  ['Pāḷi text', 'Buddha Jayanti Tripiṭaka, from tipitaka.lk (CC BY-ND 4.0)'],
  ['Sinhala translation', 'Buddha Jayanti Tripiṭaka, from tipitaka.lk (CC BY-ND 4.0)'],
  ['Roman-script Pāḷi', 'Transliterated from the Sinhala-script edition, with permission'],
  ['English', 'Bhikkhu Sujato / Bhikkhu Brahmali, SuttaCentral (CC0)'],
  ['Pāḷi–Sinhala dictionaries', 'Buddhadatta and Sumaṅgala, via tipitaka.lk, with permission'],
  ['Pāḷi–English dictionary', 'Digital Pāḷi Dictionary, Bodhirasa Bhikkhu (CC BY-NC-SA 4.0). Trimmed for this app'],
  ['Typefaces', 'Noto Serif Sinhala, Abhaya Libre, Gentium Book Plus, Noto Serif (SIL OFL 1.1) · Material Symbols (Apache 2.0)'],
];

export default function About() {
  const c = useColors();
  return (
    <Page back gap={24}>
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Wheel size={48} stroke={1.1} />
        <T f={F.si7} size={30} lh={1.6} style={{ marginTop: 6 }} accessibilityRole="header">ධර්ම දානයකි</T>
        <T f={F.paliI} size={18} lh={1.3} color={c.mut}>A gift of the Dhamma</T>
      </View>
      <View style={{ alignItems: 'center', gap: 6, paddingVertical: 20, paddingHorizontal: 16, borderRadius: 20, backgroundColor: c.soft }}>
        <T f={F.paliI} size={21} lh={1.4} style={{ textAlign: 'center' }}>Sabbadānaṃ dhammadānaṃ jināti</T>
        <T size={15.5} lh={1.7}>සියලු දානයන් ධර්ම දානය පරදවයි.</T>
        <T f={F.pali} size={13} lh={1.2} color={c.mut} style={{ marginTop: 4 }}>Dhammapada 354</T>
      </View>
      <View style={{ gap: 10 }}>
        <T size={16} lh={1.85}>මෙම යෙදුම ධර්ම දානයක් ලෙස පිරිනැමේ. දැන්වීම් නැත, ගිණුම් නැත, මිලදී ගැනීමට කිසිවක් නැත — දැනුත්, මතුවටත්.</T>
        <T f={F.pali} size={15.5} lh={1.6} color={c.mut}>This app is offered freely. There are no ads, no accounts and nothing to buy — now or later. Your bookmarks and notes never leave your phone.</T>
      </View>
      <View style={{ gap: 10 }}>
        <Eyebrow en="Texts & credits" si="මූලාශ්‍ර" />
        <Card style={{ paddingHorizontal: 16 }}>
          {IS_SAMPLE ? (
            <View style={{ paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <T f={F.pali} size={13} lh={1.4} color={c.acct}>This build</T>
              <T f={F.pali} size={15.5} lh={1.5}>Sample texts for development only. The sources below arrive with the first data release.</T>
            </View>
          ) : null}
          {CREDITS.map(([k, v], i) => (
            <View key={k} style={{ paddingVertical: 13, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <T f={F.pali} size={13} lh={1.4} color={c.mut}>{k}</T>
              <T f={F.pali} size={15.5} lh={1.5}>{v}</T>
            </View>
          ))}
        </Card>
      </View>
      {/* ponytail: no project address yet; mailto opens with an empty recipient */}
      <Pressable onPress={() => Linking.openURL('mailto:?subject=' + encodeURIComponent('Thripitakaya app: text error'))} accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: c.line }}>
        <Icon name="edit" size={21} color={c.acct} />
        <View style={{ flex: 1 }}>
          <T f={F.si5} size={15.5} lh={1.65}>පාඨ දෝෂයක් දැනුම් දෙන්න</T>
          <T f={F.pali} size={13} lh={1.3} color={c.mut}>Report an error in the text</T>
        </View>
      </Pressable>
      <View style={{ alignItems: 'center', gap: 6, paddingTop: 6 }}>
        <T f={F.si5} size={16} lh={1.7}>පින් අනුමෝදන් වේවා</T>
        <T f={F.paliI} size={14.5} lh={1.4} color={c.mut}>May the merit be shared with all beings.</T>
        <T f={F.pali} size={14} lh={1.2} color={c.acct} style={{ letterSpacing: 2.8, marginTop: 10 }}>SĀDHU · SĀDHU · SĀDHU</T>
        <T f={F.pali} size={12.5} lh={1.2} color={c.mut} style={{ marginTop: 14 }}>Version {Constants.expoConfig?.version}</T>
      </View>
    </Page>
  );
}
