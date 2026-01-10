# Titan Design System Specification

> Reference: Dark Glass Dashboard UI with Warm Orange Accents
> Last Updated: 2026-01-10

---

## 1. Design Philosophy

**Core Concept:** "Executive Cockpit" - Premium dashboard aesthetic inspired by automotive interfaces (Mercedes MBUX, Porsche) and modern fintech apps.

**Key Principles:**
- **Sunken Glass Tiles** - Cards appear "pressed into" the surface, not floating
- **Warm Ambient Glow** - Orange/amber gradients create depth and warmth
- **Speedometer Typography** - Large, ultra-light numbers for metrics
- **No Hard Borders** - Use shadows and gradients instead of 1px borders

---

## 2. Color Palette

### Base Colors
```
Background Primary:    #050505  (Obsidian Black - deepest layer)
Background Secondary:  #0A0A0A  (Piano Black - elevated surfaces)
Card Background:       #0C0C0C  (Sunken glass base)
Card Background Alt:   #121212  (Slightly elevated cards)
```

### Accent Colors
```
Primary Orange:        #FF6B35  (Main accent - buttons, highlights)
Orange Glow:           rgba(255, 107, 53, 0.08)  (Ambient background)
Orange Active:         rgba(255, 107, 53, 0.15)  (Active states)
Orange Muted:          rgba(255, 107, 53, 0.25)  (Badges)
```

### Status Colors
```
Success Green:         #4CAF50
Warning Orange:        #FF9800
Danger Red:            #FF6B6B
Info Blue:             #4A90E2
```

### Text Colors
```
Primary:               #FAFAFA  (100% - headlines, values)
Secondary:             rgba(255, 255, 255, 0.7)  (body text)
Muted:                 rgba(255, 255, 255, 0.5)  (labels)
Disabled:              rgba(255, 255, 255, 0.3)  (inactive)
```

---

## 3. Typography

### Metric Display (Speedometer Style)
```typescript
// Large metrics (main dashboard values)
mainMetric: {
  fontSize: 42,
  fontWeight: '200',  // Ultra-light
  letterSpacing: -1,
  fontVariant: ['tabular-nums'],
  color: '#FAFAFA',
}

// Medium metrics (secondary stats)
mediumMetric: {
  fontSize: 32,
  fontWeight: '200',
  letterSpacing: -0.5,
  fontVariant: ['tabular-nums'],
}

// Small metrics (card values)
smallMetric: {
  fontSize: 18,
  fontWeight: '300',
  letterSpacing: -0.3,
  fontVariant: ['tabular-nums'],
}
```

### Labels
```typescript
// Section labels (micro-caps style)
sectionLabel: {
  fontSize: 11,
  fontWeight: '500',
  letterSpacing: 0.5,
  color: 'rgba(255, 255, 255, 0.4)',
  textTransform: 'uppercase',
}

// Stat labels (below numbers)
statLabel: {
  fontSize: 12,
  fontWeight: '500',
  letterSpacing: 0.3,
  color: 'rgba(255, 255, 255, 0.5)',
}
```

### Body Text
```typescript
bodyText: {
  fontSize: 14,
  fontWeight: '400',
  lineHeight: 20,
  color: 'rgba(255, 255, 255, 0.7)',
}
```

---

## 4. Component Specifications

### 4.1 Sunken Glass Tile

The signature component - creates "pressed in" glass effect.

```typescript
// Structure:
<View style={container}>
  <LinearGradient ... />  {/* Inner shadow gradient */}
  <View style={content}>
    {children}
  </View>
</View>

// Gradient (top-left to center):
colors={[
  'rgba(0, 0, 0, 0.35)',      // Dark corner (inner shadow)
  'rgba(0, 0, 0, 0.1)',       // Transition
  '#0C0C0C',                  // Base color
  'rgba(255, 255, 255, 0.02)', // Bottom reflection
]}
locations={[0, 0.15, 0.5, 1]}
start={{ x: 0, y: 0 }}
end={{ x: 0.3, y: 1 }}

// Shadow:
shadowColor: '#000000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.8,
shadowRadius: 4,

// Border radius: 20-24px (large, soft corners)
```

### 4.2 Stats Grid Layout

Reference design uses 2-column grid for metrics.

```
┌─────────────────────────┐
│  Main Stat (full width) │  ← Large tile, minHeight: 100
│  ¥8,000                 │
└─────────────────────────┘
┌───────────┐ ┌───────────┐
│     2     │ │     0     │  ← Small tiles, minHeight: 90
│  Active   │ │   Done    │
└───────────┘ └───────────┘
┌───────────┐ ┌───────────┐
│     0     │ │    ¥0     │
│  Failed   │ │  Donated  │
└───────────┘ └───────────┘

Gap between tiles: 12px
Padding horizontal: 20px
```

### 4.3 Activity Matrix (GitHub-style Heatmap)

**Purpose:** 30-day streak visualization

```
Layout: Horizontal strip of squares
┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐
│  │  │  │██│██│  │██│██│██│  │  │██│██│██│██│
└──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘
  ← Older                            Today →

Square size: 16x16px (or proportional to screen)
Gap: 4px
Border radius: 4px

States:
- Inactive:     #1A1A1A (dark grey)
- Active Low:   rgba(255, 107, 53, 0.3)  (dim orange)
- Active Med:   rgba(255, 107, 53, 0.6)  (medium orange)
- Active High:  #FF6B35  (full orange)
- Today:        Border glow effect

Interaction:
- Haptic: ImpactFeedbackStyle.Light on tap
- Animation: Scale 1.0 → 1.1 → 1.0 with spring
```

