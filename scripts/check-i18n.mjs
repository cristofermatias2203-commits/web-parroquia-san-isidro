#!/usr/bin/env node
/** Comprueba la paridad de claves de los diccionarios en los nueve idiomas. */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(projectRoot, 'src', 'i18n', 'dictionaries.json');
const dictionaries = JSON.parse(await readFile(file, 'utf8'));

const languages = dictionaries.languages.map((language) => language.code);
if (languages.length !== 9) throw new Error(`Se esperaban 9 idiomas, hay ${languages.length}`);

let errors = 0;
for (const group of ['meta', 'seasons', 'ranks', 'meditations', 'gospelBooks', 'ui']) {
  const reference = Object.keys(dictionaries[group].es ?? {}).sort();
  for (const code of languages) {
    const keys = Object.keys(dictionaries[group][code] ?? {}).sort();
    const missing = reference.filter((key) => !keys.includes(key));
    const extra = keys.filter((key) => !reference.includes(key));
    if (missing.length || extra.length) {
      errors += 1;
      console.error(`${group}.${code}: faltan ${JSON.stringify(missing)}, sobran ${JSON.stringify(extra)}`);
    }
  }
  console.log(`${group}: ${reference.length} claves × ${languages.length} idiomas`);
}

if (errors) throw new Error(`${errors} grupos desequilibrados`);
console.log('i18n: paridad correcta');
