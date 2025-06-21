// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      // 'import/no-restricted-paths': [
      //   'error',
      //   {
      //     zones: [
      //       {
      //         target: './src/**/domain/**.*ts',
      //         from: './src/**/infra/**/*.ts',
      //       },
      //       {
      //         target: './src/**/domain/**.*ts',
      //         from: './src/**/usecases/**/*.ts',
      //       },
      //       {
      //         target: './src/**/domain/**.*ts',
      //         from: './src/**/app/**/*.ts',
      //       },
      //     ],
      //   },
      // ],
    },
  },
);
