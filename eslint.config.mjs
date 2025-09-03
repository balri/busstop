import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";
import { defineConfig } from "eslint/config";
import jest from "eslint-plugin-jest";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "public/**/*.min.js",
      "public/**/*.min.css",
    ],
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        SunCalc: "readonly",
      },
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: globals.node,
    },
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,ts,tsx}"],
    plugins: { prettier, "simple-import-sort": simpleImportSort },
    rules: {
      "prettier/prettier": "warn",
      "indent": ["warn", "tab"],
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "no-unused-vars": ["warn", { "args": "all", "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
      globals: globals.node,
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { "args": "all", "argsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.test.json",
        sourceType: "module",
      },
      globals: {
        ...globals.jest,
        ...globals.node,
      },
    },
    plugins: { jest },
    rules: {
      ...jest.configs.recommended.rules,
    },
  },
  prettierConfig,
]);
