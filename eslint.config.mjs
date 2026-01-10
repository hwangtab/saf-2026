import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const nextConfig = require('eslint-config-next/core-web-vitals');

/** @type {import('eslint').Linter.Config[]} */
const config = [
    ...nextConfig,
    {
        rules: {
            "react/no-unescaped-entities": "error",
            "react/display-name": "error",
            "@next/next/no-html-link-for-pages": "error",
            "no-console": ["warn", { allow: ["error", "warn"] }]
        }
    },
    {
        ignores: ["scripts/*"]
    }
];

export default config;
