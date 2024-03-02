module.exports = {
  root: true,
  extends: "universe/native",
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  overrides: [
    {
      files: ["*.ts", "*.tsx"],
      rules: {
        "@typescript-eslint/no-shadow": ["error"],
        "no-shadow": "off",
        "no-undef": "off",
        "react/jsx-curly-brace-presence": ["error", "always"],
      },
    },
    {
      files: ["*"],
      rules: {
        quotes: ["error", "double"],
      },
    },
  ],
};
