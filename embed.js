const crypto = require('crypto');

/**
 * ============================================================
 * OPTION A — LOCAL EMBEDDING (miễn phí, chạy offline, dùng để
 * demo pilot ngay hôm nay không cần API key / không tốn phí).
 *
 * Cách làm: character n-gram hashing vector (giống kiểu
 * "feature hashing" của scikit-learn HashingVectorizer).
 * Đây KHÔNG phải embedding ngữ nghĩa sâu như CodeBERT/Voyage,
 * nhưng vẫn nắm được sự tương đồng về cấu trúc/token của code,
 * đủ để demo pipeline end-to-end và bắt được phần lớn duplicate
 * "na ná nhau". Với semantic thật sự (đổi hẳn cách viết), nên
 * dùng Option B bên dưới.
 * ============================================================
 */
const LOCAL_VECTOR_SIZE = 512;
const NGRAM_SIZE = 3;

function normalizeCode(code) {
  // bỏ comment, whitespace thừa, để hàm dù format khác nhau vẫn so được cấu trúc
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function localEmbedding(code) {
  const text = normalizeCode(code);
  const vector = new Array(LOCAL_VECTOR_SIZE).fill(0);

  for (let i = 0; i < text.length - NGRAM_SIZE + 1; i++) {
    const gram = text.slice(i, i + NGRAM_SIZE);
    const hash = crypto.createHash('md5').update(gram).digest();
    const idx = hash.readUInt32BE(0) % LOCAL_VECTOR_SIZE;
    const sign = hash.readUInt8(4) % 2 === 0 ? 1 : -1;
    vector[idx] += sign;
  }

  // normalize để cosine similarity không bị lệch theo độ dài hàm
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vector.map((v) => v / norm);
}

/**
 * ============================================================
 * OPTION A.2 — OLLAMA (local, MIỄN PHÍ, nhưng semantic thật sự,
 * không phải hashing thô như Option A ở trên).
 *
 * Chạy 1 model embedding thật ngay trên máy bạn qua Ollama, không
 * cần API key, không gửi code ra ngoài internet. Chất lượng semantic
 * tốt hơn hẳn hashing, dù vẫn không bằng model thương mại chuyên biệt
 * (Voyage code-3) — nhưng miễn phí và giữ code trong máy là ưu điểm lớn
 * nếu công ty nhạy cảm về việc gửi code ra ngoài.
 *
 * Setup (chạy 1 lần trên máy):
 *   1. Cài Ollama: https://ollama.com/download
 *   2. Chạy: ollama pull nomic-embed-text
 *      (hoặc "ollama pull mxbai-embed-large" - chất lượng cao hơn, nặng hơn)
 *   3. Ollama tự chạy server ở http://localhost:11434 sau khi cài.
 * ============================================================
 */
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'nomic-embed-text';

async function ollamaEmbedding(code) {
  const res = await fetch(`${OLLAMA_HOST}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      input: normalizeCode(code),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Ollama trả lỗi (${res.status}): ${text}\n` +
        `→ Kiểm tra: đã "ollama pull ${OLLAMA_MODEL}" chưa? Ollama đã chạy chưa (thử "ollama list")?`
    );
  }
  const data = await res.json();
  return data.embeddings[0];
}

/**
 * Batch embed nhiều function trong 1 request — nhanh hơn nhiều so với
 * gọi từng function một, vì đỡ overhead round-trip HTTP local.
 */
async function ollamaEmbedBatch(codeArray) {
  const res = await fetch(`${OLLAMA_HOST}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      input: codeArray.map(normalizeCode),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Ollama trả lỗi (${res.status}): ${text}\n` +
        `→ Kiểm tra: đã "ollama pull ${OLLAMA_MODEL}" chưa? Ollama đã chạy chưa (thử "ollama list")?`
    );
  }
  const data = await res.json();
  return data.embeddings;
}

/**
 * ============================================================
 * OPTION B — REAL EMBEDDING API (production, có phí nhưng rẻ)
 * Ví dụ dùng Voyage AI (model chuyên cho code) hoặc OpenAI.
 * Cắm API key vào biến môi trường rồi đổi USE_LOCAL_EMBEDDING=false.
 * ============================================================
 */
async function voyageEmbedding(code) {
  const apiKey = process.env.VOYAGE_API_KEY;
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: [normalizeCode(code)],
      model: 'voyage-code-3',
    }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

async function openaiEmbedding(code) {
  const apiKey = process.env.OPENAI_API_KEY;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: normalizeCode(code),
      model: 'text-embedding-3-small',
    }),
  });
  const data = await res.json();
  return data.data[0].embedding;
}

/**
 * Chọn engine qua biến môi trường EMBEDDING_ENGINE:
 *   - "hash"   (mặc định) : local, hashing thô, không cần cài gì thêm
 *   - "ollama"            : local, semantic thật, cần cài Ollama
 *   - "voyage" / "openai" : API thật, có phí, cần API key
 */
const ENGINE = process.env.EMBEDDING_ENGINE || 'hash';

async function getEmbedding(code) {
  switch (ENGINE) {
    case 'ollama':
      return ollamaEmbedding(code);
    case 'voyage':
      return voyageEmbedding(code);
    case 'openai':
      return openaiEmbedding(code);
    case 'hash':
    default:
      return localEmbedding(code);
  }
}

/**
 * Batch version — dùng khi có nhiều function cần embed cùng lúc.
 * Chỉ Ollama/Voyage/OpenAI hỗ trợ batch thật sự; với "hash" thì
 * vẫn loop bình thường vì đằng nào cũng không tốn network call.
 */
async function getEmbeddingBatch(codeArray) {
  if (ENGINE === 'ollama') {
    return ollamaEmbedBatch(codeArray);
  }
  // hash / voyage / openai: xử lý tuần tự (đơn giản, đủ dùng cho pilot)
  const results = [];
  for (const code of codeArray) {
    results.push(await getEmbedding(code));
  }
  return results;
}

module.exports = {
  getEmbedding,
  getEmbeddingBatch,
  localEmbedding,
  normalizeCode,
  ENGINE,
};
