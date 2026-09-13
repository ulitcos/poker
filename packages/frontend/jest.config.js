module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  rootDir: 'src',
  testRegex: '.*\\.test\\.ts(x?)$',
  moduleNameMapper: {
    '^@planning-poker/shared$': '<rootDir>/../../shared/src/index',
  },
  collectCoverageFrom: ['**/*.ts', '**/*.tsx', '!**/*.d.ts', '!**/index.ts'],
};
