# Thripitakaya

A free, offline Tipiṭaka reader in Pāḷi, Sinhala and English. Dhamma Dāna: no ads, no accounts, no tracking.

## Run

```sh
npm install
npx expo start        # scan the QR code with Expo Go (Android) or the Camera app (iOS)
npm run typecheck
npm run check         # search-folding self-check
```

## Layout

| Path | What |
| --- | --- |
| `src/app/` | Screens (expo-router). `(tabs)/` = Home, Browse, Search, Ask, Library. `reader/[id]`, `settings`, `about`, `onboarding` |
| `src/data/content.ts` | The only scripture API the screens use: tree, sutta, search, dictionary, packs |
| `src/data/sample.ts` | Sample data for development. Not verbatim Buddha Jayanti text |
| `src/data/fold.ts` | Search folding: diacritics, ZWJ, long/short Sinhala vowels |
| `src/db/user.ts` | `user.db`: settings, bookmarks, highlights, notes, history. Stays on the phone |
| `src/ui.tsx`, `src/theme.ts` | Shared components and design tokens |
| `assets/fonts/` | Subset Material Symbols Rounded, FILL 0 and 1 (recipe in `src/ui.tsx`) |

## Sources

Pāḷi and Sinhala: Buddha Jayanti Tripiṭaka, from [tipitaka.lk](https://tipitaka.lk) (CC BY-ND 4.0).

## License

Code: GPL-3.0-or-later (see `LICENSE`). Texts keep their own licenses.
