# Commit App - Screenshot Capture Guide

**Purpose**: Capture high-quality screenshots for X (Twitter) marketing campaign.
**Device**: iPhone 15 Pro (recommended) or iOS Simulator
**Format**: PNG (lossless quality)
**Dimensions**: 1170 x 2532 (iPhone 15 Pro native resolution)

---

## Quick Reference: Screenshot Schedule

| Day | Screen | Purpose | Data Requirements |
|-----|--------|---------|-------------------|
| 6 | Dashboard | First UI teaser | Multiple commitments, donation pool |
| 13 | Monk Mode Timer | Feature showcase | Running timer, book selected |
| 17 | Penalty Selection | Vignette effect | Slider at various positions |
| 20 | Lifeline Modal | Feature reveal | Icy blue theme, cooldown text |
| 27 | Hall of Fame | Netflix-style UI | Multiple completed books |
| 31 | Reading DNA | Heatmap | 30 days of reading data |
| 34 | Barcode Scanner | ISBN lookup | Camera view with barcode overlay |
| 41 | Session Complete | Monk Mode completion | Stats: 45 min, 23 pages, streak |
| 48 | Dashboard Stats | First 24h metrics | 30 users, 45 commitments |
| 55 | Before/After | UI evolution | Week 1 vs Week 8 comparison |

---

## Required Seed Data

Before capturing screenshots, populate the app with realistic test data.

### Test User Profile
```typescript
{
  id: "test-user-001",
  email: "demo@commitapp.com",
  username: "BookWorm",
  subscription_status: "active",
  created_at: "2026-01-01T00:00:00Z"
}
```

### Sample Commitments (Mix of Active and Completed)

#### Active Commitment 1
```typescript
{
  book_title: "Atomic Habits",
  book_author: "James Clear",
  book_cover_url: "https://covers.openlibrary.org/b/id/12345-L.jpg",
  deadline: "2026-02-15",
  pledge_amount: 2000,
  currency: "JPY",
  target_pages: 320,
  pages_read: 180,
  status: "active",
  created_at: "2026-01-10T00:00:00Z"
}
```

#### Active Commitment 2 (Near Deadline)
```typescript
{
  book_title: "Deep Work",
  book_author: "Cal Newport",
  book_cover_url: "https://covers.openlibrary.org/b/id/67890-L.jpg",
  deadline: "2026-01-25", // 5 days away
  pledge_amount: 20,
  currency: "USD",
  target_pages: 280,
  pages_read: 220,
  status: "active",
  created_at: "2026-01-05T00:00:00Z"
}
```

#### Completed Commitment 1
```typescript
{
  book_title: "The Lean Startup",
  book_author: "Eric Ries",
  book_cover_url: "https://covers.openlibrary.org/b/id/11111-L.jpg",
  deadline: "2026-01-15",
  pledge_amount: 1500,
  currency: "JPY",
  target_pages: 336,
  pages_read: 336,
  status: "completed",
  completed_at: "2026-01-14T22:30:00Z",
  created_at: "2025-12-20T00:00:00Z"
}
```

#### Completed Commitment 2
```typescript
{
  book_title: "Zero to One",
  book_author: "Peter Thiel",
  book_cover_url: "https://covers.openlibrary.org/b/id/22222-L.jpg",
  deadline: "2026-01-10",
  pledge_amount: 15,
  currency: "USD",
  target_pages: 224,
  pages_read: 224,
  status: "completed",
  completed_at: "2026-01-09T20:15:00Z",
  created_at: "2025-12-25T00:00:00Z"
}
```

#### Failed Commitment (For Penalty Pool)
```typescript
{
  book_title: "Sapiens",
  book_author: "Yuval Noah Harari",
  book_cover_url: "https://covers.openlibrary.org/b/id/33333-L.jpg",
  deadline: "2026-01-01",
  pledge_amount: 3000,
  currency: "JPY",
  target_pages: 512,
  pages_read: 340,
  status: "failed",
  penalty_charged_at: "2026-01-02T03:00:00Z",
  created_at: "2025-12-01T00:00:00Z"
}
```

### Sample Monk Mode Sessions
```typescript
[
  { date: "2026-01-20", duration: 45, pages: 23 },
  { date: "2026-01-19", duration: 60, pages: 31 },
  { date: "2026-01-18", duration: 30, pages: 15 },
  { date: "2026-01-17", duration: 55, pages: 28 },
  { date: "2026-01-16", duration: 40, pages: 20 },
  { date: "2026-01-15", duration: 50, pages: 26 },
  { date: "2026-01-14", duration: 45, pages: 24 }
]
```

### Donation Pool Data
```typescript
{
  total_donated: 12500, // JPY
  commitments_failed: 4,
  recipient: "Room to Read"
}
```

---

## Screenshot Details

