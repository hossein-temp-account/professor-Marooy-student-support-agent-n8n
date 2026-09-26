// Eval — Classification workflow — Node V6 "Aggregate"
// Type: Code (Run Once for All Items)

const items = $input.all().map(i => i.json);
const total = items.length;

if (total === 0) throw new Error('No scored items — check the Read Labels node');

const catCorrect  = items.filter(i => i.correct).length;
const prioCorrect = items.filter(i => i.priority_correct).length;
const parseFails  = items.filter(i => i.parse_error).length;

const byCat = {};
for (const it of items) {
  byCat[it.expected_category] ??= { total: 0, correct: 0 };
  byCat[it.expected_category].total++;
  if (it.correct) byCat[it.expected_category].correct++;
}

const perCategory = Object.entries(byCat)
  .map(([category, s]) => ({
    category,
    total:    s.total,
    correct:  s.correct,
    accuracy: +(s.correct / s.total).toFixed(3),
  }))
  .sort((a, b) => a.accuracy - b.accuracy);

const confusion = {};
for (const it of items) {
  confusion[it.expected_category] ??= {};
  const actual = it.actual_category ?? '(unparsed)';
  confusion[it.expected_category][actual] =
    (confusion[it.expected_category][actual] || 0) + 1;
}

const mean = arr => arr.length
  ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(3)
  : null;

const correctConf   = mean(items.filter(i => i.correct  && i.confidence != null).map(i => i.confidence));
const incorrectConf = mean(items.filter(i => !i.correct && i.confidence != null).map(i => i.confidence));

const failures = items
  .filter(i => !i.correct)
  .map(i => ({
    id:         i.id,
    question:   i.question,
    expected:   i.expected_category,
    actual:     i.actual_category,
    confidence: i.confidence,
    note:       i.parse_error,
  }));

return [{
  json: {
    summary: {
      total,
      category_correct:   catCorrect,
      category_accuracy:  +(catCorrect / total).toFixed(3),
      priority_correct:   prioCorrect,
      priority_accuracy:  +(prioCorrect / total).toFixed(3),
      parse_failures:     parseFails,
      mean_confidence_correct:   correctConf,
      mean_confidence_incorrect: incorrectConf,
    },
    per_category: perCategory,
    confusion,
    failures,
  },
}];
