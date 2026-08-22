import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * The architectural boundary that makes the MVC split structural rather than
 * decorative: `src/model/` must never reach into React, Pixi, or the DOM.
 * If this rule ever starts failing, the architecture is drifting - fix the
 * import, don't relax the rule.
 */
const MODEL_FORBIDDEN = [
  { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'model/ must stay pure: no React.' },
  { group: ['pixi.js', 'pixi.js/*', '@pixi/*'], message: 'model/ must stay pure: no Pixi.' },
  { group: ['zustand', 'zustand/*'], message: 'model/ must stay pure: no UI store.' },
  { group: ['howler', 'idb-keyval'], message: 'model/ must stay pure: no I/O or audio. Go through services/.' },
  { group: ['@/view', '@/view/*', '@/controller', '@/controller/*', '@/bridge', '@/bridge/*', '@/services', '@/services/*'], message: 'model/ must not depend on outer layers.' },
  { group: ['../view/*', '../../view/*', '../controller/*', '../../controller/*', '../bridge/*', '../../bridge/*', '../services/*', '../../services/*'], message: 'model/ must not depend on outer layers.' },
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  // The purity boundary.
  {
    files: ['src/model/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: MODEL_FORBIDDEN }],
      'no-restricted-globals': ['error',
        { name: 'window', message: 'model/ must stay pure: no DOM.' },
        { name: 'document', message: 'model/ must stay pure: no DOM.' },
        { name: 'localStorage', message: 'model/ must stay pure: persist through services/.' },
      ],
    },
  },

  {
    files: ['**/*.test.ts', 'src/view/react/devtools/**/*.tsx'],
    rules: { 'no-console': 'off' },
  },

  // Authoring scripts run under Node, not in the browser.
  {
    files: ['tools/**/*.mjs', 'vite.config.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
);
