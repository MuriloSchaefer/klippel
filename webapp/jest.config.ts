import type {Config} from 'jest';
import {defaults} from 'jest-config';

export default async (): Promise<Config> => {
  return {
    verbose: true,
    maxWorkers: '70%',
    preset: 'ts-jest',
    cacheDirectory: './.jest/cache',
    coverageDirectory: './.jest/coverage',
    moduleFileExtensions: defaults.moduleFileExtensions,
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
              useESM: true,
            },
          ],
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '@kernel(.*)$': '<rootDir>/src/kernel/$1',
        '@system(.*)$': '<rootDir>/src/kernel/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    coverageReporters: ['json', 'lcov', 'text', 'clover'],
    globals: {
       // environment variables available during testing 
    }
  };
};