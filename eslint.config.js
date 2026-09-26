import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-backend/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['frontend/web/service-worker.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  {
    files: ['*.{js,ts}', 'backend/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['frontend/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': ['error', { patterns: ['**/backend/**'] }],
    },
  },
  {
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/**',
                'react-dom',
                'react-dom/**',
                'react-native',
                'react-native/**',
                'node:*',
                '**/frontend/**',
                '**/backend/**',
                '**/assets/**',
              ],
              message:
                'Shared production code must remain independent of platforms and presentation.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);
