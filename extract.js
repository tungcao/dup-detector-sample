const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

/**
 * Parse 1 file JS/TS/JSX và trả về danh sách function unit:
 * { id, name, filePath, code, startLine, endLine }
 */
function extractFunctionsFromFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf-8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'classProperties', 'optionalChaining'],
  });

  const functions = [];

  function pushFn(name, node) {
    if (!node.loc) return;
    const snippet = code.slice(node.start, node.end);
    // bỏ qua function quá ngắn (getter 1-2 dòng gần như không có nghĩa để so duplicate)
    if (snippet.split('\n').length < 2) return;
    functions.push({
      id: `${path.basename(filePath)}::${name}`,
      name,
      filePath,
      code: snippet,
      startLine: node.loc.start.line,
      endLine: node.loc.end.line,
    });
  }

  traverse(ast, {
    FunctionDeclaration(p) {
      const name = p.node.id ? p.node.id.name : '(anonymous)';
      pushFn(name, p.node);
    },
    // export const foo = (x) => {...}  hoặc  const foo = function () {...}
    VariableDeclarator(p) {
      const init = p.node.init;
      if (
        init &&
        (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression') &&
        p.node.id &&
        p.node.id.type === 'Identifier'
      ) {
        pushFn(p.node.id.name, init);
      }
    },
    ClassMethod(p) {
      const name = p.node.key && p.node.key.name ? p.node.key.name : '(method)';
      pushFn(name, p.node);
    },
  });

  return functions;
}

/**
 * Quét toàn bộ thư mục (đệ quy) lấy các file .js/.jsx/.ts/.tsx
 */
function extractFunctionsFromDir(dirPath) {
  const exts = ['.js', '.jsx', '.ts', '.tsx'];
  let allFunctions = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(fullPath);
      } else if (exts.includes(path.extname(entry.name))) {
        try {
          const fns = extractFunctionsFromFile(fullPath);
          allFunctions = allFunctions.concat(fns);
        } catch (err) {
          console.warn(`  [skip] Không parse được ${fullPath}: ${err.message}`);
        }
      }
    }
  }

  walk(dirPath);
  return allFunctions;
}

module.exports = { extractFunctionsFromFile, extractFunctionsFromDir };

// Cho phép chạy trực tiếp: node extract.js ./sample-src
if (require.main === module) {
  const target = process.argv[2] || './sample-src';
  const fns = extractFunctionsFromDir(target);
  console.log(`Tìm thấy ${fns.length} functions:\n`);
  fns.forEach((f) => {
    console.log(`- ${f.id}  (dòng ${f.startLine}-${f.endLine}, ${f.filePath})`);
  });
}
