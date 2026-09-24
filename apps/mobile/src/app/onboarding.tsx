import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { setSettings, useSettings } from '../db/user';
import { F, FONT_STEPS, LANGS, SIZE_NAMES, night, paper } from '../theme';
import { Btn, Card, Eyebrow, Icon, IconBtn, IconName, Page, Ring, T, useColors, Wheel } from '../ui';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const s = useSettings(), c = useColors();

  const dots = (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[0, 1, 2].map(i => <View key={i} style={{ width: i === step ? 22 : 8, height: 4, borderRadius: 2, backgroundColor: i === step ? c.acc : c.line }} />)}
    </View>
  );
  const top = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
      {step ? <IconBtn name="arrow_back" label="Back" onPress={() => setStep(step - 1)} style={{ marginLeft: -12 }} />
        : <T f={F.paliB} size={12} color={c.mut} style={{ letterSpacing: 1.7 }}>1 / 3</T>}
      {dots}
    </View>
  );

  return (
    <Page gap={24}>
      {top}
      {step === 0 && <>
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 12 }}>
          <Wheel size={46} stroke={1.2} />
          <T f={F.si7} size={40} lh={1.4}>ත්‍රිපිටකය</T>
          <T f={F.paliI} size={20} lh={1.2} color={c.mut}>Tipiṭaka</T>
          <T size={16} lh={1.75} style={{ marginTop: 10, textAlign: 'center' }}>බුද්ධ වචනය — සැමට, සදහටම නොමිලේ.</T>
          <T f={F.pali} size={15.5} lh={1.55} color={c.mut} style={{ textAlign: 'center' }}>A gift of the Dhamma. No ads, no account, nothing to buy.</T>
        </View>
        <View style={{ gap: 10 }}>
          <Eyebrow en="Reading language" si="භාෂාව" />
          {LANGS.map(o => (
            <Ring key={o.value} on={s.lang === o.value} onPress={() => setSettings({ lang: o.value })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, borderRadius: 18, paddingHorizontal: 16, backgroundColor: s.lang === o.value ? c.card : 'transparent' }}>
              <View style={{ flex: 1 }}>
                <T f={F.si6} size={18} lh={1.65}>{o.label}</T>
                <T f={F.pali} size={14} lh={1.4} color={c.mut}>{o.sub}</T>
              </View>
              <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: s.lang === o.value ? c.acc : c.line, alignItems: 'center', justifyContent: 'center' }}>
                {s.lang === o.value ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.acct }} /> : null}
              </View>
            </Ring>
          ))}
        </View>
      </>}

      {step === 1 && <>
        <View style={{ gap: 4 }}>
          <Eyebrow en="2 / 3 · Text size" />
          <T f={F.si7} size={28} lh={1.6}>අකුරු ප්‍රමාණය</T>
          <T f={F.pali} size={15.5} lh={1.5} color={c.mut}>Choose what is comfortable. You can change it any time with the Aa button.</T>
        </View>
        <Card style={{ padding: 22, gap: 12, minHeight: 230, borderRadius: 22 }}>
          <T f={F.paliI} size={FONT_STEPS[s.fontStep][0]} lh={1.6}>{'Na hi verena verāni,\nsammantīdha kudācanaṃ;'}</T>
          <T size={FONT_STEPS[s.fontStep][1]} lh={1.8}>මේ ලෝකයෙහි වෛරයෙන් වෛරයෝ කිසි කලෙකත් නොසංසිඳෙති.</T>
          <T f={F.pali} size={13.5} color={c.mut}>Dhammapada 5</T>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
          {[16, 19, 22, 25, 28].map((fs, i) => (
            <Ring key={i} on={s.fontStep === i} onPress={() => setSettings({ fontStep: i })} label={SIZE_NAMES[i]}
              style={{ flex: 1, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 0, backgroundColor: s.fontStep === i ? c.card : 'transparent' }}>
              <T f={F.si6} size={fs} lh={1.3} allowFontScaling={false}>අ</T>
            </Ring>
          ))}
        </View>
        <T f={F.si6} size={16} lh={1.4} color={c.acct} style={{ textAlign: 'center' }}>{SIZE_NAMES[s.fontStep]}</T>
      </>}

      {step === 2 && <>
        <View style={{ gap: 4 }}>
          <Eyebrow en="3 / 3 · Reading light" />
          <T f={F.si7} size={28} lh={1.6}>කියවීමේ පසුබිම</T>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {([['paper', paper, 'කඩදාසි', 'Paper'], ['night', night, 'රාත්‍රී', 'Night']] as const).map(([k, pal, si, en]) => (
            <Pressable key={k} onPress={() => setSettings({ theme: k })} accessibilityRole="radio" accessibilityState={{ selected: s.theme === k }}
              accessibilityLabel={en} style={{ flex: 1, gap: 10 }}>
              <View style={{ height: 150, borderRadius: 18, backgroundColor: pal.bg, borderWidth: 2, borderColor: s.theme === k ? c.acc : c.line, padding: 16, gap: 8 }}>
                <T f={F.paliI} size={17} lh={1.3} color={pal.ink}>Sukhino va…</T>
                {[0.9, 0.75, 0.82].map((w, i) => <View key={i} style={{ height: 5, width: `${w * 100}%`, borderRadius: 3, backgroundColor: pal.line }} />)}
              </View>
              <T f={F.si6} size={16} lh={1.4} style={{ textAlign: 'center' }}>{si} · {en}</T>
            </Pressable>
          ))}
        </View>
        <Card style={{ paddingHorizontal: 18, paddingVertical: 4 }}>
          {([['person_off', 'ගිණුමක් අවශ්‍ය නැත', 'No account, no sign-in'], ['phone_android', 'සටහන් ඔබේ දුරකථනයේ පමණි', 'Notes stay on your phone'],
            ['cloud_off', 'අන්තර්ජාලය නැතිවත් කියවන්න', 'Reads offline once downloaded']] as [IconName, string, string][]).map(([ic, si, en], i) => (
            <View key={ic} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
              <Icon name={ic} color={c.acct} />
              <View><T f={F.si6} size={15.5} lh={1.65}>{si}</T><T f={F.pali} size={13.5} lh={1.3} color={c.mut}>{en}</T></View>
            </View>
          ))}
        </Card>
      </>}

      <Btn label={step < 2 ? 'ඉදිරියට · Continue' : 'කියවීම අරඹන්න · Begin'} style={{ height: 58, borderRadius: 29, marginTop: 8 }}
        onPress={() => step < 2 ? setStep(step + 1) : setSettings({ onboarded: true })} />
    </Page>
  );
}
