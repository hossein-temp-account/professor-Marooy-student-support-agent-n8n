// Eval — Classification workflow — Node V3 "Parse Labels"
// Type: Code (Run Once for All Items)
//
// Reads the JSONL file produced by node V2 (Read Binary File,
// path /evals/classification_labels.jsonl).

const bin = $input.first().binary?.data;
if (!bin) throw new Error('No file read');

const text = Buffer.from(bin.data, 'base64').toString('utf8');

const items = text
  .split('\n')
  .map(l => l.trim())
  .filter(l => l.length > 0 && !l.startsWith('#'))
  .map((line, i) => {
    try {
      return { json: JSON.parse(line) };
    } catch (err) {
      throw new Error(`Label line ${i + 1} is not valid JSON: ${err.message}`);
    }
  });

if (items.length === 0) throw new Error('Label file parsed to zero rows');

return items;
