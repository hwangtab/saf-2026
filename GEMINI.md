
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
