/* istanbul ignore file */
import * as fs from 'fs';
import * as path from 'path';

export const validateSVGFilePath = (filePath: string) => {
  if (!path.isAbsolute(filePath)) {
    throw new Error(`filePath must be absolute, got: ${filePath}`);
  }
  if (filePath.includes('..')) {
    throw new Error(`filePath must not contain '..' segments, got: ${filePath}`);
  }
  if (!filePath.toLowerCase().endsWith('.svg')) {
    throw new Error(`filePath must end with .svg, got: ${filePath}`);
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`filePath does not exist or is not a file: ${filePath}`);
  }
};
