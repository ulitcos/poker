module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.test\\.ts$',
  moduleNameMapper: {
    '^@planning-poker/shared$': '<rootDir>/../../shared/src/index',
  },
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts', '!**/index.ts'],
};
