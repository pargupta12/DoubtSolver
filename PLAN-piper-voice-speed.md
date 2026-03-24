# Plan: Piper Female Voice and 30% Slower Speed

## Summary

| Change | Implementation |
|--------|-----------------|
| **Female voice** | Use `en_US-amy-medium` (clear female voice) |
| **30% slower** | Set `audio.playbackRate = 0.7` before playback |
| **Android pre-install** | Call `preload()` on app load so model downloads on first launch |

---

## 1. Voice Selection

**Current:** `en_US-hfc_female-medium` (already female)

**Available female voices in Piper:**
- `en_US-hfc_female-medium` (current)
- `en_US-amy-medium` — clear, commonly used for kids
- `en_US-kathleen-low`
- `en_US-kristin-medium`

**Recommendation:** Use `en_US-amy-medium` for a clear girl voice.

---

## 2. 30% Slower Speed

- **Piper:** Set `audio.playbackRate = 0.7` before `audio.play()` (1.0 - 0.3 = 0.7)
- **Web Speech fallback:** Change `utterance.rate = 0.9` to `utterance.rate = 0.7`

---

## 3. File Changes

| File | Change |
|------|--------|
| `src/lib/piper-tts.ts` | 1) `VOICE_ID = "en_US-amy-medium"` 2) Add `audio.playbackRate = 0.7` before `audio.play()` 3) In `speakWithWebSpeechAPI`, set `utterance.rate = 0.7` |
| `src/pages/index.tsx` | (Optional) Call `piperTts.preload()` in `useEffect` on mount for first-launch model download |

---

## 4. Android Pre-Install

**Approach:** Call `preload()` when the app loads. On first install, the model (~5–15 MB) downloads once and is cached. On later runs, Piper uses the cached model—no download.

**Implementation:** Add to `index.tsx`:
```typescript
useEffect(() => {
  piperTts.preload().catch(() => {}); // Background preload, ignore errors
}, []);
```

---

## Implementation Order

1. Update `VOICE_ID` to `en_US-amy-medium` in `piper-tts.ts`
2. Add `audio.playbackRate = 0.7` before `audio.play()` in `piper-tts.ts`
3. Set `utterance.rate = 0.7` in `speakWithWebSpeechAPI` in `piper-tts.ts`
4. (Optional) Add `preload()` on app load in `index.tsx`
