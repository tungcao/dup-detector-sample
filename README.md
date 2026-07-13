# Duplicate Code Detector — Pilot (AST + Embedding + Cosine Similarity)

Pilot phát hiện duplicate code, bao gồm cả case **logic giống nhau nhưng tên hàm /
cấu trúc code khác nhau** — thứ mà `jscpd` và `SonarQube` (dựa trên token/clone
matching) thường bỏ sót.

## Cách hoạt động (3 bước)

1. **`extract.js`** — Dùng Babel AST parser quét file `.js/.jsx/.ts/.tsx`, tách ra
   từng function (function declaration, arrow function gán biến, class method).
2. **`embed.js`** — Sinh embedding (vector số) cho mỗi function để so sánh mức độ
   "giống nhau về ý nghĩa". Có 2 chế độ:
   - **Local (mặc định, miễn phí, chạy offline)**: character n-gram hashing.
     Không cần API key, chạy được ngay, đủ để demo/pilot.
   - **API thật (production)**: gọi Voyage AI (`voyage-code-3`, model chuyên cho
     code) hoặc OpenAI (`text-embedding-3-small`). Bật bằng cách set biến môi
     trường (xem phần "Dùng embedding API thật" bên dưới).
3. **`similarity.js`** — Tính cosine similarity giữa tất cả các cặp function
   (all-pairs), lọc theo threshold, sắp xếp theo mức độ giống nhau giảm dần.

## Cài đặt

```bash
npm install
cp .env.sample .env   # rồi chỉnh EMBEDDING_ENGINE + các biến liên quan trong .env
```

Có thể dùng `.env` hoặc `export` biến môi trường trực tiếp — cả 2 cách đều
được, các ví dụ dưới đây dùng `export` để rõ ràng từng bước, nhưng bạn có thể
gộp hết vào `.env` cho gọn.

## Chạy pilot với sample code có sẵn

Thư mục `src/` có sẵn 2 file với 3 cặp duplicate cố ý cài vào (đổi tên hàm,
đổi cấu trúc code) để bạn thấy pipeline hoạt động đúng:

```bash
npm start
# tương đương: node index.js ./src 0.35
```

Kết quả mong đợi: phát hiện đúng 3 cặp duplicate, xếp hạng theo độ giống nhau,
và **không** báo nhầm hàm `generateOrderId` (hàm control, cố tình không trùng ai).

## Chạy trên codebase thật của bạn

```bash
node index.js /path/to/your/react-native/src 0.35
```

- Tham số 1: đường dẫn thư mục cần quét (đệ quy, tự bỏ qua `node_modules`).
- Tham số 2: threshold cosine similarity (0–1). Với embedding local, nên bắt đầu
  từ `0.35–0.4` rồi tự điều chỉnh dựa trên kết quả thực tế — **không có con số
  chuẩn sẵn**, phải nhìn dữ liệu thật của codebase bạn mới chọn được số phù hợp.

## Chọn embedding engine

Chọn qua biến môi trường `EMBEDDING_ENGINE`:

| Engine  | Chi phí | Chất lượng semantic | Cần gì |
|---------|---------|----------------------|--------|
| `hash` (mặc định) | Miễn phí | Thấp — chỉ demo pipeline | Không cần gì thêm |
| `ollama` | Miễn phí | Khá — model thật, chạy local | Cài Ollama |
| `voyage` | Có phí (rẻ) | Cao nhất, chuyên cho code | API key Voyage |
| `openai` | Có phí (rẻ) | Cao, general purpose | API key OpenAI |

### Dùng Ollama (local, miễn phí, semantic thật)

Đây là bước nâng cấp hợp lý nhất từ bản pilot `hash`: vẫn miễn phí, code không
rời khỏi máy bạn, nhưng embedding có ý nghĩa ngữ nghĩa thật thay vì chỉ so token.

```bash
# 1. Cài Ollama: https://ollama.com/download
# 2. Pull model embedding (chọn 1 trong 2):
ollama pull nomic-embed-text      # nhẹ, nhanh, đủ tốt cho pilot
ollama pull mxbai-embed-large     # nặng hơn, chất lượng cao hơn

# 3. Ollama tự chạy server ở localhost:11434 sau khi cài — không cần
#    lệnh "ollama serve" thủ công trừ khi bạn tắt service.

# 4. Chạy pilot với Ollama:
export EMBEDDING_ENGINE=ollama
node index.js ./src 0.6
```

Lưu ý: threshold với Ollama sẽ khác với threshold của `hash` (thường cao hơn,
tách biệt rõ hơn giữa duplicate thật và không liên quan) — chạy thử trên
`src` trước để có cảm giác về thang điểm, rồi mới áp dụng lên codebase
thật.

