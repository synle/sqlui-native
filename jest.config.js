module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/*+(spec|test).+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^src/(.*)': '<rootDir>/src/$1',
    '^@typespec/ts-http-runtime/internal/(.*)$':
      '<rootDir>/node_modules/@typespec/ts-http-runtime/dist/commonjs/$1/internal.js',
  },
  collectCoverage: true,
  moduleDirectories: ['node_modules', '<rootDir>'],
};
