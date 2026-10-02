import { fileURLToPath } from 'url';
import { dirname } from 'path';

const currentDir = dirname(fileURLToPath(import.meta.url));

Object.assign(globalThis, {
  __filename: fileURLToPath(import.meta.url),
  __dirname: currentDir,
});
