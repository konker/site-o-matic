'use strict';

module.exports = {
  verbose: true,
  notify: false,
  bail: false,
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts'],
  coverageReporters: ['lcov', 'text', 'text-summary'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  coveragePathIgnorePatterns: [
    // Non logic directories
    'node_modules',
    '.package',
    '.serverless',
    '.tmp',
    '.temp',
    'webpack',
    'coverage',
    'dist',
    'logs',
    'node_modules',
    'jest.setupEnvironment.js',
    'scripts',
    'test/mocks',
    'system/aws/.cdk*.out',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
    },
  },
  testMatch: ['**/test/test-unit/**/*.(js|ts)', '**/*.test.(js|ts)'],
  testPathIgnorePatterns: ['(^|.)sample.(js|ts)'],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  moduleFileExtensions: ['js', 'ts', 'json', 'node'],
  testRunner: 'jest-circus/runner',
};
