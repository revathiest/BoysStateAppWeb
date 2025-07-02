module.exports = [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "public/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs'
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
    }
  }
];
