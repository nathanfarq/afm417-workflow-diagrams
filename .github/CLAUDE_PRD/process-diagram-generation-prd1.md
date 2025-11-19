
PRD: Process Diagram Generation System Rewrite
Executive Summary
Complete rewrite of the process narrative-to-diagram conversion system. Replace current failing logic with a two-phase approach: (1) conversational JSON schema development using GPT-4o-mini, and (2) automatic Mermaid diagram generation from validated JSON.

Problem Statement
Current system for converting process narratives into flowchart diagrams is unreliable and breaking down in testing. Need fresh implementation that:

Handles ambiguous/incomplete process descriptions
Produces consistent, professional swimlane diagrams
Maintains conversation context across iterations
Updates diagrams reactively as process details are refined


System Architecture
Phase 1: Conversational JSON Builder
Technology: OpenAI GPT-4o-mini API
Interface: Chat UI (React + TypeScript)
Output: Structured JSON schema
Phase 2: Diagram Renderer
Technology: Mermaid.js
Input: Validated JSON from Phase 1
Output: SVG swimlane flowchart

Detailed Requirements
1. Input Processing (Chat Interface)
1.1 Initial Input Acceptance

Accept freeform text: interview transcripts, process notes, bullet points
No strict format requirements - handle narrative style
Support multi-turn refinement conversations

1.2 GPT-4o-mini Conversational Agent
Role Definition:
You are a business process analyst specializing in control documentation. 
Your goal is to extract structured process information through conversation.
Required Behaviors:

Ask clarifying questions about ambiguous steps
Probe for missing information (actors, decision criteria, controls, risks)
Confirm understanding before finalizing each section
Suggest standard process patterns when applicable
Validate logical flow (e.g., "Step 3 references approval, but no approval step exists")

Conversation Flow Pattern:

User provides initial narrative
Agent summarizes understanding
Agent asks targeted questions for gaps
User responds
Agent updates internal JSON model
Repeat if more information is necessary or critical
Agent presents final summary for confirmation
User may provide feedback if summary is incorrect

Example Interaction:
User: "Manager reviews the expense report and decides if it needs more info"

Agent: "I understand there's a decision point where the manager reviews. 
A few questions:
1. What happens if more info IS needed? Who provides it?
2. What happens if it's approved? What's the next step?
3. Are there any spending limits that affect this decision?
4. What controls exist at this review stage?"
1.3 Context Management

Maintain full conversation history in API calls
Track JSON evolution across turns
Allow users to revisit/modify earlier decisions
Support "undo last change" functionality


2. JSON Schema Specification
2.1 Core Structure
json{
  "processName": "string",
  "processId": "string (auto-generated UUID)",
  "lastUpdated": "ISO 8601 timestamp",
  "actors": [
    {
      "id": "string",
      "name": "string",
      "department": "string (optional)"
    }
  ],
  "steps": [
    {
      "id": "string",
      "type": "action | decision | start | end",
      "label": "string (short description)",
      "actorId": "string (references actors.id)",
      "description": "string (optional detailed description)",
      "controls": ["string array of control IDs"],
      "risks": ["string array of risk IDs"],
      "position": {
        "x": "number (optional, for layout hints)",
        "y": "number (optional)"
      }
    }
  ],
  "decisions": [
    {
      "id": "string",
      "stepId": "string (references steps.id)",
      "criteria": "string (decision logic)",
      "outcomes": [
        {
          "label": "string (e.g., 'Approved', 'Rejected')",
          "nextStepId": "string"
        }
      ]
    }
  ],
  "controls": [
    {
      "id": "string",
      "type": "preventive | detective | corrective",
      "description": "string (max 50 chars for diagram display)",
      "detailedDescription": "string (full description)"
    }
  ],
  "risks": [
    {
      "id": "string",
      "description": "string (max 50 chars for diagram display)",
      "severity": "low | medium | high",
      "detailedDescription": "string (full description)"
    }
  ],
  "flows": [
    {
      "from": "string (step ID)",
      "to": "string (step ID)",
      "label": "string (optional, for decision branches)",
      "type": "normal | conditional"
    }
  ]
}
2.2 Validation Rules (Enforced by GPT Agent Prompt)

