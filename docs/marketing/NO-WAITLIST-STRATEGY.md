# Commit App - Waitlistなし戦略（調整版）

**前提**: Xアカウント作成済み、Waitlistなしで8週間キャンペーン実行
**調整内容**: CTA（Call to Action）をWaitlist → DM/Follow/TestFlightに変更

---

## 🔄 主要な変更点

### 変更1: Bio（Xプロフィール）

#### ❌ 元のBio（Waitlist版）
```
Building Commit. Turn reading goals into reality. Failed? Your money becomes a child's learning. 🚀 Beta launching soon.
```

#### ✅ 調整後のBio（Waitlistなし版）
```
Building Commit. Turn reading goals into reality. Failed? Your money becomes a child's learning. 🚀 Follow the journey.
```
**変更**: "Beta launching soon" → "Follow the journey"
**理由**: Waitlistがないので、「旅についてきて」という軽いCTAに変更

---

### 変更2: ウェブサイトリンク

#### オプションA: GitHubリポジトリ
```
https://github.com/kg_xxx/commit-app
```
**メリット**: Build in Publicの透明性を示す、開発進捗が見える

#### オプションB: 既存Web Portal（もし公開されていれば）
```
https://commit-app-web.vercel.app
```

#### オプションC: リンクなし
- 空欄のままでもOK
- Beta Launch時（Day 47）にTestFlightリンクに変更

**推奨**: オプションA（GitHub） → 透明性が高く、#buildInPublicと相性良い

---

### 変更3: CTA（投稿内のCall to Action）

#### Week 1-4: Build in Public重視

| 元のCTA | 調整後のCTA |
|---------|-------------|
| "Join waitlist: [link]" | "Follow for updates 📲" |
| "Not on the list yet?" | "Follow the journey 🚀" |
| "Sign up for early access" | "DM me if you want beta access" |

#### Week 5-6: Beta Announcement調整

**Day 29（Beta Announcement）の変更**:

❌ **元の投稿**:
```
🚀 BIG NEWS 🚀

Commit Beta launches in 3 weeks.

Join the waitlist today for:
✅ Lifetime 50% off subscription
✅ Exclusive beta access
✅ Founder badge in app

[WAITLIST_LINK]
```

✅ **調整後**:
```
🚀 BIG NEWS 🚀

Commit Beta launches in 3 weeks.

Want early access?
✅ DM me your email
✅ First 50 testers get lifetime 50% off
✅ Founder badge in app

Limited spots. DM now 📩

#betatesting #buildinpublic
```

**変更点**:
- Waitlistリンク → DM誘導
- 「限定50人」で希少性を演出
- DMで直接管理（手動だが小規模なら問題なし）

#### Week 7: Beta Launch Day（Day 47）

❌ **元の投稿**:
```
🚀 Commit Beta is LIVE 🚀

Download TestFlight: [TESTFLIGHT_LINK]
Or join waitlist: [WAITLIST_LINK]
```

✅ **調整後**:
```
🚀 Commit Beta is LIVE 🚀

Download TestFlight: [TESTFLIGHT_LINK]

First 100 users get:
✅ Lifetime 50% off
✅ Founder badge
✅ Direct feedback channel

DM me if link doesn't work 📩

#launch #buildinpublic #betatesting
```

**変更点**:
- Waitlistリンク削除
- TestFlightリンク一本化
- DMをフォールバック手段として残す

---

### 変更4: 成功指標（KPI）

#### ❌ 元のKPI
| Week | Followers | Waitlist Signups |
|------|-----------|------------------|
| 2 | 100 | 0 |
| 4 | 300 | 0 |
| 6 | 500 | 50 |
| 8 | 1000 | 200 |

#### ✅ 調整後のKPI
| Week | Followers | DM Beta Requests | TestFlight Installs |
|------|-----------|------------------|---------------------|
| 2 | 100 | 0 | 0 |
| 4 | 300 | 0 | 0 |
| 6 | 500 | 20 | 0 |
| 8 | 1000 | 50 | 30 |

**新指標**:
- **DM Beta Requests**: DMでベータアクセス希望者数（Week 5-6から）
- **TestFlight Installs**: 実際のインストール数（Week 7から）

**トラッキング方法**:
- DMリクエスト: 手動でスプレッドシートに記録
- TestFlight: App Store Connectのアナリティクスで確認

---

## 📋 調整後のコンテンツ例

### Day 1: Origin Story（変更なし）

Origin Storyはそのまま使用可能。最後のCTAだけ変更:

