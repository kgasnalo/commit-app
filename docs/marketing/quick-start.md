# Commit App - Marketing Quick Start Checklist

**Purpose**: Complete all preparation tasks before launching the 8-week X (Twitter) campaign.
**Timeline**: Week 0 (complete within 3-7 days before Day 1)
**Status**: ⬜ Not Started | 🔄 In Progress | ✅ Complete

---

## Overview

This checklist covers **5 key areas**:
1. **X (Twitter) Profile Optimization** (1 hour)
2. **Waitlist Setup** (2 hours)
3. **Content Preparation** (4-6 hours)
4. **Visual Assets** (3-5 hours)
5. **Tools & Automation** (1-2 hours)

**Total Estimated Time**: 11-16 hours (can be completed over 3-7 days)

---

## 1. X (Twitter) Profile Optimization

### Profile Setup
- [ ] **Profile Photo**: Upload Commit logo (400 x 400px, PNG)
  - Use high-contrast version (white logo on dark background)
  - Ensure it's recognizable at small sizes (48px x 48px)

- [ ] **Header Image**: Upload Dashboard screenshot or branded graphic (1500 x 500px)
  - Options:
    1. Dashboard screenshot with Titan design
    2. Tagline graphic: "Turn Reading Goals Into Reality"
    3. Feature showcase (Monk Mode + Hall of Fame + Reading DNA)

- [ ] **Username**: Confirm availability (@CommitApp or similar)
  - Check that username is consistent across platforms
  - Reserve username if not already done

- [ ] **Display Name**: "Commit" or "Commit App"
  - Keep it short and searchable

- [ ] **Bio** (160 characters max):
  ```
  Building Commit. Turn reading goals into reality. Failed? Your money becomes a child's learning. 🚀 Beta launching soon.
  ```
  - Alternative (shorter):
  ```
  Turn reading into discipline. Fail? Your money educates kids. Beta soon. 🚀
  ```

- [ ] **Website Link**: Add waitlist URL
  - Format: `commitapp.com/waitlist` or `commit-app-web.vercel.app/waitlist`
  - Use URL shortener with UTM tracking (optional): `bit.ly/commit-waitlist?utm_source=twitter`

- [ ] **Location**: Optional (e.g., "Tokyo, Japan" or "Global")

- [ ] **Pinned Tweet**: Prepare pinned tweet for Day 1
  - Will be the Origin Story thread (see `post-templates.md` Template 1)

### Profile Review
- [ ] View profile on mobile (iOS/Android) to ensure readability
- [ ] Check that all links work
- [ ] Verify profile photo is clear at small sizes
- [ ] Ensure bio communicates value proposition in 5 seconds

**Estimated Time**: 1 hour

---

## 2. Waitlist Setup

### Option A: Tally Forms (Recommended)

