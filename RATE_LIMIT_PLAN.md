# Music Streaming Site -- Rate Limit Plan (Project Version)

## Goal

This project uses free services:

-   Deezer API → previews & metadata\
-   Google Drive → full song streaming\
-   Groq → AI assistant

Since these services have usage limits, this document defines safe
per-user limits to avoid API blocks while keeping the app usable.

This is **not production-grade security**, only basic protection
suitable for a student project.

------------------------------------------------------------------------

## Iron Tier (Default Free Tier)

**Purpose:** lightweight usage with no Drive cost

**Features** - Deezer preview playback only - Song search enabled - AI
assistant access

**Limits** - Preview plays: 20 per day - Search requests:20 per day -
AI messages: 2 per day - No Drive streaming

------------------------------------------------------------------------

## Gold Tier (Basic Streaming Tier)

**Purpose:** allow limited full streaming safely

**Features** - Drive streaming enabled - Deezer previews:30 per day - AI
assistant access

**Limits** - Drive streams: 10 per day - Recommended cooldown: \~1
stream every 2 minutes - AI messages: 5 per day

------------------------------------------------------------------------

## Diamond Tier (Power User Tier)

**Purpose:** heavier usage for active users

**Features** - Drive streaming enabled - Deezer previews:40 per day -
AI assistant extended usage

**Limits** - Drive streams: 50 per day - AI messages: 20 per day -

------------------------------------------------------------------------

## Test Tier (Developer / Internal Use)

**Purpose:** testing features without strict limits

**Features** - Unlimited Deezer previews - Unlimited AI usage - Extended
Drive streaming

**Limits** - Drive streams: 200 per day - Logging enabled for debugging

------------------------------------------------------------------------

## Basic Protection Rules (Simple Version)

Since this is a project, we only apply lightweight controls:


------------------------------------------------------------------------

### Basic Cooldown Protection

Prevent spam clicking:

-   Minimum 5 seconds between search calls
-   Minimum 10 seconds between stream starts

------------------------------------------------------------------------

### Fallback Behaviour

If user exceeds streaming limit:

Show message: "Daily streaming limit reached --- previews still
available."

If AI limit reached:

Show message: "Daily AI limit reached. Try again tomorrow."

------------------------------------------------------------------------

## Summary Table

  Tier      Previews    Streams/day   AI/day
  --------- ----------- ------------- -----------
  Iron      50          No            5
  Gold      Unlimited   20            10
  Diamond   Unlimited   50            20
  Test      Unlimited   200           Unlimited

------------------------------------------------------------------------

