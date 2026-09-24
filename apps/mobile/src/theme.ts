// Design tokens: colours, fonts and type steps.

export const paper = {
  bg: '#F4EEE3', card: '#FBF8F2', ink: '#33251A', mut: '#735F4C', acct: '#955515', acc: '#D08A45',
  line: '#E2D6C3', soft: '#EEE3D0', hl: '#F2D9A8', hlSoft: '#F2D9A88C', onacc: '#2A1B0E', dim: 'rgba(24,14,6,.42)',
};
export const night: typeof paper = {
  bg: '#16110D', card: '#211912', ink: '#EADFCD', mut: '#A89580', acct: '#E4A868', acc: '#D48F4C',
  line: '#3A2E23', soft: '#2A2018', hl: '#4A3319', hlSoft: '#4A33198C', onacc: '#1A110A', dim: 'rgba(0,0,0,.55)',
};
export type Colors = typeof paper;

// RN picks a font per family name, not per weight, so every weight is its own family.
export const F = {
  pali: 'GentiumBookPlus_400Regular',
  paliI: 'GentiumBookPlus_400Regular_Italic',
  paliB: 'GentiumBookPlus_700Bold',
  noto: 'NotoSerif_400Regular',
  notoI: 'NotoSerif_400Regular_Italic',
  si: 'NotoSerifSinhala_400Regular',
  si5: 'NotoSerifSinhala_500Medium',
  si6: 'NotoSerifSinhala_600SemiBold',
  si7: 'NotoSerifSinhala_700Bold',
  abhaya: 'AbhayaLibre_500Medium',
  sym: 'Sym0',
  symFill: 'Sym1',
};

// [pali px, sinhala px] per text-size step
export const FONT_STEPS: [number, number][] = [[17, 16], [19, 17.5], [21.5, 19], [24, 21.5], [27, 24]];
export const SIZE_NAMES = ['කුඩා · Small', 'සාමාන්‍ය · Medium', 'විශාල · Large', 'වඩා විශාල · Larger', 'ඉතා විශාල · Largest'];
export const LINE_STEPS = [1.55, 1.8, 2.1];
export const SI_LINE_STEPS = [1.7, 1.95, 2.25];

export const LANGS = [
  { value: 'si' as const, label: 'සිංහල', sub: 'Pāḷi with Sinhala' },
  { value: 'both' as const, label: 'සිංහල + English', sub: 'Pāḷi with Sinhala and English' },
  { value: 'en' as const, label: 'English', sub: 'Pāḷi with English' },
];
