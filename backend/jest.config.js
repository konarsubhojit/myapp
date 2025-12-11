/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    // Map imports with .js extension to the actual file
    // Only apply to our source files (starting with ./ or ../)
    '^(\\.\\.?/.+)\\.js$': '$1'
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!jest.config.js',
    '!**/*.test.js',
    '!**/*.test.ts',
    '!**/*.spec.js',
    '!**/*.spec.ts',
    '!server.ts'
  ],
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  testMatch: ['**/__tests__/**/*.js', '**/__tests__/**/*.ts', '**/*.test.js', '**/*.test.ts', '**/*.spec.js', '**/*.spec.ts'],
  verbose: true,
  testTimeout: 5000,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        isolatedModules: true
      }
    }]
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node']
};
