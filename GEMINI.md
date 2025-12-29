
# Project Overview

This is the official website for the **SAF(Seed Art Festival) 2026**, a campaign aimed at resolving the financial crisis faced by Korean artists.

- **Framework**: Next.js 14+ (with App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (SSG)
- **State Management**: React Hooks and context

The project is structured to be easily maintainable, with content separated from the code in the `/content` directory. This allows non-developers to update information like the list of participating artists or news articles.

# Building and Running

### Prerequisites
- Node.js 18+
- npm or yarn

### Key Commands

- **Install dependencies:**
  ```bash
  npm install
  ```

- **Run the development server:**
  ```bash
  npm run dev
  ```
  The application will be available at `http://localhost:3000`.

- **Build for production:**
  ```bash
  npm run build
  ```

- **Run the production build locally:**
  ```bash
  npm run start
  ```

# Development Conventions

### Coding Style
- **Formatting**: The project uses **Prettier** for consistent code formatting. Run `npm run format` to format all files.
- **Linting**: **ESLint** is configured for this project. Run `npm run lint` to check for code quality and potential errors.
- **Typing**: The project is written in **TypeScript**. Run `npm run type-check` to ensure type safety.

### Content Management
- Data for dynamic content (e.g., artist lists, news) is stored in TypeScript files within the `/content` directory. To update content, edit the relevant file in this directory.

### Components
- **UI Components**: Reusable, general-purpose UI components are located in `components/ui/`.
- **Feature Components**: More complex components with specific functionalities (like charts or maps) are in `components/features/`.
- **Common Components**: Layout components like the header and footer are in `components/common/`.

### Environment Variables
- Create a `.env.local` file by copying `.env.local.example`.
- This file is necessary for features like Kakao Maps and Kakao sharing.

# Artwork Data Guidelines

작품 데이터(`content/saf2026-artworks.ts`)를 추가하거나 수정할 때 아래 규칙을 따라야 합니다.

### 데이터 검증
```bash
npm run validate-artworks
```
작품 추가 후 반드시 위 명령어를 실행하여 데이터 무결성을 확인하세요.

### 필드별 규칙

| 필드 | 필수 | 형식 | 예시 |
|------|-----|------|------|
| `id` | ✅ | 고유 숫자 문자열 | `"35"` |
| `artist` | ✅ | 작가명 | `"홍길동"` |
| `title` | ✅ | 작품명 | `"무제"` |
| `size` | ✅ | `숫자x숫자cm` 또는 `숫자호` 또는 `"확인 중"` | `"60x45cm"`, `"30호"` |
| `material` | ✅ | 재료명 또는 `"확인 중"` | `"oil on canvas"` |
| `year` | ✅ | `YYYY` 또는 `"확인 중"` | `"2024"` |
| `edition` | - | `"에디션 X/Y"` 또는 빈 문자열 | `"에디션 1/5"`, `""` |
| `price` | ✅ | `₩X,XXX,XXX` | `"₩5,000,000"` |
| `image` | ✅ | 파일명 (public/images/artworks/) | `"35.jpg"` |
| `shopUrl` | ✅ | Cafe24 상품 URL | `"https://koreasmartcoop.cafe24.com/surl/O/55"` |
| `description` | - | 작가 노트 | |
| `profile` | - | 작가 소개 | |
| `history` | - | 작가 이력 | |
| `sold` | - | 판매 완료 시 `true` | `true` |

### 주의사항
- **크기(size)**: 영문 소문자 `x` 사용 (× 사용 금지)
- **빈값**: 정보가 없으면 `"확인 중"` 입력 (빈 문자열 금지)
- **ID**: 중복되지 않는 고유 번호 사용
