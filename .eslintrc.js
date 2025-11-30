module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    'semi': ['error', 'always'],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'indent': ['error', 2],
    'no-multiple-empty-lines': ['error', { max: 2 }]
  },
  globals: {
    videoEditorAPI: 'readonly'
  }
};
