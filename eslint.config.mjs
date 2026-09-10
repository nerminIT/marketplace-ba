import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

/**
 * Next 16 koristi ESLint flat config.
 *
 * Stari `FlatCompat` most preko "next/core-web-vitals" ovdje puca sa
 * "Converting circular structure to JSON", pa se konfiguracija uvozi
 * direktno iz `eslint-config-next/core-web-vitals`.
 */
const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