- [ ] **Create Tally account**: [tally.so](https://tally.so) (free tier)

- [ ] **Create Waitlist Form**:
  - Form title: "Join the Commit Waitlist"
  - Fields:
    1. Email (required, email validation)
    2. Name (optional)
    3. "How many unread books do you have?" (required, dropdown)
       - Options: 1-5, 6-10, 11-20, 20+
    4. "What motivates you to read?" (optional, checkbox)
       - Options: Self-improvement, Career, Relaxation, Social impact, Other

- [ ] **Design Form**:
  - Use Titan color palette (#1A1008 background, #FF6B35 accent)
  - Add Commit logo at top
  - Add tagline: "Turn Your Reading Goals Into Reality"

- [ ] **Configure Settings**:
  - Enable confirmation message: "You're on the list! We'll email you when beta launches."
  - Enable email notification to admin (your email)
  - Add redirect URL (optional): Redirect to Thank You page on Web Portal

- [ ] **Test Form**:
  - Submit test entry
  - Verify confirmation message displays
  - Check that entry appears in Tally dashboard
  - Test on mobile (iOS/Android)

- [ ] **Copy Form URL**: e.g., `tally.so/r/commit-waitlist`

### Option B: Web Portal Custom Implementation

- [ ] **Create `/waitlist` page** in `commit-app-web` (Next.js)
  - See [Waitlist Page Implementation](#waitlist-page-implementation) below

- [ ] **Deploy to Vercel**:
  ```bash
  cd commit-app-web
  npx vercel --prod --yes
  ```

- [ ] **Test deployed page**: Visit `commit-app-web.vercel.app/waitlist`

### Waitlist Analytics Setup

- [ ] **Google Analytics 4** (optional):
  - Add GA4 tracking to waitlist page
  - Track: Page views, form submissions, bounce rate

- [ ] **UTM Parameters**:
  - Twitter: `?utm_source=twitter&utm_campaign=prelaunch`
  - Indie Hackers: `?utm_source=indiehackers&utm_campaign=prelaunch`
  - Product Hunt: `?utm_source=producthunt&utm_campaign=prelaunch`

**Estimated Time**: 2 hours (Tally) or 4 hours (custom Web Portal)

---

## 3. Content Preparation

### Content Bank (20 Posts)

- [ ] **Copy all templates** from `post-templates.md` to a Notion database or Google Doc

- [ ] **Customize placeholders**:
  - Replace `[YOUR_HANDLE]` with actual Twitter handle
  - Replace `[WAITLIST_LINK]` with actual waitlist URL
  - Replace `[TESTFLIGHT_LINK]` with TestFlight URL (when available)

- [ ] **Prepare Week 1-2 posts** (Days 1-14):
  - [ ] Day 1: Origin Story (EN + JA)
  - [ ] Day 3: Poll (unread books)
  - [ ] Day 5: Data visualization infographic
  - [ ] Day 6: Dashboard screenshot
  - [ ] Day 8: Tech Stack thread
  - [ ] Day 10: Philosophy post (penalty system)
  - [ ] Day 12: Week 2 progress update
  - [ ] Day 13: Monk Mode video/screenshot

- [ ] **Prepare emergency/filler posts** (5 posts):
  - Question posts (3)
  - Micro-win celebrations (2)

- [ ] **Review all posts for**:
  - Typos
  - Hashtag count (3-5 per post)
  - CTA clarity
  - Bilingual versions (EN + JA)

### Content Calendar

- [ ] **Import content calendar** into scheduling tool:
  - Options: Hypefury, Typefully, Buffer, or Notion
  - Format: Date, Time, Content, Hashtags, Media

- [ ] **Set up posting schedule**:
  - Primary posting times:
    - US: 9am-12pm EST (22:00-01:00 JST)
    - JP: 7-9am JST, 12-1pm JST, 8-10pm JST
  - Frequency: 1-2 major posts per day

**Estimated Time**: 4-6 hours

---

## 4. Visual Assets

### Screenshots (10-15 Required)

- [ ] **Prepare seed data** (see `screenshot-guide.md`):
  - [ ] 2-3 active commitments
  - [ ] 2-3 completed commitments
  - [ ] 1 failed commitment (for donation pool)
  - [ ] 7 days of Monk Mode sessions
  - [ ] Reading DNA data (30 days)

- [ ] **Capture Week 1-2 screenshots**:
  - [ ] Dashboard (Day 6)
  - [ ] Monk Mode timer (Day 13)

- [ ] **Capture Week 3-4 screenshots**:
  - [ ] Penalty selection with vignette (Day 17)
  - [ ] Lifeline modal (Day 20)

- [ ] **Organize screenshots**:
  - Folder structure: `/marketing-assets/screenshots/week1-2/`, `/week3-4/`, etc.
  - File naming: `{screen-name}-day{day-number}.png`

- [ ] **Review screenshot quality**:
  - Resolution: 1170 x 2532 (iPhone 15 Pro)
  - Format: PNG (lossless)
  - No personal data visible
  - Status bar clean (no notifications)
  - Titan design visible (warm dark + orange glow)

### Graphics & Infographics (5 Required)

- [ ] **Create infographics** (use Figma or Canva):
  - [ ] "17 unread books" data visualization (Day 5)
  - [ ] Tech stack diagram (Day 8)
  - [ ] Color palette showcase (Day 19)
  - [ ] Room to Read impact map (Day 22)
  - [ ] Before/After UI comparison (Day 55)

- [ ] **Create countdown graphics** (Days 43-46):
  - [ ] "4 days to beta"
  - [ ] "3 days to beta"
  - [ ] "24 hours to beta"

- [ ] **Create celebration graphics**:
  - [ ] Beta launch day graphic (Day 47)
  - [ ] Waitlist milestone graphic (Day 40)

### Demo Videos (3 Main + 5 Snippets)

- [ ] **Film Video 1**: 30-Second Elevator Pitch
  - See `demo-scripts.md` for shot list
  - Duration: 30 seconds
  - Export as: `commit-pitch-30s-v1.mp4`

- [ ] **Film Video 2**: Monk Mode Feature Showcase
  - Duration: 45 seconds
  - Export as: `monk-mode-demo-45s-v1.mp4`

- [ ] **Film Video 3**: Design System BTS (optional, can film later)
  - Duration: 60 seconds
  - Export as: `design-bts-60s-v1.mp4`

- [ ] **Film Snippet Videos** (optional, can film later):
  - Creating a commitment (15s)
  - Barcode scanner (10s)
  - Lifeline extension (15s)
  - Hall of Fame carousel (10s)
  - Reading DNA heatmap (12s)

### Asset Checklist

- [ ] All assets organized in `/marketing-assets/` folder
- [ ] All files named consistently (`{asset-type}-day{day}.{ext}`)
- [ ] All images < 5MB (Twitter limit)
- [ ] All videos < 10MB (optimal for Twitter)

**Estimated Time**: 3-5 hours (screenshots + graphics) + 5-7 hours (videos)

---

## 5. Tools & Automation

### Scheduling Tool (Optional but Recommended)

- [ ] **Choose scheduling tool**:
  - **Hypefury**: $29/month, auto-retweet, thread scheduling
  - **Typefully**: $15/month, clean interface, analytics
  - **Buffer**: Free tier (10 scheduled posts), basic features

- [ ] **Create account** and connect Twitter

- [ ] **Import Week 1-2 posts** (Days 1-14) into scheduler

- [ ] **Test scheduling**: Schedule 1 test post for "in 5 minutes", verify it posts correctly

### Analytics Tool

- [ ] **Twitter Analytics**: Bookmark [analytics.twitter.com](https://analytics.twitter.com)

- [ ] **Google Sheets Dashboard** (optional):
  - Create tracking sheet with columns:
    - Date, Post Content, Impressions, Engagement Rate, Link Clicks, Followers Gained
  - Update weekly (every Friday)

### Notion Content Hub (Recommended)

- [ ] **Create Notion workspace**: "Commit Marketing Hub"

- [ ] **Create pages**:
  - [ ] Content Calendar (synced from `content-calendar.md`)
  - [ ] Post Templates (copied from `post-templates.md`)
  - [ ] Screenshot Checklist (from `screenshot-guide.md`)
  - [ ] Weekly Metrics (KPI tracking table)

- [ ] **Set up weekly reminders**:
  - Friday: Weekly metrics review
  - Monday: Plan upcoming week's content
  - Daily: Post scheduled content + engagement routine

### Backup & Version Control

- [ ] **Backup all marketing assets**:
  - Google Drive or Dropbox folder: "Commit Marketing Assets"
  - Subfolders: Screenshots, Videos, Graphics, Content

- [ ] **Version control for text content**:
  - Commit `docs/marketing/` folder to Git
  - Push to GitHub (private repo if needed)

**Estimated Time**: 1-2 hours

---

## Waitlist Page Implementation (Option B)

If you chose custom Web Portal implementation:

### 1. Create Waitlist Page Component

```bash
cd commit-app-web
mkdir -p app/waitlist
touch app/waitlist/page.tsx
```

### 2. Implement Page (Simplified Example)

```typescript
// app/waitlist/page.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // TODO: Send to database or email service (Resend, SendGrid, etc.)
    // For now, just show success message
    console.log('Waitlist signup:', email)

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#1A1008] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            You're on the list! 🎉
          </h1>
          <p className="text-gray-300">
            We'll email you when Commit beta launches.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1A1008] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h1 className="text-5xl font-bold text-white mb-4">
          Turn Reading Goals Into Reality
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Commit holds you accountable. Fail? Your money becomes a child's learning.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
          <Button
            type="submit"
            className="w-full bg-[#FF6B35] hover:bg-[#FF8555] text-white font-semibold"
          >
            Join Waitlist
          </Button>
        </form>

        <p className="text-sm text-gray-400 mt-4">
          Beta launching soon. Lifetime 50% off for early supporters.
        </p>
      </div>
    </div>
  )
}
```

### 3. Deploy to Vercel

```bash
npx vercel --prod --yes
```

### 4. Test

Visit `commit-app-web.vercel.app/waitlist`

---

## Pre-Launch Final Check

### 24 Hours Before Day 1

- [ ] **Profile Review**:
  - [ ] Profile photo, header, bio are correct
  - [ ] Website link points to waitlist
  - [ ] No typos in bio

- [ ] **Content Ready**:
  - [ ] Day 1 post (Origin Story) is drafted
  - [ ] Week 1 posts (Days 1-7) are scheduled or ready to post
  - [ ] Screenshots for Day 6 are ready

- [ ] **Waitlist Functional**:
  - [ ] Test submission works
  - [ ] Confirmation message displays
  - [ ] You receive email notification

- [ ] **Analytics Tracking**:
  - [ ] Twitter Analytics accessible
  - [ ] Waitlist has UTM parameters
  - [ ] Metrics tracking sheet created

- [ ] **Engagement Plan**:
  - [ ] Identified 10 accounts to engage with on Day 1
  - [ ] Set calendar reminder for 30-min daily engagement routine

### Day 1 Launch

- [ ] **Post Origin Story thread** (8 tweets, see `post-templates.md`)
- [ ] **Pin the first tweet** of the thread
- [ ] **Engage with 10 `#buildinpublic` posts**
- [ ] **Follow 5 indie hackers**
- [ ] **Reply to all comments** on your thread within 1 hour
- [ ] **Track metrics**: Impressions, engagement rate, new followers
- [ ] **Celebrate**: You launched! 🚀

---

## Week 0 Timeline (Suggested)

### Day -7 (Sunday)
- [ ] X profile optimization (1 hour)
- [ ] Waitlist setup (2 hours)

### Day -6 (Monday)
- [ ] Prepare seed data (1 hour)
- [ ] Capture Week 1-2 screenshots (2 hours)

### Day -5 (Tuesday)
- [ ] Copy and customize post templates (2 hours)
- [ ] Create infographics (2 hours)

### Day -4 (Wednesday)
- [ ] Film Video 1 (30s Pitch) (3 hours)
- [ ] Edit Video 1 (2 hours)

### Day -3 (Thursday)
- [ ] Set up scheduling tool (1 hour)
- [ ] Schedule Week 1 posts (1 hour)
- [ ] Create Notion content hub (1 hour)

### Day -2 (Friday)
- [ ] Pre-launch final check (1 hour)
- [ ] Identify engagement targets (30 min)

### Day -1 (Saturday)
- [ ] Rest and mentally prepare
- [ ] Review Day 1 post one last time

### Day 0 (Sunday)
- [ ] 🚀 **LAUNCH** - Post Origin Story thread

---

## Emergency Contacts & Resources

### If Things Go Wrong

**Waitlist Form Broken**:
- Fallback: Tweet "DM me your email to join waitlist" and manually add emails to spreadsheet

**Screenshot Quality Issues**:
- Fallback: Use Figma mockups instead of real screenshots

**Video Not Ready**:
- Fallback: Use static screenshots with text overlays instead of video

**Scheduling Tool Down**:
- Fallback: Post manually using Twitter web/mobile app

**Content Inspiration Dry**:
- Fallback: Use emergency content bank (see `post-templates.md` - Engagement Hooks)

### Resources

- **Content Calendar**: `docs/marketing/content-calendar.md`
- **Post Templates**: `docs/marketing/post-templates.md`
- **Screenshot Guide**: `docs/marketing/screenshot-guide.md`
- **Demo Scripts**: `docs/marketing/demo-scripts.md`
- **Strategy Overview**: `docs/marketing/X-PRELAUNCH-STRATEGY.md`

---

## Success Metrics (Track Weekly)

### Week 0 → Week 1 Goals
- **Followers**: 0 → 50
- **Engagement Rate**: Establish baseline (aim for 0.5%+)
- **Waitlist Signups**: 0 → 10

### Tools for Tracking
- Twitter Analytics: Impressions, engagement rate, profile visits
- Google Sheets: Manual tracking of followers, waitlist signups
- Notion: Weekly review notes

---

## Checklist Summary

**Total Tasks**: 60+
**Estimated Time**: 11-16 hours
**Completion Target**: 3-7 days before campaign launch

### Quick Status Check

- [ ] X Profile Optimized (1 hour)
- [ ] Waitlist Live & Tested (2 hours)
- [ ] Week 1-2 Content Prepared (4-6 hours)
- [ ] Screenshots Captured (3-5 hours)
- [ ] Scheduling Tool Set Up (1-2 hours)

**When all checkboxes are ✅, you're ready to launch! 🚀**

---

**Last Updated**: 2026-01-20
**Next Action**: Start with X Profile Optimization (easiest 1-hour task)
