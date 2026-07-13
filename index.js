require('dotenv').config();

const { extractFunctionsFromDir } = require('./extract');
const { getEmbeddingBatch, ENGINE } = require('./embed');
const { findDuplicates } = require('./similarity');

const TARGET_DIR = process.argv[2] || './sample-src';
const THRESHOLD = Number(process.argv[3] || 0.75);

async function run() {
  console.log(`\n=== BƯỚC 1: Extract functions từ "${TARGET_DIR}" ===`);
  const functions = extractFunctionsFromDir(TARGET_DIR);
  console.log(`Tìm thấy ${functions.length} functions.\n`);

  console.log(`=== BƯỚC 2: Generate embedding (engine = "${ENGINE}") ===`);
  const embeddings = await getEmbeddingBatch(functions.map((f) => f.code));
  const items = functions.map((fn, i) => ({ ...fn, embedding: embeddings[i] }));
  items.forEach((item) => console.log(`  ✓ embedded: ${item.id}`));

  console.log(`\n=== BƯỚC 3: So sánh cosine similarity (threshold = ${THRESHOLD}) ===`);
  const duplicates = findDuplicates(items, THRESHOLD);

  if (duplicates.length === 0) {
    console.log('Không phát hiện cặp function nào vượt threshold.');
  } else {
    console.log(`Phát hiện ${duplicates.length} cặp nghi ngờ duplicate:\n`);
    duplicates.forEach((d, idx) => {
      const flag = d.score >= 0.9 ? '🔴 HIGH' : d.score >= 0.8 ? '🟠 MEDIUM' : '🟡 LOW';
      console.log(`${idx + 1}. [${flag}] similarity=${d.score}`);
      console.log(`   - ${d.a}`);
      console.log(`   - ${d.b}\n`);
    });
  }
}

run().catch((err) => {
  console.error('Lỗi:', err);
  process.exit(1);
});
