export default {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!server.js'
  ],
  coverageReporters: ['text', 'lcov', 'json', 'html'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
  verbose: true,
  testTimeout: 5000,
  transform: {}
};