### 1. Dashboard Screen (Day 6)

**File**: `dashboard-day6.png`
**Purpose**: First UI teaser showing Titan design and core layout

**Data Requirements**:
- 2-3 active commitments (various progress levels)
- 1 completed commitment
- Donation pool: ¥12,500
- Today's date visible

**Capture Steps**:
1. Launch app in light mode (iOS Simulator or device)
2. Navigate to Dashboard (HomeTab)
3. Ensure commitments are visible
4. Ensure donation pool card is visible
5. Screenshot: `Cmd+S` (Simulator) or `Volume Up + Side Button` (Device)

**Focal Points**:
- Glassmorphism cards with orange glow
- Warm dark gradient background
- Donation pool with "¥12,500 raised this month"
- Multiple commitment cards showing progress

**Composition**:
- Center the commitment cards
- Ensure top nav bar is visible (logo, streak counter)
- Bottom tab bar should be visible

---

### 2. Monk Mode Timer (Day 13)

**File**: `monk-mode-timer-day13.png`
**Purpose**: Showcase distraction-free reading mode

**Data Requirements**:
- Selected book: "Atomic Habits"
- Timer: 45 minutes (running)
- Current time: ~20 minutes elapsed
- Pages read: 12 pages (displayed on completion)

**Capture Steps**:
1. Navigate to Monk Mode Tab
2. Select "Atomic Habits" from active commitments
3. Set timer to 45 minutes
4. Start session
5. Let timer run for a few seconds to show animation
6. Screenshot during active session

**Focal Points**:
- Circular timer UI (Skia Canvas)
- Book title at top
- Timer display (e.g., "25:34" remaining)
- Pause/Stop buttons at bottom
- Dark immersive background

**Composition**:
- Center the circular timer
- Ensure timer is clearly visible
- Capture during "running" state (not paused)

---

### 3. Penalty Selection with Vignette (Day 17)

**File**: `penalty-vignette-day17.png`
**Purpose**: Show vignette darkening effect as deadline approaches

**Data Requirements**:
- Commitment with deadline 3 days away
- Vignette intensity: ~40% (moderate darkening)
- Penalty amount: ¥2,000 selected

**Capture Steps**:
1. Open CreateCommitment screen
2. Fill in book details (use "Deep Work")
3. Set deadline to 3 days from now
4. Adjust penalty slider to ¥2,000
5. Note the vignette effect at edges
6. Screenshot

**Focal Points**:
- Penalty amount slider
- Currency symbols (¥/$/€/£/₩)
- Vignette darkening at screen edges
- Warning text: "Your commitment will be secured"

**Composition**:
- Center the penalty slider
- Ensure vignette is visible at all 4 corners
- Capture full screen to show darkening effect

---

### 4. Lifeline Modal (Day 20)

**File**: `lifeline-modal-day20.png`
**Purpose**: Reveal emergency deadline extension feature

**Data Requirements**:
- Lifeline available (not used)
- Modal overlay with icy blue theme
- Cooldown text: "Use once per 30 days"

**Capture Steps**:
1. Navigate to CommitmentDetailScreen (any active commitment)
2. Tap "Use Lifeline" button
3. Confirmation modal appears
4. Screenshot the modal

**Focal Points**:
- Icy blue gradient overlay
- Lifeline icon (snowflake or shield)
- Title: "Extend Your Deadline"
- Description: "+3 days extension. Use once per 30 days."
- Confirm/Cancel buttons

**Composition**:
- Center the modal
- Ensure background is slightly blurred
- Modal should be prominent

---

### 5. Hall of Fame (Day 27)

**File**: `hall-of-fame-day27.png` or `.mp4` (video)
**Purpose**: Netflix-style completed books showcase

**Data Requirements**:
- 3-5 completed commitments
- HeroBillboard with first completed book
- Horizontal scroll of remaining books

**Capture Steps**:
1. Navigate to Library Tab → Hall of Fame
2. Ensure multiple completed books are visible
3. For video: Screen record horizontal scroll through carousel
4. For image: Screenshot showing HeroBillboard + 2-3 visible books

**Focal Points**:
- HeroBillboard with book cover + title overlay
- Netflix-style horizontal scroll
- Glass panel badges (pages read, completion date)
- Luxury aesthetic

**Composition**:
- HeroBillboard should take ~40% of screen height
- Show 2-3 books in horizontal scroll below
- Capture full screen with tab bar

**Video Option** (15 seconds):
- Start on HeroBillboard
- Scroll horizontally through 3-4 books
- Pause briefly on second book
- Export as `.mp4`

---

### 6. Reading DNA Heatmap (Day 31)

**File**: `reading-dna-heatmap-day31.png`
**Purpose**: Show reading pattern analysis

**Data Requirements**:
- 30 days of Monk Mode session data
- Heatmap with varied intensity (some days dark, some light)
- "Reader Type" badge: e.g., "Night Owl" or "Morning Lark"

