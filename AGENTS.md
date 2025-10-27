# Repository Guidelines

## Project Structure & Module Organization
Source pages live in `app/` using the App Router; group related UI under `components/common`, `components/features`, and `components/ui`. Update campaign copy through typed data objects in `content/`, and keep shared constants or type definitions in `lib/`. Static assets belong in `public/`, global styles in `styles/`, and product documentation or specs in `docs/`.

## Build, Test, and Development Commands
Run `npm install` before the first contribution. Use `npm run dev` for a hot-reloading server at `http://localhost:3000`, `npm run build` to verify the production bundle, and `npm run start` to smoke-test the build output. Guard regressions with `npm run lint`, `npm run type-check`, and `npm run format -- --check` prior to opening a pull request.

## Coding Style & Naming Conventions
Write components in TypeScript with PascalCase file names (for example, `DynamicCounter.tsx`) and prefer co-locating feature-specific assets under their feature folder. Follow Prettier defaults (2-space indent, single quotes disabled by ESLint in JSX) and Tailwind utility-first styling. Keep React components functional, memoize expensive computations, and surface reusable primitives in `components/ui`.

## Testing Guidelines
This project currently relies on linting, type safety, and manual verification. When adding behavior, cover it with React Testing Library tests under `__tests__/` or inline within feature folders. Name test files `<Component>.test.tsx` and assert responsive states using the breakpoints defined in `tailwind.config.ts`. Always rerun `npm run lint` and `npm run type-check` before pushing.

## Commit & Pull Request Guidelines
Match the existing history by starting commit subjects with a concise scope in Korean (e.g., `UI 개선:`, `스타일 개선:`) followed by a brief action. Keep subjects under 72 characters and detail rationale plus screenshots or screen recordings for UI-facing changes in the body. For pull requests, include: 1) What changed and why, 2) Testing evidence (`npm run lint`, `npm run build`), 3) Linked issue or task, and 4) Before/after visuals when layout or styling shifts.

## Environment & Deployment Notes
Copy `.env.local.example` to `.env.local` and provide `NEXT_PUBLIC_KAKAO_MAP_KEY`; analytics keys are optional but must be scoped to the public prefix. Never commit secrets. Vercel triggers deployments on pushes to `main`, so ensure branch builds succeed locally before merging, and watch the generated Preview URL when iterating on UI changes.
