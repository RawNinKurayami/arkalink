# Grand Line Chronicles: Italian and English

Italian is the normative edition. The English edition preserves the same rules,
numbers, costs, prerequisites, exceptions and action economy. It does not rebalance
the game or silently repair inconsistencies in the Italian sources.

## Public surfaces

- The IT / EN control is shared by GLC pages and remembers the device's choice.
- Complete manuals live at `/en/manuale/`, `/en/manuale-frutti/`,
  `/en/manuale-cyborg/` and `/en/manuale-prestigio/`.
- Managers use the existing URLs with `?lang=en`. Italian game identifiers,
  character records, imported JSON, authentication and cloud save keys stay the same.
- User-written names, biographies, notes, campaign journals and published posts
  retain their original language. Changing the interface does not rewrite them.
- The four English manual PDFs and three blank Devil Fruit PDFs are available
  from the English library and manuals. Approved artwork is shared between editions.
- Arkalink and Forge have their own interfaces and are outside this edition.

## Updating translations

1. Update the official Italian source through its existing editorial workflow.
2. Run `python3 strumenti/localizzazione.py extract manuale` (or the affected
   manual folders). For changed manager text run `extract-ui` after the manuals.
   Unchanged units keep their translations even when their pack position changes.
3. Translate new IDs from `*.source.json` into the corresponding `*.en.json`.
   Keep every inline HTML tag, attribute, anchor and numbered `{{1}}` placeholder.
4. Maintain `en/glossary.json`, `en/name-alignments.json` and
   `en/ui/supplemental.json` for shared names and complete dynamic phrases.
   Ambiguous terms require context; do not globally merge different game concepts.
5. Run `python3 strumenti/localizzazione.py validate` and `build`.
   A changed manual source hash or untranslated unit blocks the production build.
   `--partial` is only for local previews and must not be published.
6. Regenerate English PDFs with `strumenti/manuali-pdf.mjs --lang en` and
   `strumenti/scheda-frutto-pdf.py --lang en`, using the documented local runtimes.
7. Run the existing tests and `strumenti/verifica-lingue.mjs`, then inspect the
   generated manual PDFs and desktop/mobile previews before publishing.

`glc-i18n.js` translates presentation text and keeps bound DOM controls in place.
It pins implicit option values before changing labels and supplies `originalText`
for existing presentation helpers that identify Italian labels. Personal text is
protected in its display context, never by blocking an Attribute with the same name.
The synthetic browser verification blocks cloud requests and never uses an account.
