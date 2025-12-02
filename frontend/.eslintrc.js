module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: ['expo'],
  rules: {
    '@typescript-eslint/no-shadow': ['error'],
    'no-shadow': 'off',
    'no-undef': 'off',
  },
};
