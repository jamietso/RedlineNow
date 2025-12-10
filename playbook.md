# Playbook Feature - Planning Document

## Vision

The playbook feature should allow users to upload their contract negotiation guidelines (a "playbook") and have the AI automatically suggest edits to the original document based on those rules.

**Example workflow:**
1. User uploads an NDA they received (Original)
2. User uploads their firm's NDA playbook with rules like "Always limit liability to direct damages"
3. User clicks "Apply Playbook"
4. AI analyzes the original against the playbook and generates suggested edits
5. User reviews and accepts/rejects each suggestion
6. Final modified document reflects accepted changes

---

## Current State (What Exists Today)

### Infrastructure
- **Playbook parsing**: `services/playbookService.ts` - parses Word docs into individual rules
- **State management**: `App.tsx` stores `playbookEntries` with localStorage persistence
- **UI**: `PlaybookManager.tsx` - sidebar for uploading, viewing, approving/rejecting rules

### Current (Disabled) Integration
- Approved rules were being passed to AI Summary to flag violations in existing redlines
- This is NOT the intended use case

---

## The UX Challenge

The current app has a clear flow:
```
Original → Modified → Redline Comparison
   ↑           ↑            ↑
 User       User         Auto-generated
 inputs    inputs        from diff
```

The playbook feature needs to INSERT into this flow, but where?

### Option A: Playbook Generates the Modified Document
```
Original → [Apply Playbook] → AI-Generated Modified → Redline
   ↑                              ↑                      ↑
 User                        AI suggestions         Shows what
 inputs                      from playbook          AI changed
```

**Pros:**
- Clean conceptual model
- Redline shows exactly what playbook would change
- User can then manually edit the Modified further

**Cons:**
- What if user already has a Modified document they want to compare?
- Overwrites any existing Modified content

### Option B: Playbook as a "Layer" on Top
```
Original → Modified (manual or AI) → Redline
                                        ↓
                              [Apply Playbook Review]
                                        ↓
                              Suggestions overlay on redline
```

**Pros:**
- Works with existing Modified content
- Non-destructive

**Cons:**
- Complex UI - mixing playbook suggestions with actual redline changes
- Confusing: which changes are from Modified vs from Playbook?

### Option C: Two-Phase Workflow
```
Phase 1: Original → [Apply Playbook] → Playbook Suggestions (accept/reject)
                                              ↓
                                        Modified Document
                                              ↓
Phase 2: Original → Modified → Redline Comparison
```

**Pros:**
- Clear separation of concerns
- Playbook is a "pre-processing" step
- Once suggestions are accepted, it becomes the Modified document

**Cons:**
- Adds complexity to the overall flow
- May confuse users expecting to upload their own Modified

---

## Potential Implementation Approaches

### Approach 1: "Generate Markup" Button
- Add a button in the Original panel: "Generate Markup from Playbook"
- Sends original + approved playbook rules to AI
- AI returns suggested edits as a new Modified document
- Populates the Modified panel with AI-generated content
- User sees redline immediately

**Implementation:**
1. New API endpoint or expand `aiService.ts`
2. Prompt: "Given this contract and these playbook rules, generate a marked-up version"
3. Return full document text (or structured edits)
4. Replace Modified panel content

### Approach 2: Inline Suggestions Mode
- New mode/tab: "Playbook Review"
- Shows original with inline suggestions (like Google Docs suggestions)
- Each suggestion tied to a playbook rule
- Accept/Reject per suggestion
- "Apply All" to generate final Modified

**Implementation:**
1. AI returns structured suggestions: `{ location, original, suggested, rule }`
2. Custom UI to render inline suggestions
3. Track accept/reject state
4. Generate Modified from accepted suggestions

### Approach 3: Hybrid - Playbook Comparison View
- Third comparison mode alongside "Char Level" and "Word Level"
- "Playbook Mode" - shows what playbook WOULD change
- Not a real redline, but a preview
- "Apply to Modified" button to commit changes

---

## Open Questions

1. **Scope of AI edits**: Should AI make actual text changes, or just highlight sections that need attention?

2. **Granularity**: Per-sentence suggestions? Per-paragraph? Or return a fully edited document?

3. **Confidence/Priority**: Should AI indicate which suggestions are most important based on playbook rule priority?

4. **Multiple playbooks**: Support for different playbooks for different contract types (NDA vs MSA vs Employment)?

5. **Conflict with existing Modified**: If user already has Modified content, what happens when they apply playbook?

6. **Undo/History**: How to handle reverting playbook suggestions?

7. **Cost**: AI-generating full document edits could be expensive. Batch processing? Caching?

---

## Recommended Next Steps

1. **User research**: Talk to target users about their actual workflow
2. **Prototype Approach 1**: Simplest to implement, get feedback
3. **Define playbook format**: What makes a good playbook rule? Examples?
4. **Test with real contracts**: Does the AI actually make good suggestions?

---

## Technical Notes

### Existing Code to Leverage
- `parsePlaybook()` in `playbookService.ts` - already parses Word docs
- `PlaybookEntry` type - has `text`, `approved`, `source` fields
- localStorage persistence already working
- Gemini AI integration in `aiService.ts`

### New Code Needed
- `applyPlaybookToDocument(original: string, rules: PlaybookEntry[]): Promise<string>`
- UI for showing/accepting/rejecting suggestions
- State for tracking suggestion accept/reject status

---

*Last updated: December 2025*





