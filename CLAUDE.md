# Commands
- start: npx expo start
- ios: npm run ios
- android: npm run android
- install: npx expo install
- typecheck: npx tsc --noEmit

# Project Architecture
- Framework: Expo SDK 54 (React Native 0.81)
- Language: TypeScript (Prefer .tsx/.ts for new files)
- Navigation: React Navigation v7 (Stack & Bottom Tabs)
- Backend: Supabase (Auth, Database, Storage)
- State/Async: Use standard React hooks + Supabase client
- Source Directory: ./src (Keep all new components/screens here)

# Code Style Guidelines
- Use React Functional Components with TypeScript interfaces.
- Use `StyleSheet.create` for static styles.
- **Animations:** Prefer `react-native-reanimated` (v3) and `moti` for all UI animations.
- Icons: Use `lucide-react-native` or `@expo/vector-icons`.
- Formatting: Ensure code is clean and readable.

# Critical Rules
- **Dependency Management:** ALWAYS use `npx expo install` to install libraries (ensures version compatibility).
- **Navigation:** We use React Navigation v7. Do NOT mix with Expo Router syntax.
- **Safety:** Always add error handling (try/catch) when calling Supabase or async functions.
- **Context:** Before editing a file, always READ it first to understand existing logic.