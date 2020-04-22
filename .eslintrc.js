module.exports = {
  root: true,
  env: {
    node: true
  },
  globals: {
    "CodeMirror": true
  },
  extends: [
    'plugin:vue/strongly-recommended',
    '@vue/standard'
  ],
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'vue/html-closing-bracket-spacing': 'off',
    'vue/html-closing-bracket-newline': 'off'
  }
}
