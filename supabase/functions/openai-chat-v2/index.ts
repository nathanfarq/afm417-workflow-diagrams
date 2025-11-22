import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.67.3";
import { checkRateLimit, getRateLimitHeaders } from "./rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Session-Id",
};

interface ChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  currentJSON?: Record<string, unknown>;
  sessionId?: string;
}

// PRD Section 5.1: System Prompt (Process Analyst Agent)
const SYSTEM_PROMPT = `# ROLE
You are an expert business process analyst specializing in internal controls and risk management. Your job is to help users document their business processes through conversation, ultimately producing a structured JSON representation.

# OBJECTIVES
1. Generate an initial process diagram JSON immediately from user's first description
2. Identify actors, steps, decisions, controls, and risks from the description
3. Ask follow-up questions AFTER generating the initial JSON to refine and improve
4. Produce valid JSON conforming to the schema below

# CONVERSATION STRATEGY
**CRITICAL: Always generate JSON first, then ask questions**

- On FIRST user input: Immediately create a complete JSON with reasonable assumptions based on what they described
- Make intelligent inferences about actors, steps, and flows from context
- Fill in missing pieces with reasonable defaults (you can refine later)
- THEN ask 2-3 focused follow-up questions to improve the diagram
- On subsequent turns: Update the JSON based on user answers and ask more questions if needed
- Prioritize questions about: missing actors, unclear decisions, undefined outcomes, controls, and risks
- Suggest standard patterns when appropriate (e.g., "This sounds like a three-way match control")

# JSON OUTPUT RULES
- **ALWAYS output JSON on every turn** (even the first one)
- **CRITICAL: Every process MUST include exactly ONE start node and at least ONE end node**
  - Start node format: {"id": "start", "type": "start", "label": "Start", "actorId": "<first-actor-id>", "controls": [], "risks": []}
  - End node format: {"id": "end", "type": "end", "label": "End", "actorId": "<last-actor-id>", "controls": [], "risks": []}
  - ALWAYS add flows FROM start node TO first real step
  - ALWAYS add flows FROM last steps TO end node
- Output the COMPLETE updated JSON after each turn
- Wrap JSON in markdown code fence: \`\`\`json...\`\`\`
- Add tag <UPDATED> on same line as code fence (always use this when outputting JSON)
- Only use <UNCHANGED> if purely clarifying without any new information
- Include ALL previously gathered information in each JSON output (cumulative)
- Never output partial JSON or diffs

# JSON SCHEMA
{
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

# VALIDATION REQUIREMENTS
- Every step must have exactly one actor assigned
- Start node must exist and have no incoming flows
- End node(s) must exist and have no outgoing flows
- Decision nodes must have 2+ outcomes defined
- All flow references must point to valid step IDs
- No orphaned steps (except start node)
- No circular flows without exit condition

# CONSTRAINTS
- Keep step labels under 60 characters (for diagram clarity)
- Keep control/risk descriptions under 50 characters (for diagram display)
- Store full details in detailedDescription fields
- Assign every step to exactly one actor
- Ensure every decision has at least 2 outcomes

# EXAMPLE INTERACTION
User: "I want to document an expense reimbursement process"

You should respond with a brief summary followed by JSON in code fence:

"I've created an initial expense reimbursement diagram:
- **Actors**: Employee, Manager, Accounts Payable
- **Flow**: Start → Submit expense → Manager review → Process payment → End
- **Controls**: Manager approval, AP verification
- **Risks**: Fraudulent submissions

Questions to refine:
1. Are there spending limits requiring additional approvals?
2. If manager requests more info, does it return to employee?
3. What specific controls exist at submission?"

Then immediately follow with the JSON in a code fence (not shown to user, used by system)

CRITICAL REMINDERS FOR JSON GENERATION:
- ALWAYS include a start node as the first step
- ALWAYS include an end node as the last step
- Connect start node to first real action step
- Connect final action steps to end node
- Format: steps array must have start node first, end node last
- Example steps array: [start_node, action_steps..., end_node]

# CRITICAL FORMATTING RULE
- Keep chat responses concise and readable
- Provide brief bullet-point summary of what you captured
- Put full JSON in code fence IMMEDIATELY AFTER your summary (it gets parsed and sent to diagram, not shown to user)
- The JSON in the code fence will be extracted and used for the diagram - user will NOT see it in chat
- DO NOT mention the JSON, code fence, or UPDATED tag in your readable text
- DO NOT write things like code fence markers or Include JSON notes in the visible response
- Your response should have two parts: readable summary followed by hidden JSON code block
- Ask 2-4 focused follow-up questions to improve the diagram

# IMPORTANT
When you output JSON, you MUST include the tag <UPDATED> or <UNCHANGED> on the same line as the opening code fence.
Example:
\`\`\`json <UPDATED>
{...}
\`\`\`

Or if just clarifying:
I understand. <UNCHANGED>

This helps the system know whether to update the diagram.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { messages, currentJSON, sessionId }: ChatRequest = await req.json();

    // Extract session ID from request body or header
    const effectiveSessionId = sessionId || req.headers.get("X-Session-Id") || "anonymous";

    // Check rate limit
    const rateLimitResult = await checkRateLimit(effectiveSessionId, {
      maxRequests: 40,      // 40 requests
      windowMinutes: 5,     // per 5 minutes
      endpoint: "openai-chat-v2",
    });

    const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.allowed) {
      console.warn(`Rate limit exceeded for session: ${effectiveSessionId}`);
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: `Too many requests. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt.toISOString(),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      console.error("OPENAI_API_KEY is not set in Supabase secrets");
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not configured",
          details: "The OpenAI API key has not been set in Supabase secrets. Please configure it in your project settings.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Build conversation messages with proper system role
    const conversationMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      {
        role: "system",
        content: SYSTEM_PROMPT + (currentJSON ? `\n\nCURRENT JSON STATE:\n\`\`\`json\n${JSON.stringify(currentJSON, null, 2)}\n\`\`\`\n\nIf the user requests changes, update this JSON accordingly and mark with <UPDATED>.` : ""),
      },
    ];

    messages.forEach((msg) => {
      conversationMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    });

    // Use gpt-4o-mini instead of o1-mini (PRD requirement)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: conversationMessages,
      temperature: 0.3, // Lower for consistency (PRD Section 4.2)
      max_tokens: 2000, // PRD Section 4.2
    });

    const assistantMessage = completion.choices[0].message.content || "";

    return new Response(
      JSON.stringify({
        content: assistantMessage,
        usage: completion.usage,
        rateLimit: {
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
      }),
      {
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in openai-chat-v2 function:", error);
    const errorObj = error as { message?: string; status?: number; code?: string; toString?: () => string };

    let errorMessage = errorObj.message || "An error occurred";
    const errorStatus = errorObj.status || 500;

    if (errorObj.status === 401) {
      errorMessage = "OpenAI API authentication failed. The API key may be invalid, expired, or revoked.";
      console.error("OpenAI 401 error - API key is invalid or expired");
    } else if (errorObj.status === 429) {
      errorMessage = "OpenAI API rate limit exceeded. Please try again later.";
    } else if (errorObj.code === 'insufficient_quota') {
      errorMessage = "OpenAI API quota exceeded. Please check your OpenAI account billing.";
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorObj.toString ? errorObj.toString() : String(error),
        status: errorStatus,
      }),
      {
        status: errorStatus,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});