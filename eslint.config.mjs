import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Los parámetros con prefijo "_" se ignoran a propósito (p. ej., firmas de acciones de servidor).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    // Las páginas y layouts de src/app son componentes de servidor: se renderizan una vez por
    // solicitud, por lo que leer la hora actual (Date.now) es correcto y no afecta la pureza.
    files: ["src/app/**/page.tsx", "src/app/**/layout.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "storage/**",
    ".data/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
