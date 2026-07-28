import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import nodePlugin from 'eslint-plugin-n';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
	{ ignores: ['coverage/**', 'dist/**', 'node_modules/**', '**/*.min.js', '**/*.map', '**/*.snap'] },
	js.configs.recommended,
	{
		files: ['**/*.ts', '**/*.js'],
		languageOptions: {
			globals: { ...globals.node },
			parser: tsParser,
			parserOptions: {
				project: './tsconfig.json',
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			n: nodePlugin,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			'n/no-callback-literal': 'error',
			'n/no-deprecated-api': 'error',
			'n/no-unsupported-features/es-builtins': 'error',
			'n/prefer-global/buffer': 'error',
			'n/prefer-global/console': 'error',
			'n/prefer-global/process': 'error',
			'n/prefer-global/url': 'error',
			'n/prefer-global/url-search-params': 'error',
			'n/prefer-promises/dns': 'error',
			'n/prefer-promises/fs': 'error',
		},
	},
	prettierConfig,
];
