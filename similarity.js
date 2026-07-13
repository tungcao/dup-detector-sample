function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * So khớp tất cả các cặp function (all-pairs).
 * Với codebase lớn (vài nghìn function trở lên) nên thay bằng
 * approximate nearest neighbor (vd hnswlib-node) để tránh O(n^2).
 * Với pilot/team 8 người, all-pairs vẫn đủ nhanh.
 */
function findDuplicates(items, threshold = 0.75) {
  const results = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const score = cosineSimilarity(items[i].embedding, items[j].embedding);
      if (score >= threshold) {
        results.push({
          a: items[i].id,
          b: items[j].id,
          score: Number(score.toFixed(4)),
        });
      }
    }
  }
  return results.sort((x, y) => y.score - x.score);
}

module.exports = { cosineSimilarity, findDuplicates };