Every step must have exactly one actor assigned
Start node must exist and have no incoming flows
End node(s) must exist and have no outgoing flows
Decision nodes must have 2+ outcomes defined
All flow references must point to valid step IDs
No orphaned steps (except start node)
No circular flows without exit condition

2.3 JSON Update Strategy
Per Chat Turn:

Agent outputs complete updated JSON (not diffs)
Wrap JSON in markdown code fence for parsing:

json  {updated schema}

Include <UPDATED> tag when JSON changes
Include <UNCHANGED> tag when just clarifying/discussing


3. Diagram Generation (Mermaid.js)
3.1 Automatic Rendering Trigger

Watch JSON state in React
Regenerate diagram on any JSON change
Debounce updates (300ms) to prevent flicker during rapid changes

3.2 Mermaid Syntax Mapping
Swimlane Structure:
mermaidgraph TB
    subgraph Actor1[Actor Name - Department]
        A1[Step Description]
        A2{Decision Point?}
    end
    subgraph Actor2[Another Actor]
        B1[Different Step]
    end
    A1 --> A2
    A2 -->|Yes| B1
    A2 -->|No| A1
Shape Mapping:

type: "action" → Rectangle [text]
type: "decision" → Diamond {text}
type: "start" → Circle ((Start))
type: "end" → Circle ((End))

Control Annotation:

