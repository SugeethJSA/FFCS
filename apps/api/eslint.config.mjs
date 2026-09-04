export default [
  {
    ignores: ["dist/**", "node_modules/**", "prisma/**"],
  },
  {
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { console: "readonly", process: "readonly", Buffer: "readonly" } },
    rules: {},
  },
];
