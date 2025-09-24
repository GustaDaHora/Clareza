import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: ['dist', 'node_modules', 'coverage', 'src-tauri/target/**', 'eslint.config.js'],
  },
  {
    languageOptions: { globals: globals.browser },
  },
  ...tseslint.configs.recommended,
  {
    ...pluginReactConfig,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
      'react/react-in-jsx-scope': 'off',
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];
