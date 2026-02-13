# 🚀 AI Assistant Feature Implementation Plan

## Objective

Implement an AI Assistant feature into the existing music streaming
application **without affecting any existing functionality**.

------------------------------------------------------------------------

## ⚠️ Important Development Rule

The project already contains **proven and production-stable logic**,
including:

-   Google Drive song fetching logic
-   Deezer metadata fetching
-   Preview caching system
-   Shared song chat bubble system
-   Player state management
-   Navigation handling

### ✅ Mandatory Instruction:

Before creating any new logic: 1. **Thoroughly scan the entire project**
2. Reuse any existing usable logic 3. Extend existing modules when
possible 4. Only create new logic if absolutely necessary

Do NOT duplicate or rewrite working systems.

------------------------------------------------------------------------

## 🧠 AI Integration

### Engine

Use **Google Gemini API** as the AI backend.

### Requirements

-   Context-aware responses
-   History-based replies
-   Structured song recommendation format

Gemini logic must be implemented as a **separate service layer** to
maintain modular architecture.

------------------------------------------------------------------------

## 🎨 Frontend Behavior

### Navigation Interaction

When user clicks the **AI Chat button in Navbar**:

-   Replace the **Now Playing section** dynamically with the AI Chat
    interface.
-   Do NOT reload the page.
-   Keep music player running in background.
-   Maintain all existing state management logic.

### Chat UI Requirements

-   Load previous conversation if exists.
-   If no history → show welcome message.
-   Use chat bubble format.
-   AI messages and user messages clearly separated.
-   Smooth UI transitions.
-   Reuse existing shared-song bubble UI if applicable.

------------------------------------------------------------------------

## 💾 Conversation Storage (MongoDB / Mongoose)

### Requirements

-   Store chat history per authenticated user.
-   Load history when AI chat opens.
-   Send previous messages as context to Gemini.
-   Maintain efficient schema structure.

### Important:

Check if any existing schema pattern can be reused before creating a new
model.

------------------------------------------------------------------------

## 🎵 Song Recommendation Logic

### Gemini Pre-Prompt Requirement

When recommending songs, Gemini MUST return songs in this structured
format:

`<song>`{=html} Title: Song Name Artist: Artist Name `</song>`{=html}

Multiple songs can repeat this structure.

------------------------------------------------------------------------

## 🔎 Backend Processing

1.  Use **Regex** to extract:
    -   Song Title
    -   Artist Name
2.  Use existing Deezer API integration to fetch:
    -   Song metadata
    -   Preview URL
3.  Store preview URL in cache (reuse existing caching logic if
    available).

------------------------------------------------------------------------

## 🎧 Playback Logic

When user clicks Play on AI-recommended song:

1.  Check if full song exists in Google Drive.
    -   If yes → Fetch using existing Drive logic.
2.  If not:
    -   Instantly play cached Deezer preview.
    -   No delay in playback.
    -   Bottom player UI must update correctly.

### Important:

Reuse existing Drive fetching logic and playback state system.

------------------------------------------------------------------------

## ⚙️ Technical Constraints

-   Do NOT break:
    -   Existing player system
    -   Shared song functionality
    -   Navigation behavior
    -   Caching logic
-   Keep implementation modular.
-   Add proper error handling for:
    -   Gemini API failures
    -   Deezer API failures
    -   Drive fetch failures

------------------------------------------------------------------------

## 🎯 Expected Outcome

-   Fully integrated AI Assistant
-   History-aware intelligent responses
-   Structured song recommendation system
-   Seamless playback fallback logic
-   Clean UI switching between Now Playing and AI Chat
-   Zero regression in existing features

------------------------------------------------------------------------

## ✅ Final Reminder

Before writing any new logic: - Audit the entire project. - Identify
reusable modules. - Extend instead of rewriting. - Maintain
architectural consistency.