**Capture Steps**:
1. Navigate to Dashboard → Settings → Reading DNA
2. Ensure heatmap is populated with 30 days
3. Reader type badge should be visible
4. Screenshot

**Focal Points**:
- Heatmap grid (7 columns x 4-5 rows)
- Color gradient (light to dark orange)
- Reader type badge at top
- Legend: "Light reads" vs "Deep reads"

**Composition**:
- Center the heatmap
- Ensure all 30 days are visible
- Capture reader type badge

---

### 7. Barcode Scanner (Day 34)

**File**: `barcode-scanner-day34.png` or `.gif`
**Purpose**: Demonstrate ISBN lookup feature

**Data Requirements**:
- Camera permission granted
- Barcode overlay visible
- Sample barcode in frame (use printed book or online image)

**Capture Steps**:
1. Navigate to Library Tab → Add Book → Scan Barcode
2. Point camera at barcode (real book or screen with barcode)
3. Overlay should show scanning frame
4. Screenshot mid-scan OR capture successful lookup

**Focal Points**:
- Camera viewfinder
- Barcode scanning frame overlay
- Instructions: "Align barcode within frame"
- Close button (X) at top

**Composition**:
- Full-screen camera view
- Scanning frame centered
- Ensure barcode overlay is visible

**GIF Option** (3 seconds):
- Record scan → detection → book found animation
- Export as `.gif`

---

### 8. Monk Mode Session Complete (Day 41)

**File**: `session-complete-day41.png`
**Purpose**: Show completion modal with stats

**Data Requirements**:
- Session duration: 45 minutes
- Pages read: 23 pages
- Streak: 7 days
- Book: "Atomic Habits"

**Capture Steps**:
1. Start Monk Mode session with 1-minute timer (for testing)
2. Complete the session
3. Completion modal appears
4. Screenshot the modal

**Focal Points**:
- Celebration animation (confetti or glow)
- Stats: Duration, Pages, Streak
- "Session Complete" title
- Continue Reading / Done buttons

**Composition**:
- Center the modal
- Ensure stats are clearly visible
- Background slightly blurred

---

### 9. Dashboard Stats (Day 48 - Launch Day)

**File**: `dashboard-stats-day48.png`
**Purpose**: Show first 24h beta metrics

**Data Requirements**:
- Total users: 30
- Commitments created: 45
- Pages read: 1,250
- Donation pool: ¥5,000

**Note**: This requires admin dashboard or manually creating a "Stats Card" component for marketing purposes.

**Capture Steps**:
1. Either:
   - Create a temporary "Beta Stats" card in Dashboard
   - OR use Figma to mockup the stats
2. Screenshot

**Focal Points**:
- "First 24 Hours" title
- 4 stat cards: Users, Commitments, Pages, Donations
- Celebration emoji or badge

**Composition**:
- Center the stats cards
- Use Titan design system styling

---

### 10. Before/After UI Comparison (Day 55)

**File**: `before-after-day55.png`
**Purpose**: Show 8-week UI evolution

**Data Requirements**:
- "Before" screenshot: Early prototype (Week 1)
- "After" screenshot: Polished UI (Week 8)

**Capture Steps**:
1. Find early prototype screenshot (from Week 1 development)
2. Capture current polished UI (same screen)
3. Use Figma/Photoshop to create side-by-side comparison
4. Export as single image

**Focal Points**:
- Clear "Before" and "After" labels
- Same screen shown (e.g., Dashboard)
- Arrow or divider between versions

**Composition**:
- Split-screen layout (50/50)
- Ensure both versions are clear
- Use white/orange text labels

---

## Screenshot Capture Best Practices

### Device Settings
```bash
# iOS Simulator (Recommended for consistency)
# Device: iPhone 15 Pro
# iOS Version: 17.0+
# Scale: 100%
# Appearance: Auto (respect system dark mode)
```

