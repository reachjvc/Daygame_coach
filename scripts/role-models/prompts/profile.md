# Step 3 — Profile text

Read `_rules.md` first; it is part of this prompt. Then `tone-check.md`: your text must pass it.

The readers are men improving their lives; many read English as a second language. Write plain, short,
concrete sentences. Every factual sentence must trace to a source in the file (cite its id in notes.md next to
the sentence if the file field has no sourceIds). No invented dialogue, no inner thoughts, no "the greatest
ever" unless a source says it and you name the source.

- `tagline`: one line, at most 90 characters, what he is a model of. Plain, not an advert.
- `startedFrom`: one to three sentences. Where he began: family, money, health, schooling, the obstacle. This
  is for "if he could, I can"; give the real start, not a rags-to-riches myth.
- `definingMoment`: two to five sentences. One dated event that shows his values in action, with `sourceIds`.
- `shadow`: two to five sentences. What he did that people hold against him, told as plain documented fact,
  dated, with `sourceIds`. No verdict ("shamefully", "monstrous", "a dark stain"), no excuse ("a man of his
  time", "but he later…" used to cancel it). If the record is contested, say who says what. If the honest
  answer is small (a feud, a temper), say the small thing; do not inflate. Every profile has one.
- `councilQuestion`: one question in the second person about the reader's past week, built from one principle
  (`principleIndex`, 0-based), e.g. Marcus: "Where did you let something outside your control decide your mood
  this week?"
- `readings`: zero to three works BY him (title, first publication year), the ones a reader should start with.
