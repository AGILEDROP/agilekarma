/**
 * Custom ESLint configuration.
 *
 * @see https://eslint.org/docs/user-guide/configuring
 * @see https://eslint.org/docs/rules/
 */

"use strict";

module.exports = {
  extends: ["airbnb/base", "airbnb-typescript/base"],
  parserOptions: {
    project: "./tsconfig.json",
  },
};
