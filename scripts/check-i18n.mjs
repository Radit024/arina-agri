import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MESSAGE_FILES = {
  id: path.join(ROOT, 'messages', 'id.json'),
  en: path.join(ROOT, 'messages', 'en.json'),
};
const SOURCE_DIRS = ['app', 'components', 'hooks', 'lib', 'context'];
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function flattenMessages(value, prefix = '', output = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenMessages(item, `${prefix}.${index}`, output));
    return output;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      flattenMessages(child, prefix ? `${prefix}.${key}` : key, output);
    });
    return output;
  }

  if (prefix) output.add(prefix);
  return output;
}

function walkFiles(dirPath, files = []) {
  if (!fs.existsSync(dirPath)) return files;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') continue;
      walkFiles(fullPath, files);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectUsedTranslationKeys() {
  const used = new Map();
  const dynamicCalls = [];
  const sourceFiles = SOURCE_DIRS.flatMap((dir) => walkFiles(path.join(ROOT, dir)));

  for (const filePath of sourceFiles) {
    const source = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(ROOT, filePath);
    const translators = new Map();

    for (const match of source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*useTranslations\s*\(\s*(?:(['"`])([^'"`]*)\2\s*)?\)/g)) {
      translators.set(match[1], match[3] || '');
    }

    for (const match of source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+getTranslations\s*\(\s*(?:(['"`])([^'"`]*)\2\s*)?\)/g)) {
      translators.set(match[1], match[3] || '');
    }

    for (const [translatorName, namespace] of translators) {
      const callPattern = new RegExp(`(?<![\\w$])${escapeRegExp(translatorName)}(?![\\w$])\\s*\\(\\s*(['"\`])([^'"\`]+)\\1`, 'g');
      for (const match of source.matchAll(callPattern)) {
        const key = namespace ? `${namespace}.${match[2]}` : match[2];
        if (!used.has(key)) used.set(key, []);
        used.get(key).push(relativePath);
      }

      const dynamicPattern = new RegExp(`(?<![\\w$])${escapeRegExp(translatorName)}(?![\\w$])\\s*\\(\\s*(?!['"\`])([^),\\n]+)`, 'g');
      for (const match of source.matchAll(dynamicPattern)) {
        dynamicCalls.push(`${relativePath}: ${translatorName}(${match[1].trim()})`);
      }
    }
  }

  return { used, dynamicCalls };
}

function difference(left, right) {
  return [...left].filter((key) => !right.has(key)).sort();
}

function printSection(title, rows) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));

  if (rows.length === 0) {
    console.log('OK');
    return;
  }

  rows.forEach((row) => console.log(`- ${row}`));
}

const messages = {
  id: readJson(MESSAGE_FILES.id),
  en: readJson(MESSAGE_FILES.en),
};
const flattened = {
  id: flattenMessages(messages.id),
  en: flattenMessages(messages.en),
};
const { used, dynamicCalls } = collectUsedTranslationKeys();
const usedKeys = new Set(used.keys());

const missingInId = difference(flattened.en, flattened.id);
const missingInEn = difference(flattened.id, flattened.en);
const usedMissingInId = difference(usedKeys, flattened.id).map((key) => `${key} (${[...new Set(used.get(key))].join(', ')})`);
const usedMissingInEn = difference(usedKeys, flattened.en).map((key) => `${key} (${[...new Set(used.get(key))].join(', ')})`);

console.log('i18n check: messages/id.json <-> messages/en.json');
console.log(`Total id keys: ${flattened.id.size}`);
console.log(`Total en keys: ${flattened.en.size}`);
console.log(`Static used translation keys found: ${usedKeys.size}`);

printSection('Missing in messages/id.json compared to en.json', missingInId);
printSection('Missing in messages/en.json compared to id.json', missingInEn);
printSection('Used in code but missing in messages/id.json', usedMissingInId);
printSection('Used in code but missing in messages/en.json', usedMissingInEn);
printSection('Dynamic translation calls to review manually', dynamicCalls.sort());

const hasProblems = missingInId.length || missingInEn.length || usedMissingInId.length || usedMissingInEn.length;
if (hasProblems && !process.argv.includes('--warn-only')) {
  process.exitCode = 1;
}
