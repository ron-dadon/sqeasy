module.exports = {
  env: {
    node: true,
    es6: true
  },
  plugins: ['jest'],
  extends: [
    'eslint:recommended',
    'plugin:jest/recommended'
  ],
  parserOptions: {
    ecmaVersion: 2020
  }
}
