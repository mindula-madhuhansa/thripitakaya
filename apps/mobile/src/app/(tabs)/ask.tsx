import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '../../theme';
import { Chips, Eyebrow, Icon, IconBtn, T, useColors, Wheel } from '../../ui';

type Msg = { role: 'user' | 'ai'; text: string };
const SUGGEST = ['අනාත්ම යනු කුමක්ද?', 'Explain the Four Noble Truths', 'සතිපට්ඨානය කෙටියෙන්'];
// ponytail: no backend yet. Needs the ask endpoint, a consent sheet, citation chips and a Report button.
const NOT_CONNECTED = 'සහායකය තවම සම්බන්ධ කර නැත. · The assistant is not connected in this build yet. Every answer will cite the exact passages so you can read them yourself.';

export default function Ask() {
  const c = useColors(), insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);

  const send = (text = draft) => {
    const q = text.trim().slice(0, 500);
    if (!q) return;
    setMsgs(m => [...m, { role: 'user', text: q }, { role: 'ai', text: NOT_CONNECTED }]);
    setDraft('');
    setTimeout(() => scroll.current?.scrollToEnd(), 50);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 }}>
        <View>
          <Eyebrow en="Dhamma assistant" />
          <T f={F.si7} size={25} lh={1.6}>ධර්ම සහායක</T>
        </View>
        <IconBtn name="edit_square" label="New conversation" size={22} onPress={() => setMsgs([])}
          style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: c.line }} />
      </View>

      <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 18, backgroundColor: c.soft }}>
          <Icon name="info" color={c.acct} />
          <View style={{ flex: 1, gap: 6 }}>
            <T f={F.si5} size={14.5} lh={1.7}>මෙම සහායකය පාඨ පැහැදිලි කරයි. එය ධර්මය පිළිබඳ බලධාරියෙකු නොවේ — සෑම විටම මූලාශ්‍රය කියවන්න.</T>
            <T f={F.pali} size={13.5} lh={1.45} color={c.mut}>It explains the texts; it is not an authority. Always read the source, and ask a teacher when in doubt.</T>
          </View>
        </View>

        {!msgs.length ? (
          <View style={{ alignItems: 'center', gap: 8, paddingTop: 26, paddingHorizontal: 10 }}>
            <Wheel size={34} stroke={1.3} />
            <T f={F.si6} size={19} lh={1.6}>ධර්මය ගැන විමසන්න</T>
            <T f={F.pali} size={15} lh={1.5} color={c.mut} style={{ textAlign: 'center' }}>Every answer points to the exact passage, so you can read the Buddha’s words yourself.</T>
          </View>
        ) : null}

        {msgs.map((m, i) => m.role === 'user' ? (
          <View key={i} style={{ alignSelf: 'flex-end', maxWidth: '84%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: c.ink }}>
            <T size={16} lh={1.65} color={c.bg}>{m.text}</T>
          </View>
        ) : (
          <View key={i} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Wheel size={16} stroke={1.8} />
              <T f={F.pali} size={13} lh={1.2} color={c.mut}>Assistant · explains, not an authority</T>
            </View>
            {/* Commentary style: never the Pāḷi font or verse style, so it can't be mistaken for scripture */}
            <T size={16.5} lh={1.8} color={c.mut}>{m.text}</T>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.bg }}>
        {msgs.length <= 2 ? (
          <Chips>
            {SUGGEST.map(s => (
              <Pressable key={s} onPress={() => send(s)} accessibilityRole="button"
                style={{ height: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.line, justifyContent: 'center' }}>
                <T size={14.5} lh={1.3}>{s}</T>
              </Pressable>
            ))}
          </Chips>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={() => send()} returnKeyType="send" maxLength={500}
            placeholder="ප්‍රශ්නයක් අසන්න · Ask a question" placeholderTextColor={c.mut} accessibilityLabel="Ask a question"
            style={{ flex: 1, minWidth: 0, height: 50, paddingHorizontal: 18, borderRadius: 25, borderWidth: 1.5, borderColor: c.line,
              backgroundColor: c.card, fontFamily: F.si, fontSize: 16, color: c.ink }} />
          <IconBtn name="arrow_upward" label="Send" color={c.bg} onPress={() => send()}
            style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: c.ink }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