Nếu gặp lỗi `ECONNREFUSED` hoặc lỗi 404 từ Ollama: kiểm tra `ollama list` xem
model đã pull thành công chưa, và Ollama service có đang chạy không (`ollama ps`).

Muốn đổi model khác hoặc đổi port:

```bash
export OLLAMA_MODEL=mxbai-embed-large
export OLLAMA_HOST=http://localhost:11434
```

### Dùng embedding API thật (Voyage/OpenAI — khuyến nghị khi lên production)

Chất lượng cao nhất, nhưng có phí và code sẽ được gửi qua API bên ngoài:

```bash
export EMBEDDING_ENGINE=voyage
export VOYAGE_API_KEY=your_key_here   # hoặc EMBEDDING_ENGINE=openai + OPENAI_API_KEY
node index.js /path/to/your/src 0.75  # threshold với model thật thường cao hơn, ví dụ 0.75-0.85
```

Chi phí tham khảo: Voyage/OpenAI embedding rẻ (dưới $0.15/1 triệu token). Một
codebase vài nghìn function thường tốn dưới $1 để index toàn bộ lần đầu; các lần
scan PR sau đó (chỉ embed phần diff) gần như không đáng kể.

## Chạy trên GitHub Actions (CI/CD)

Workflow có sẵn ở `.github/workflows/duplicate-check.yml` — tự động chạy
duplicate check trên mỗi Pull Request và comment kết quả thẳng vào PR.

### Free tier có đủ dùng không?

- Repo **public**: Actions minutes **miễn phí không giới hạn**.
- Repo **private** (free account): **2,000 phút/tháng miễn phí** — mỗi lần
  chạy workflow này tốn khoảng 1-3 phút, nên với team 8 người thoải mái dùng.
- Runner mặc định (2-core, 7GB RAM) đủ chạy Ollama + model nhỏ
  (`nomic-embed-text`, 274MB) bằng CPU, không cần GPU.

### Cơ chế hoạt động

1. Mỗi lần PR được tạo/update → GitHub spin lên 1 VM sạch (ephemeral, không có
   gì cài sẵn từ lần chạy trước).
2. Checkout code, cài Node.js, cài Ollama, khởi động Ollama server nền.
3. Pull model embedding — bước tốn thời gian nhất (~30s-1 phút cho lần đầu),
   nên workflow đã cấu hình **cache** thư mục `~/.ollama` để các lần sau nhanh
   hơn (cache hit ~10-15s thay vì tải lại từ đầu).
4. Cài dependency, chạy `index.js` để scan, xuất report.
5. Post report vào PR dưới dạng comment (dùng `actions/github-script`).
6. (Tuỳ chọn, đã comment sẵn trong workflow) Có thể cho job **fail** nếu phát
   hiện duplicate mức HIGH, biến thành quality gate chặn merge thật sự — bỏ
   comment đoạn cuối file workflow để bật.

### Trước khi dùng cho project thật

- Đổi `./src` trong bước "Run duplicate detector" thành thư mục source
  code thật của bạn (ví dụ `./src`).
- Threshold `0.6` là điểm khởi đầu cho engine `ollama` — nên chạy thử vài lần
  trên PR thật để tune lại cho phù hợp codebase của bạn.
- Với codebase lớn, cân nhắc chỉ scan các file thay đổi trong PR diff (thay vì
  toàn bộ thư mục mỗi lần) để giảm thời gian chạy — bản hiện tại scan toàn bộ
  thư mục cho đơn giản, phù hợp để bắt đầu.

- **All-pairs O(n²)**: với codebase lớn (vài nghìn function trở lên), nên thay
  bằng approximate nearest neighbor (ví dụ thư viện `hnswlib-node`) để tránh chậm.
- **Không chạy trên PR diff tự động**: đây mới là bản pilot chạy local/manual.
  Để tích hợp CI (GitHub Actions), cần thêm bước: build index toàn bộ codebase
  định kỳ (nightly), rồi khi có PR chỉ embed các function trong diff và so với
  index có sẵn.
- **Threshold cần tune theo từng codebase**: không có số chuẩn universal, đặc
  biệt khi đổi từ local embedding sang API thật thì thang điểm sẽ khác hẳn.

## Cấu trúc project

```
dup-detector/
├── extract.js       # Bước 1: AST extraction
├── embed.js          # Bước 2: sinh embedding (local + API)
├── similarity.js     # Bước 3: cosine similarity + ranking
├── index.js           # Chạy end-to-end, in report
├── src/        # Code mẫu có cài sẵn duplicate để test
│   ├── userService.js
│   └── orderService.js
└── package.json
```
