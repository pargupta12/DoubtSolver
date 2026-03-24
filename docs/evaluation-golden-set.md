# Golden evaluation set (manual)

Use this list to spot-check answer quality after prompt or pipeline changes. Score each answer **1–5** on the three axes below (quick notes per question).

## Rubric (1 = poor, 5 = excellent)

| Axis | What to check |
|------|----------------|
| **Steps** | Numbered or clear sequence; no magic numbers; “why” before each move when it matters. |
| **No magic** | Fraction problems show common denominator + equivalents (e.g. 1/2 = 3/6) before adding tops. |
| **Age fit** | Sentence length and vocabulary match selected age (6–8 / 9–11 / 12–15). |

Optional fourth: **Structure** — four sections with correct 👉 headings.

## Questions (English, unless noted)

### Fractions / operations

1. What is 1/2 + 1/3?
2. What is 3/4 − 1/4?
3. What is 2/5 + 1/5?
4. What is 1/3 + 1/6?

### Whole numbers

5. What is 28 + 15?
6. What is 52 − 18?
7. What is 3 × 4?
8. What is 12 ÷ 3?
9. What is 17 + 25?

### Word problems

10. Riya has 12 stickers. She gives 5 to her friend. How many are left?
11. One pen costs ₹8. How much do 5 pens cost?
12. A rope is 2 meters long. How many centimeters is that?

### Non-math control (should NOT trigger math-only regen / should stay conceptual)

13. What is gravity?
14. Why is the sky blue?
15. Who was Mahatma Gandhi?

### Hindi (same rubric; headings in Devanagari)

16. 1/2 + 1/3 कितना होता है?
17. 15 में से 7 घटाओ।
18. 4 × 5 कितना?

### Edge / routing

19. What is 1/2 + 1/3 + 1/6? (multi-step fractions)
20. What is 0.5 + 0.25? (decimals)

## How to run

1. Set age and language in the app for each batch (e.g. age **8** and **10** for samples).
2. Ask each question once; paste answer into a spreadsheet with scores.
3. Note **math regen** if you add logging: count how often `mathAnswerFailsGuard` fired.

## Regression target

After changes, averages on questions **1–4** should stay **≥ 4** on Steps and No magic for ages **8–10**. Non-math **13–15** must remain clear explanations without forced fraction steps.
