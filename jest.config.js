module.exports = {
  roots: ['<rootDir>'],
  testMatch: ['**/*+(spec|test).+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {},
  collectCoverage: true,
  moduleDirectories: ['node_modules', '.'],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig-server.json',
    },
  },
};
