---
name: i18n-check
description: |
  ja/en/ko 3言語のi18nキー同期を検証し、不足を修正する。
  以下の場合に使用:
  - 新しいUI文言を追加した後
  - 「翻訳漏れ」「ハードコード」の指摘時
  - リリース前の最終チェック
---

# i18n Sync Check

## 手順

1. `src/i18n/locales/` の ja.json, en.json, ko.json を読む
2. 全キーを比較し、片方にしかないキーを検出
3. TSX/TSファイルでハードコード日本語文字列を検索
4. 不足があれば3ファイル全てに追加

## 検証コマンド

```bash
# キー数の確認
jq 'keys | length' src/i18n/locales/ja.json
jq 'keys | length' src/i18n/locales/en.json
jq 'keys | length' src/i18n/locales/ko.json

# ハードコード検出（日本語文字）
grep -r "[\u3040-\u309F\u30A0-\u30FF]" src/**/*.tsx --include="*.tsx" | grep -v "i18n" | grep -v "//"
```

## CLAUDE.mdルール

- `defaultValue` は使用禁止: `i18n.t('key', { defaultValue: '...' })` NG
- 日本語でキー内容を考え、en/ko は適切に翻訳
- 既存キーと重複しないか `grep '"key_name":' src/i18n/locales/` で確認

## 成功条件

- 3ファイルのキー数が一致
- ハードコード日本語文字列が0件