❌ **元**:
```
[8/8] Beta launching in 8 weeks.

Join the waitlist for lifetime 50% off:
[WAITLIST_LINK]

Follow @[YOUR_HANDLE] for build-in-public updates.
```

✅ **調整後**:
```
[8/8] Beta launching in 8 weeks.

Follow @[YOUR_HANDLE] for:
• Build-in-public updates daily
• Behind-the-scenes development
• Early beta access (DM me)

Let's turn those unread books into assets. 📚🔥

#buildinpublic #indiehacker #reading
```

---

### Day 29: Beta Announcement（大幅変更）

✅ **調整後の完全版**:
```
🚀 BIG NEWS 🚀

Commit Beta launches in 3 weeks (Feb 17).

Want early access?

💎 Limited to first 50 testers
✅ Lifetime 50% off subscription
✅ Exclusive Founder badge
✅ Direct line to dev team

📩 DM me your email to reserve your spot.

First come, first served.

#betatesting #indiehacker #productlaunch

[Image: Dashboard screenshot]
```

**フォローアップ投稿（Day 30）**:
```
Update on beta signups:

12 DMs in 24 hours! 🔥

38 spots left for early access.

If you want in:
📩 DM me "COMMIT BETA" + your email

Beta drops Feb 17. 3 weeks away.

#buildinpublic
```

---

### Day 47: Beta Launch Day（変更）

✅ **調整後**:
```
🚀 Commit Beta is LIVE 🚀

8 weeks of building in public. Today we launch.

📱 Download now:
iOS TestFlight: [TESTFLIGHT_LINK]

🎁 First 100 users get:
✅ Lifetime 50% off
✅ Founder badge in app
✅ Priority support

Thread on what Commit does and why it matters 👇

[2/8] The Problem:

You have unread books. So do I. So does everyone.

We buy books with great intentions. Life gets busy. Books collect dust.

The average person has 17 unread books.

[続く...]

#launch #buildinpublic #betatesting #indiehacker #reading
```

---

## 🛠️ Beta Tester管理（Waitlistなし）

### ツール: Google Sheets手動管理

**スプレッドシート構成**:

| Timestamp | Twitter Handle | Email | Status | TestFlight Sent? | Notes |
|-----------|----------------|-------|--------|------------------|-------|
| 2026-02-01 10:30 | @user1 | user1@email.com | Pending | No | Week 5 DM |
| 2026-02-01 11:15 | @user2 | user2@email.com | Approved | Yes | Sent 2/3 |

**ステータス**:
- **Pending**: DM受信、まだ承認していない
- **Approved**: ベータアクセス承認済み
- **TestFlight Sent**: TestFlightリンク送信済み
- **Installed**: 実際にインストール確認

**管理手順**:
1. DMが来たら → スプレッドシートに記録
2. Week 6終了時（Day 42） → 全員に一斉DMでTestFlight招待準備完了を通知
3. Day 47（Launch Day） → TestFlightリンクを一斉DM
4. 随時フォローアップ

---

## 📊 Waitlistなしのメリット・デメリット

### ✅ メリット

1. **セットアップ不要**: Tally Forms不要、今すぐ開始可能
2. **直接コミュニケーション**: DMでユーザーと1:1関係構築
3. **柔軟性**: ベータテスター数を動的に調整可能
4. **親密性**: 小規模コミュニティ形成に最適（50-100人）

### ❌ デメリット

1. **手動管理**: DMの返信、スプレッドシート更新が必要
2. **スケールしにくい**: 100人超えると管理困難
3. **自動化不可**: メール自動送信などができない
4. **データ収集制限**: "How many unread books?"等の事前アンケート不可

### 🎯 推奨：50-100人規模に最適

Waitlistなしは**小規模・高品質なベータテスト**に向いています。
- 目標: 50 DM requests → 30 TestFlight installs
- 管理可能な範囲で、ユーザーとの距離が近い

---

## 🚀 今日やること（調整版）

### ✅ Task 1: Xプロフィール最終確認（30分）

**チェックリスト**:
- [ ] Bio確認:
  ```
  Building Commit. Turn reading goals into reality. Failed? Your money becomes a child's learning. 🚀 Follow the journey.
  ```

- [ ] ウェブサイトリンク設定:
  - 推奨: `https://github.com/kg_xxx/commit-app`
  - または空欄

- [ ] プロフィール写真・ヘッダー画像確認
  - あればOK、なければ次のタスクで作成

- [ ] モバイル確認（iPhoneで見栄えチェック）

---

### ✅ Task 2: プロフィール画像作成（1時間）※まだの場合

#### 簡単オプション: Figmaで"C"レターマーク作成

