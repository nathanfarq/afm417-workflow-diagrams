# Quick Notes - Process Builder V2

## Recent Changes

### 2025-11-18: Updated System Prompt Strategy

**Change**: Modified AI conversation approach to generate diagrams immediately on first prompt

**Previous behavior**:
- AI would ask clarifying questions BEFORE generating any diagram
- User had to answer questions first before seeing visual output
- This was inconvenient and slowed down the workflow

**New behavior**:
- AI generates complete JSON diagram immediately from first user description
- Makes intelligent inferences and reasonable assumptions
- Displays brief text summary in chat (actors, flow, controls, risks)
- THEN asks 2-4 focused follow-up questions to refine the diagram
- Subsequent responses update the diagram based on user answers

**Implementation**:
- Updated `supabase/functions/openai-chat-v2/index.ts` system prompt
- Added "CRITICAL: Always generate JSON first, then ask questions" rule
- Added "CRITICAL FORMATTING RULE" to keep chat concise (no full JSON in text)
- Redeployed Edge Function to production

**User Experience**:
- Users see a diagram immediately on first message
- Can iterate and refine through conversation
- Much faster and more intuitive workflow

**Files Modified**:
- `supabase/functions/openai-chat-v2/index.ts` (lines 19-154)

**Status**:  Deployed to production Supabase
