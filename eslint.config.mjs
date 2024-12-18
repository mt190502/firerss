import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

export default [
    ...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
    {
        plugins: {
            '@typescript-eslint': typescriptEslint,
        },

        ignores: ['node_modules', 'dist', 'build', 'database', 'eslint.config.mjs', '**/webpack**'],

        languageOptions: {
            globals: {
                ...globals.node,
            },

            parser: tsParser,
            parserOptions: {
                projectService: true,
                project: ['./tsconfig.json', './chromium/tsconfig.json', './firefox/tsconfig.json'],
            },
            ecmaVersion: 'latest',
            sourceType: 'module',
        },

        rules: {
            'arrow-spacing': [
                'warn',
                {
                    before: true,
                    after: true,
                },
            ],
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'function',
                    format: ['camelCase', 'PascalCase'],
                },
                {
                    selector: 'variable',
                    format: ['snake_case'],
                },
                {
                    selector: 'variable',
                    types: ['function'],
                    format: ['camelCase', 'PascalCase'],
                },
                {
                    selector: 'variable',
                    modifiers: ['exported'],
                    format: ['PascalCase'],
                },
                {
                    selector: 'parameter',
                    format: ['snake_case'],
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    vars: 'all',
                    varsIgnorePattern: '^(?:[a-z]+[A-Z][a-z0-9]*|[A-Z][a-z0-9]*)([A-Z][a-z0-9]*)*$',
                    args: 'after-used',
                    caughtErrors: 'none',
                    ignoreRestSiblings: true,
                },
            ],
            'no-restricted-syntax': [
                'error',
                {
                    selector: 'CallExpression[callee.property.name="forEach"]',
                    message: 'Using "forEach" is not allowed. Please use "for...of" or a regular loop.',
                },
            ],
            'comma-spacing': [
                'error',
                {
                    before: false,
                    after: true,
                },
            ],
            'comma-style': 'error',
            curly: ['error', 'multi-line', 'consistent'],
            'dot-location': ['error', 'property'],
            'handle-callback-err': 'off',
            indent: [
                'error',
                4,
                {
                    SwitchCase: 1,
                },
            ],
            'keyword-spacing': 'error',
            'linebreak-style': ['error', 'unix'],
            'max-nested-callbacks': [
                'error',
                {
                    max: 4,
                },
            ],
            'max-statements-per-line': [
                'error',
                {
                    max: 2,
                },
            ],
            'no-console': 'off',
            'no-empty-function': 'error',
            'no-explicit-any': 'off',
            'no-floating-decimal': 'error',
            'no-inline-comments': 'error',
            'no-multiple-empty-lines': [
                'error',
                {
                    max: 2,
                    maxEOF: 1,
                    maxBOF: 0,
                },
            ],
            'no-multi-spaces': 'error',
            'no-prototype-builtins': 'off',
            'no-shadow': [
                'error',
                {
                    allow: ['err', 'resolve', 'reject'],
                },
            ],
            'no-trailing-spaces': 'error',
            'no-unused-vars': 'off',
            'no-var': 'error',
            'object-curly-spacing': ['error', 'always'],
            'prefer-arrow-callback': 'error',
            'prefer-const': 'error',
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'space-before-blocks': 'error',
            'space-before-function-paren': [
                'error',
                {
                    anonymous: 'never',
                    named: 'never',
                    asyncArrow: 'always',
                },
            ],
            'spaced-comment': 'error',
            'space-infix-ops': 'error',
            'space-in-parens': 'error',
            'space-unary-ops': 'error',
            yoda: 'error',
        },
    },
];
