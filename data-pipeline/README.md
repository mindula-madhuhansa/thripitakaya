# data-pipeline

Builds the app's text databases from [tipitaka.lk](https://github.com/pathnirvana/tipitaka.lk) (Buddha Jayanti Tripiṭaka, CC BY-ND 4.0).
Text is stored byte-for-byte as upstream; only search columns are derived. Needs Node 24+, no other tools.

```sh
npm run fetch      # download the 190 Mūla files pinned in sources.lock.json (~165 MB, cached)
npm run build      # out/core.db + out/packs/*.db
npm run verify     # out/verify-report.md; exits 1 on any error
npm run package    # out/release/*.db.gz + manifest.json, out/size-report.md
npm run all        # all four
node src/fetch.ts --update   # move the pin to upstream HEAD
```

| File | What |
| --- | --- |
| `sources.lock.json` | Upstream commit + sha256 of every input file. Same lock → byte-identical output |
| `expected-counts.json` | Sutta/book counts verify checks against |
| `.github/workflows/data.yml` | Weekly sync PR; publishing packs to GitHub Releases on merge |

Verify checks: every upstream entry and footnote present and byte-equal, counts, every sutta has text,
character sanity, and that Roman display converts back to the exact Sinhala-script text.
