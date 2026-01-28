# TypeScript Type Check & Auto-fix

TypeScriptの型エラーを検出し、成功するまで自動修正を繰り返す。

## 手順

1. `npx tsc --noEmit` を実行
2. エラーがあれば該当ファイルを読んで修正
3. 成功するまで繰り返す（最大5回）
4. 修正内容をサマリーで報告

## CLAUDE.mdルール適用

修正時は以下のルールを遵守:

- `database.types.ts` 編集時は必ず `Relationships: []` を含める
- `SharedValue` は `react-native-reanimated` から直接import
- Screen propsは `{ route, navigation }: any` パターンを使用
- `expo-image` の source は `null` ではなく `undefined` を使用

## 成功条件

```
Found 0 errors.
```

このメッセージが表示されるまで繰り返す。
