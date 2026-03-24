import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: {
        ...globals.node,  // Only Node.js globals, removed browser
      }
    },
    rules: {
      "no-unused-vars": "off",  // Turn off base rule
      "@typescript-eslint/no-unused-vars": "warn",  // Use TS version
      "no-undefined": "error",
      curly: "error",
      semi: ["error", "always"],
      indent: ["error", 2],
      "object-curly-spacing": ["error", "always"],
      "no-console": "off",  // Fixed typo
    }
  }
];