Add blue shield icon next to steps with controls
Format: [Step Text]:::controlStyle
CSS: .controlStyle { fill: #E3F2FD; stroke: #1976D2; stroke-width: 2px; }

Risk Annotation:

Add warning triangle next to steps with risks
Format: [Step Text]:::riskStyle
CSS: .riskStyle { fill: #FFF3E0; stroke: #F57C00; stroke-width: 2px; }

3.3 Layout Algorithm
Vertical Organization (Swimlanes):

One subgraph per actor
Actors sorted by first appearance in process flow
Steps within actor swim lane sorted by flow order

Flow Lines:

Use straight arrows for sequential steps within same actor
Use angled arrows for cross-actor handoffs
Label decision branches clearly (Yes/No, Approved/Rejected, etc.)

3.4 Rendering Component Structure
typescript// DiagramRenderer.tsx
interface DiagramRendererProps {
  processJson: ProcessSchema;
  onNodeClick?: (nodeId: string) => void;
}

const DiagramRenderer: React.FC<DiagramRendererProps> = ({ processJson }) => {
  const [mermaidCode, setMermaidCode] = useState('');
  
  useEffect(() => {
    const code = generateMermaidFromJson(processJson);
    setMermaidCode(code);
  }, [processJson]);

  return <MermaidDiagram code={mermaidCode} />;
};
typescript// mermaidGenerator.ts
export function generateMermaidFromJson(json: ProcessSchema): string {
  // Core conversion logic
  // 1. Build actor swimlanes
  // 2. Place nodes within correct swimlanes
  // 3. Generate flow connections
  // 4. Apply styling classes
  // 5. Add control/risk annotations
  // Return complete Mermaid syntax string
}

4. Integration Points
4.1 State Management
typescript// useProcessBuilder.ts
interface ProcessBuilderState {
  conversationHistory: Message[];
  currentJson: ProcessSchema | null;
  isGenerating: boolean;
  error: string | null;
}

const useProcessBuilder = () => {
  const [state, setState] = useState<ProcessBuilderState>({
    conversationHistory: [],
    currentJson: null,
    isGenerating: false,
    error: null
  });

  const sendMessage = async (userMessage: string) => {
    // 1. Add user message to history
    // 2. Call OpenAI API with full context
    // 3. Parse response for JSON updates
    // 4. Update state.currentJson if <UPDATED> tag present
    // 5. Add assistant response to history
  };

  return { state, sendMessage };
};
4.2 API Integration (OpenAI)
Endpoint: POST https://api.openai.com/v1/chat/completions
Request Structure:
typescript{
  model: "gpt-4o-mini",
  messages: [
    {
      role: "system",
      content: PROCESS_ANALYST_SYSTEM_PROMPT // See Section 5.1
    },
    ...conversationHistory
  ],
  temperature: 0.3, // Lower for consistency
  max_tokens: 2000
}
```

**Response Parsing:**
- Extract assistant message content
- Check for JSON code fence: ` ```json...``` `
- Parse JSON with error handling
- Validate against schema (basic type checking)
- Merge into existing JSON or replace

---

### 5. Prompt Engineering

#### 5.1 System Prompt (Process Analyst Agent)
```
# ROLE
You are an expert business process analyst specializing in internal controls and risk management. Your job is to help users document their business processes through conversation, ultimately producing a structured JSON representation.

# OBJECTIVES
1. Extract complete process information through targeted questions
2. Identify actors, steps, decisions, controls, and risks
3. Ensure logical flow with no gaps or ambiguities
4. Produce valid JSON conforming to the schema below

# CONVERSATION STRATEGY
- Start by summarizing what you understand from user input
- Ask 2-3 focused questions per turn (don't overwhelm)
- Prioritize critical gaps: missing actors, unclear decisions, undefined outcomes
- Suggest standard patterns when appropriate ("This sounds like a three-way match control")
- Validate cross-references ("You mentioned approval in step 3, but I don't see an approval step")

# JSON OUTPUT RULES
- Output the COMPLETE updated JSON after each turn where information changes
- Wrap JSON in markdown code fence: ```json...```
- Add tag <UPDATED> on same line as code fence if JSON changed
- Add tag <UNCHANGED> if just discussing without updates
- Include ALL previously gathered information in each JSON output (cumulative)
- Never output partial JSON or diffs

# JSON SCHEMA
{schema from section 2.1}

# VALIDATION REQUIREMENTS
{rules from section 2.2}

# EXAMPLES
{2-3 example conversations showing question patterns and JSON evolution}

# CONSTRAINTS
- Keep step labels under 60 characters (for diagram clarity)
- Keep control/risk descriptions under 50 characters (for diagram display)
- Store full details in detailedDescription fields
- Assign every step to exactly one actor
- Ensure every decision has at least 2 outcomes
5.2 JSON Extraction Prompt Pattern
To reliably extract JSON from GPT responses:
typescriptconst extractJsonFromResponse = (content: string): ProcessSchema | null => {
  // Look for ```json code fence
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  
  if (!jsonMatch) {
    return null;
  }
  
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    // Basic validation
    if (!parsed.processName || !Array.isArray(parsed.steps)) {
      throw new Error('Invalid schema structure');
    }
    return parsed;
  } catch (e) {
    console.error('JSON parse error:', e);
    return null;
  }
};
```

---

### 6. User Interface Components

#### 6.1 Layout Structure
```
+--------------------------------------------------+
|  Process Builder                         [Export]|
+--------------------------------------------------+
|                    |                             |
|  Chat Interface    |    Diagram Preview          |
|  (40% width)       |    (60% width)              |
|                    |                             |
|  [User input]      |    [Mermaid Rendered SVG]   |
|  [Agent response]  |                             |
|  [User input]      |    [Pan/Zoom controls]      |
|  [...history]      |                             |
|                    |    [Download SVG/PNG]       |
|  [Input box]       |                             |
|  [Send button]     |                             |
+--------------------------------------------------+
6.2 Chat Component Requirements

Auto-scroll to latest message
Show loading indicator during API calls
Display JSON updates in collapsible code block
Syntax highlight JSON for readability
Allow editing JSON directly (advanced users)
"Start Over" button (clears history, resets JSON)

6.3 Diagram Component Requirements

Real-time rendering on JSON changes
Pan and zoom controls (mouse wheel, drag)
Click nodes to highlight in JSON
Export options:

SVG (vector)
PNG (raster, configurable DPI)
PDF (using jsPDF + html2canvas)
JSON download (for backup/sharing)




7. Error Handling
7.1 API Errors
Error TypeHandling StrategyRate limit (429)Exponential backoff, show user wait timeInvalid API keyShow configuration error, link to settingsTimeoutRetry once, then show error messageMalformed responseLog full response, show generic error to user
7.2 JSON Validation Errors

If GPT outputs invalid JSON:

Attempt auto-repair (common issues: trailing commas, unquoted keys)
If repair fails, send feedback message to GPT: "Your last JSON had syntax errors. Please provide corrected version."
Don't update diagram until valid JSON received



7.3 Diagram Rendering Errors

If Mermaid syntax invalid:

Log full Mermaid code and error
Show error overlay on diagram panel
Provide "Use Previous Version" button
Report issue to monitoring (Supabase logging)




8. Testing Requirements
8.1 Unit Tests

generateMermaidFromJson(): Test all node types, edge cases
extractJsonFromResponse(): Test various response formats
JSON validation functions
Flow connection logic (no orphans, valid references)

8.2 Integration Tests

Full conversation flow with mocked OpenAI responses
JSON update → Diagram render pipeline
Export functionality (SVG, PNG, PDF, JSON)

8.3 E2E Test Scenarios

Simple Linear Process: 3 actors, 5 steps, no decisions
Complex Approval Flow: Multiple decision points, parallel paths
Incomplete Initial Input: Test agent's questioning capability
User Corrections: Modify earlier decisions mid-conversation
Edge Cases: Single step, 100+ steps, deeply nested decisions


9. Performance Requirements
MetricTargetAPI response time< 3s (p95)Diagram render time< 500ms for typical process (20 steps)JSON parse/validate< 50msChat scroll performance60 FPS with 100+ messagesExport generation< 2s for PNG/PDF

10. Success Criteria
Must Have (MVP):

✅ Conversational JSON building with GPT-4o-mini
✅ Valid JSON schema with all required fields
✅ Automatic Mermaid diagram generation
✅ Swimlane organization by actor
✅ Decision nodes with multiple outcomes
✅ SVG export

Should Have:

✅ Control and risk annotations
✅ PNG/PDF export
✅ JSON download/upload
✅ Click-to-highlight nodes
✅ Direct JSON editing

Nice to Have:

⏳ Auto-save conversation to Supabase
⏳ Share diagram via public URL
⏳ Multiple diagram views (swimlane vs. linear)
⏳ AI-suggested improvements to existing JSON


11. Migration Strategy
Since this is a complete rewrite:

Build in isolation: New route /builder-v2
Feature flag: Toggle between old and new versions
Parallel testing: Run both systems on same inputs, compare outputs
Gradual rollout: 10% → 50% → 100% of users
Deprecation: Mark old system deprecated after 2 weeks of stable v2
Cleanup: Remove old code after 30 days


12. Open Questions / Future Enhancements

Multi-language support? Process descriptions in French, Spanish, etc.?
Template library? Pre-built JSON templates for common processes (purchase-to-pay, hire-to-retire)?
Collaboration? Multiple users editing same process simultaneously?
Version history? Track changes over time, allow rollback?
AI review? GPT analyzes completed process for control gaps/risks?


Appendix A: Example JSON
json{
  "processName": "Expense Reimbursement",
  "processId": "550e8400-e29b-41d4-a716-446655440000",
  "lastUpdated": "2025-11-18T10:30:00Z",
  "actors": [
    {
      "id": "emp-001",
      "name": "Employee",
      "department": "All Departments"
    },
    {
      "id": "mgr-001",
      "name": "Manager",
      "department": "Management"
    },
    {
      "id": "fin-001",
      "name": "Finance Team",
      "department": "Finance"
    }
  ],
  "steps": [
    {
      "id": "step-001",
      "type": "start",
      "label": "Start",
      "actorId": "emp-001"
    },
    {
      "id": "step-002",
      "type": "action",
      "label": "Submit expense report with receipts",
      "actorId": "emp-001",
      "controls": ["ctrl-001"],
      "risks": []
    },
    {
      "id": "step-003",
      "type": "decision",
      "label": "Review expense report",
      "actorId": "mgr-001",
      "controls": ["ctrl-002"],
      "risks": ["risk-001"]
    },
    {
      "id": "step-004",
      "type": "action",
      "label": "Request additional information",
      "actorId": "mgr-001"
    },
    {
      "id": "step-005",
      "type": "action",
      "label": "Process payment",
      "actorId": "fin-001",
      "controls": ["ctrl-003"]
    },
    {
      "id": "step-006",
      "type": "end",
      "label": "End",
      "actorId": "fin-001"
    }
  ],
  "decisions": [
    {
      "id": "dec-001",
      "stepId": "step-003",
      "criteria": "Expenses within policy and properly documented?",
      "outcomes": [
        {
          "label": "Approved",
          "nextStepId": "step-005"
        },
        {
          "label": "Needs Info",
          "nextStepId": "step-004"
        }
      ]
    }
  ],
  "controls": [
    {
      "id": "ctrl-001",
      "type": "preventive",
      "description": "Receipt attachment required",
      "detailedDescription": "System enforces attachment of receipts for all expenses over $25 before submission"
    },
    {
      "id": "ctrl-002",
      "type": "detective",
      "description": "Manager review of policy compliance",
      "detailedDescription": "Manager reviews expense report for compliance with travel and expense policy, including spending limits and receipt requirements"
    },
    {
      "id": "ctrl-003",
      "type": "preventive",
      "description": "Segregation of duties",
      "detailedDescription": "Finance team processes payment only after manager approval, ensuring no single person can submit and approve their own expenses"
    }
  ],
  "risks": [
    {
      "id": "risk-001",
      "description": "Fraudulent expense approval",
      "severity": "medium",
      "detailedDescription": "Risk that manager approves inappropriate or fraudulent expenses due to inadequate review"
    }
  ],
  "flows": [
    {
      "from": "step-001",
      "to": "step-002",
      "type": "normal"
    },
    {
      "from": "step-002",
      "to": "step-003",
      "type": "normal"
    },
    {
      "from": "step-003",
      "to": "step-005",
      "label": "Approved",
      "type": "conditional"
    },
    {
      "from": "step-003",
      "to": "step-004",
      "label": "Needs Info",
      "type": "conditional"
    },
    {
      "from": "step-004",
      "to": "step-002",
      "type": "normal"
    },
    {
      "from": "step-005",
      "to": "step-006",
      "type": "normal"
    }
  ]
}

Appendix B: Mermaid Output Example
Generated from JSON in Appendix A:
mermaidgraph TB
    subgraph Employee["Employee - All Departments"]
        S1((Start))
        S2["Submit expense report with receipts"]:::control
    end
    
    subgraph Manager["Manager - Management"]
        S3{"Review expense report"}:::control:::risk
        S4["Request additional information"]
    end
    
    subgraph Finance["Finance Team - Finance"]
        S5["Process payment"]:::control
        S6((End))
    end
    
    S1 --> S2
    S2 --> S3
    S3 -->|Approved| S5
    S3 -->|Needs Info| S4
    S4 --> S2
    S5 --> S6
    
    classDef control fill:#E3F2FD,stroke:#1976D2,stroke-width:2px
    classDef risk fill:#FFF3E0,stroke:#F57C00,stroke-width:2px

END OF PRD