### Pre-Capture Checklist
- [ ] Device in dark mode (matches Titan design)
- [ ] Wi-Fi/cellular icon hidden (Airplane mode or Simulator)
- [ ] Battery icon at 100% (or hide status bar)
- [ ] Time set to 9:41 AM (Apple's default)
- [ ] No notifications in status bar
- [ ] App fully loaded (no loading spinners)
- [ ] All text rendered (no font loading delay)

### Image Quality
- **Format**: PNG (lossless)
- **Resolution**: Native device resolution (no downscaling)
- **Compression**: None (keep original quality)
- **Color Space**: sRGB (for X/Twitter compatibility)

### Post-Processing (Optional)
- **Tool**: Figma, Photoshop, or Apple Preview
- **Edits**:
  - Add subtle drop shadow (0px 4px 20px rgba(0,0,0,0.4))
  - Add device frame (iPhone mockup) for polished look
  - Add text annotations (arrows, labels) for feature highlights

### File Naming Convention
```
{screen-name}-day{day-number}.png

Examples:
- dashboard-day6.png
- monk-mode-timer-day13.png
- penalty-vignette-day17.png
- hall-of-fame-day27.mp4 (for videos)
```

---

## Video Capture (Screen Recordings)

### Tools
- **macOS**: Screen Studio ($89, cinematic screen recordings)
- **iOS Simulator**: `xcrun simctl io booted recordVideo output.mp4`
- **Device**: Native iOS screen recording (Control Center → Record)

### Video Specs
- **Format**: MP4 (H.264 codec)
- **Resolution**: 1170 x 2532 (native) → downscale to 1080 x 1920 for X
- **Frame Rate**: 60fps (for smooth animations)
- **Duration**: 15-30 seconds max
- **Audio**: None (silent video)

### Post-Processing
- **Tool**: Final Cut Pro, iMovie, or CapCut
- **Edits**:
  - Trim to 15-30 seconds
  - Add subtle zoom transitions
  - Speed up slow parts (1.5x speed)
  - Add text overlay (feature name, 2-3 seconds)
  - Export as MP4 (1080p, 60fps, H.264)

### Video File Naming
```
{feature-name}-demo-day{day-number}.mp4

Examples:
- monk-mode-demo-day13.mp4
- hall-of-fame-demo-day27.mp4
- barcode-scanner-demo-day34.mp4
```

---

## Screenshot Storage

### Local Storage
```
/Users/kg_xxx/commit-app/marketing-assets/screenshots/
├── week1-2/
│   ├── dashboard-day6.png
│   └── monk-mode-timer-day13.png
├── week3-4/
│   ├── penalty-vignette-day17.png
│   └── lifeline-modal-day20.png
├── week5-6/
│   ├── reading-dna-heatmap-day31.png
│   └── barcode-scanner-day34.gif
├── week7/
│   ├── session-complete-day41.png
│   └── dashboard-stats-day48.png
└── week8/
    └── before-after-day55.png
```

### Cloud Backup (Recommended)
- **Tool**: Google Drive, Dropbox, or iCloud
- **Folder**: `Commit Marketing Assets/Screenshots`
- **Reason**: Prevent data loss, team access

---

## Bulk Screenshot Capture Script (iOS Simulator)

If you need to capture multiple screenshots quickly:

```bash
#!/bin/bash
# screenshot-batch.sh

# List of screens to capture
screens=(
  "Dashboard"
  "MonkMode"
  "CreateCommitment"
  "CommitmentDetail"
  "Library"
  "HallOfFame"
  "Settings"
  "ReadingDNA"
)

# Open Simulator
open -a Simulator

# Wait for boot
sleep 5

# For each screen, navigate and capture
for screen in "${screens[@]}"; do
  echo "Capturing $screen..."

  # Use xcrun to tap specific coordinates (customize per screen)
  # Example: xcrun simctl io booted tap 100 200

  # Wait for screen to load
  sleep 2

  # Capture screenshot
  xcrun simctl io booted screenshot "screenshots/${screen}-$(date +%Y%m%d).png"

  echo "Saved ${screen}.png"
done

echo "All screenshots captured!"
```

**Note**: Customize tap coordinates for your navigation structure.

---

## Screenshot Approval Checklist

Before posting to X, verify:

- [ ] Image is high resolution (no pixelation)
- [ ] Text is readable (font size 14pt+)
- [ ] No personal data visible (emails, real names)
- [ ] Titan design visible (warm dark + orange glow)
- [ ] No UI bugs (misaligned elements, cut-off text)
- [ ] Status bar clean (no notifications)
- [ ] Image matches post description
- [ ] File size < 5MB (X limit)

---

## Quick Reference: X Image Specs

| Aspect Ratio | Dimensions | Use Case |
|--------------|------------|----------|
| **9:16** (Portrait) | 1080 x 1920 | Mobile app screenshots |
| **16:9** (Landscape) | 1920 x 1080 | Desktop UI, infographics |
| **1:1** (Square) | 1080 x 1080 | Profile photo, logo |
| **2:1** (Wide) | 1200 x 600 | Header images |

**Commit App**: Use **9:16 portrait** (mobile screenshots) or **16:9 landscape** (infographics, before/after comparisons).

---

## Notes

- **Consistency**: Use same device/simulator for all screenshots
- **Lighting**: Ensure screen brightness is consistent (100%)
- **Timing**: Capture during "golden state" (no loading, full data)
- **Privacy**: Anonymize any user data in screenshots
- **Backup**: Save all source files (PSD, Figma, videos) for future edits

---

**Last Updated**: 2026-01-20
**Next Action**: Prepare seed data and start capturing Week 1 screenshots
