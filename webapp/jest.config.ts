import type {Config} from 'jest';
import {defaults} from 'jest-config';

export default async (): Promise<Config> => {
  return {
    verbose: true,
    maxWorkers: 1,
    testEnvironment: '<rootDir>/jest.screenshotEnv.cjs',
    setupFiles: ['<rootDir>/jest.setup.ts'],
    globalSetup: '<rootDir>/jest.globalSetup.ts',
    globalTeardown: '<rootDir>/jest.globalTeardown.ts',
    cacheDirectory: './.jest/cache',
    coverageDirectory: './.jest/coverage',
    moduleFileExtensions: defaults.moduleFileExtensions,
    transform: {
      '^.+\\.(t|j)sx?$': ['@swc/jest', {}],
    },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    moduleNameMapper: {
        '@kernel(.*)$': '<rootDir>/src/kernel/$1',
        '@system(.*)$': '<rootDir>/src/system/$1',
        '@helpers(.*)$': '<rootDir>/src/helpers/$1',
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
    modulePathIgnorePatterns: ['<rootDir>/out/', '<rootDir>/dist/'],
    // `scripts/` holds workspace *seeders*, not tests. They run under jest only
    // because they serialize functions into the page and esbuild's `__name`
    // injection breaks that (see `scripts/seed/costSample.seed.ts`), and they
    // reset a workspace — so a plain `npm run test:e2e` must never collect one.
    // `npm run seed:cost-sample` reaches its seeder by overriding `testMatch`
    // and this list on the command line.
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/scripts/'],
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '\\.puppeteer\\.ts$',
        '/electron/main/mcp/',
        '/src/helpers/puppeteer/',
    ],
    globals: {
       // environment variables available during testing 
    }
  };
};