### 4.4 List Cards (Commitment/Invoice Style)

```
┌─────────────────────────────────────────┐
│ ┌─────┐                                 │
│ │ IMG │  Title Text Here...      ¥5,000 │
│ └─────┘  Subtitle / Meta          29D 23H│
└─────────────────────────────────────────┘

Structure:
- Left: Optional image/icon (40x40, borderRadius: 8)
- Center: Title + subtitle (flex: 1)
- Right: Value + status

Background: Sunken glass gradient
Padding: 16-18px
Border radius: 20px
Gap between cards: 12px
```

### 4.5 Status Badges

```typescript
// Active/Waiting badge
{
  backgroundColor: 'rgba(255, 107, 53, 0.15)',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
}
// Text: #FF6B35, fontSize: 12, fontWeight: '600'

// Success/Delivered badge
{
  backgroundColor: 'rgba(76, 175, 80, 0.15)',
  // Text: #4CAF50
}

// Danger badge
{
  backgroundColor: 'rgba(255, 107, 107, 0.15)',
  // Text: #FF6B6B
}
```

### 4.6 Bottom Tab Bar

```
Background: rgba(0, 0, 0, 0.9) with blur
Height: 80px (including safe area)
Icon size: 24px

States:
- Inactive: rgba(255, 255, 255, 0.4)
- Active: #FF6B35 with glow effect

Active indicator: Small dot below icon (4px)
```

---

## 5. Ambient Glow Effect

Applied to screen backgrounds to create warmth and depth.

```typescript
// Top of screen gradient overlay
<LinearGradient
  colors={[
    'rgba(255, 107, 53, 0.08)',  // Orange glow at top
    'rgba(255, 107, 53, 0.03)',  // Fade
    'transparent',               // To background
  ]}
  start={{ x: 0.5, y: 0 }}
  end={{ x: 0.5, y: 0.6 }}
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_WIDTH * 0.8,
  }}
/>
```

---

## 6. Animation Guidelines

### Micro-interactions
```typescript
// Card press
scale: withSpring(0.98, { damping: 20, stiffness: 200 })

// Button press
scale: withSpring(0.95, { damping: 15, stiffness: 200 })

// Activity block light-up
scale: withSequence(
  withSpring(1.1, { damping: 10 }),
  withSpring(1.0, { damping: 15 })
)
opacity: withTiming(1, { duration: 200 })

// Page transitions
entering: FadeInRight.duration(300)
exiting: FadeOutLeft.duration(200)
```

### Haptic Feedback
```typescript
// Light (activity blocks, toggles)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

// Medium (card taps, confirmations)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Heavy (important actions, completions)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
```

---

## 7. Phase Implementation Guide

### Phase 4.5: Advanced Animation Polish
- Add spring animations to all interactive elements
- Implement staggered list animations (FadeInUp with delay)
- Add skeleton loading states with shimmer effect

### Phase 4.6: Reading DNA
Components needed:
- `ReadingDNACard` - Spotify Wrapped style stat card
- `ReaderTypeDisplay` - Large centered reader type label
- `StatBar` - Horizontal progress bar with gradient fill

### Phase 4.7: Hall of Fame (Netflix-style Library)
Components needed:
- `HeroBookCard` - Large backdrop with blur + book cover
- `HorizontalBookList` - Scrollable row with snap points
- `BookDetailSheet` - Bottom sheet (react-native-bottom-sheet)

### Phase 4.8: Activity Matrix
Components needed:
- `ActivityMatrix` - Horizontal heatmap strip
- `ActivityBlock` - Individual day block with animation

---

## 8. Reference Screenshots Description

### Screenshot 1: Dashboard Overview
- Header: User avatar, name, search/settings icons
- Section title with action button (New invoice)
- Large chart card with gradient fill
- Stats grid (2x2) with large numbers
- Bottom navigation with glow indicator

### Screenshot 2: Report/Analytics
- Header with back button and title
- AI assistant card with pill buttons
- Heatmap calendar (7x4 grid of colored blocks)
  - Dark: inactive
  - Orange shades: activity levels
- Bottom tabs with orange active state

### Screenshot 3: Item Tracking
- Stats cards in 2x2 grid
- Each card has: icon, value, label, trend indicator
- List section with avatar, title, status badge, amount
- Horizontal progress/tracking visualization

---

## 9. Code Examples

### Sunken Glass Tile Implementation
See: `src/components/titan/GlassTile.tsx` (variant="sunken")

### Activity Matrix Base
```typescript
// src/components/titan/ActivityMatrix.tsx
interface ActivityDay {
  date: string;
  level: 0 | 1 | 2 | 3; // 0=inactive, 3=max
}

const BLOCK_SIZE = 16;
const BLOCK_GAP = 4;
const BLOCK_RADIUS = 4;

const levelColors = [
  '#1A1A1A',                    // 0: inactive
  'rgba(255, 107, 53, 0.3)',    // 1: low
  'rgba(255, 107, 53, 0.6)',    // 2: medium
  '#FF6B35',                    // 3: high
];
```

---

## 10. Quick Reference

| Element | Value |
|---------|-------|
| Background | #050505 |
| Card BG | #0C0C0C |
| Orange Accent | #FF6B35 |
| Large Number | 42px, weight 200 |
| Card Radius | 20px |
| Grid Gap | 12px |
| Screen Padding | 20px |

---

*This specification enables CLI-based development without visual references.*