**手順**:
1. Figma開く → 新規ファイル
2. Frame作成（400×400px）
3. Circle描画 → 塗りつぶし `#FF6B35`（オレンジ）
4. Text "C" → フォント: SF Pro Display Bold, 200pt, 白色
5. 中央配置
6. Export → PNG → プロフィール写真にアップロード

**所要時間**: 15分

---

### ✅ Task 3: Origin Story執筆（2時間）

**テンプレート**: `docs/marketing/post-templates.md` Template 1

**変更点**: 最後の[8/8]ツイートだけ調整

✅ **調整後バージョン**:
```
[8/8] Beta launching in 8 weeks.

Follow @[YOUR_HANDLE] for:
• Daily build-in-public updates
• Behind-the-scenes development
• Early beta access (DM me when ready)

Let's turn those unread books into assets. 📚🔥

#buildinpublic #indiehacker #reading
```

**その他の[1/8]〜[7/8]**: 変更なし、テンプレートそのまま使用

**プレースホルダー変更**:
- `[YOUR_HANDLE]` → 実際のTwitterハンドル（例: `@CommitApp`）
- `[WAITLIST_LINK]` → 削除（DMベースなのでリンク不要）

---

### ✅ Task 4: Week 1投稿準備（1時間）

**Day 3（Poll）**: 変更なし
```
Quick poll for book lovers 📚

How many UNREAD books do you currently own?

Be honest 👇

[Poll]
• 1-5 books
• 6-10 books
• 11-20 books
• 20+ books

#reading #booklovers #tsundoku
```

**Day 6（Screenshot）**: 変更なし（CTAなし）

**Day 8（Tech Stack）**: 変更なし（CTAなし）

---

## 📅 調整後のタイムライン

| Day | タスク | CTA |
|-----|--------|-----|
| **今日** | Xプロフィール確認 + Origin Story執筆 | Follow |
| **明日** | Week 1投稿準備 + スクリーンショット | Follow |
| **Day 1** | 🚀 Origin Story投稿 | Follow |
| **Day 29** | Beta Announcement | DM me |
| **Day 47** | 🚀 Beta Launch | TestFlight |

---

## 🎯 今すぐやること（優先順位）

### 1. Xプロフィール確認（10分）
- [ ] Bioが調整後バージョンか確認
- [ ] ウェブサイトリンクをGitHubに設定（または空欄）

### 2. プロフィール画像がなければ作成（30分）
- [ ] Figmaで"C"レターマーク作成
- [ ] または既存ロゴを使用

### 3. Origin Story執筆（2時間）
- [ ] `post-templates.md` Template 1をコピー
- [ ] [8/8]ツイートをWaitlistなし版に変更
- [ ] `[YOUR_HANDLE]`を実際のハンドルに置換

### 4. Notion/Google Docsにコンテンツバンク作成（30分）
- [ ] Week 1-2の投稿をすべてコピー
- [ ] 日付・時間を記入
- [ ] 投稿管理シート作成

---

## ✅ 今日のゴール

```
3時間で以下を完了:
✓ Xプロフィール完璧（Waitlistなしバージョン）
✓ Origin Story完成（Day 1投稿準備）
✓ Week 1投稿準備
→ Day 1ローンチ準備80%完了！
```

---

## 📩 Beta Tester管理テンプレート

### DM返信テンプレート（Week 5-6）

**ユーザーがDMで「Beta access希望」と送ってきた場合**:

```
Thanks for your interest in Commit Beta! 🙏

You're on the list. #[番号] of 50 early testers.

Beta launches Feb 17 (3 weeks).

I'll DM you the TestFlight link on launch day.

In the meantime, any questions about the app?

- [Your Name]
```

### TestFlight招待DM（Day 47）

```
🚀 Commit Beta is LIVE!

Thanks for signing up early. Here's your TestFlight link:

[TESTFLIGHT_LINK]

As an early tester, you get:
✅ Lifetime 50% off subscription
✅ Founder badge in app

Questions? DM me anytime.

Happy reading! 📚

- [Your Name]
```

---

## 🔄 次のステップ

1. ✅ Xプロフィール確認（今すぐ、10分）
2. ✅ Origin Story執筆（今日中、2時間）
3. ✅ Week 1投稿準備（明日、2時間）
4. 🚀 Day 1 LAUNCH（2-3日後）

**次のアクション**: Origin Storyの執筆を開始しましょう！

```bash
# テンプレートを確認
cat docs/marketing/post-templates.md | grep -A 50 "Template 1: Origin Story"
```

質問があればいつでも聞いてください！🚀
