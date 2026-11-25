import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['.next', 'node_modules', 'mobile', 'packages', 'docs', 'scratch', 'logs']),
  {
    // Web app (Next.js, browser)
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/server/**'],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended],
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules },
    languageOptions: {
      globals: { ...globals.browser, process: 'readonly' },
      parserOptions: { ecmaFeatures: { jsx: true } }
    }
  },
  {
    // API server (Node)
    files: ['server.js', 'src/server/**/*.js', 'tests/**/*.js', '*.config.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node }
  }
]);
