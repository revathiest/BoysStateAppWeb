module.exports = {                               // Use ts-jest for TypeScript support
  testEnvironment: 'node',                           // Use Node environment
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],     // Look for .spec or .test files
  roots: ['<rootDir>/test'],                         // Only look for tests in /test
  moduleFileExtensions: ['js', 'json', 'ts', 'tsx'], // Allow both JS and TS
  moduleDirectories: ['node_modules', '<rootDir>'],  // Support for absolute imports from root
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock static style imports
  },

  // === COVERAGE SETTINGS ===
  collectCoverage: true,                              // Always gather coverage
  coverageDirectory: 'coverage',                      // Output folder
  coverageReporters: ['text', 'lcov'],                // Console + HTML
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!**/node_modules/**',
    '!**/__mocks__/**'
  ],
    coverageThreshold: {
      global: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },

  // === OUTPUT SETTINGS ===
  verbose: false,     // Minimal output
  silent: true,
  reporters: ['default'],
};
