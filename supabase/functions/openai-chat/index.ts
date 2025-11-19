import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import OpenAI from "npm:openai@4.67.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  messages: Array<{
    role: string;
    content: string;
  }>;
  currentJSON?: Record<string, unknown>;
}

const SYSTEM_PROMPT = `You are an expert audit consultant helping users create detailed audit process flows through natural conversation.

Your task is to gather information about their audit process by asking clarifying questions, then generate a comprehensive JSON document representing the complete audit flow.

THE JSON SCHEMA YOU MUST FOLLOW:
{
  "processName": "string (name of the audit process)",
  "description": "string (optional overall description)",
  "departments": [
    {
      "id": "string (unique identifier)",
      "name": "string (department name)",
      "color": "string (optional hex color)"
    }
  ],
  "steps": [
    {
      "id": "string (unique identifier)",
      "name": "string (step name)",
      "description": "string (detailed description)",
      "departmentId": "string (references department id)",
      "order": number (sequence in process),
      "duration": "string (optional time estimate)",
      "responsible": "string (optional role/person)"
    }
  ],
  "controls": [
    {
      "id": "string (unique identifier)",
      "name": "string (control name)",
      "description": "string (what it does)",
      "type": "preventive" | "detective" | "corrective",
      "relatedStepId": "string (references step id)"
    }
  ],
  "weaknesses": [
    {
      "id": "string (unique identifier)",
      "description": "string (weakness description)",
      "severity": "low" | "medium" | "high" | "critical",
      "relatedStepId": "string (references step id)",
      "recommendation": "string (optional improvement suggestion)"
    }
  ]
}

CONVERSATION GUIDELINES:
1. Start by asking what audit process they want to document
2. Ask about departments/teams involved
3. Gather details on process steps in sequence
4. Ask about controls in place for each step
5. Inquire about known weaknesses or risks
6. When you have enough information, generate the complete JSON
7. If the user asks for changes, update the JSON accordingly

CRITICAL RULES:
- Ask questions naturally and conversationally
- Don't overwhelm with too many questions at once
- When generating JSON, wrap it in a markdown code block: \`\`\`json
- Generate complete, valid JSON with all required fields
- Use descriptive IDs like "dept-finance", "step-review-invoice", "ctrl-approval-required"
- Be thorough but don't invent information the user hasn't provided
- If information is missing, ask before generating JSON

Your goal is to help create a comprehensive, accurate audit process flow through friendly conversation.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { messages, currentJSON }: ChatRequest = await req.json();

    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const conversationMessages: Array<{ role: string; content: string }> = [
      {
        role: "user",
        content: SYSTEM_PROMPT + (currentJSON ? `\n\nCURRENT JSON STATE:\n\`\`\`json\n${JSON.stringify(currentJSON, null, 2)}\n\`\`\`\n\nIf the user requests changes, update this JSON accordingly.` : ""),
      },
    ];

    messages.forEach((msg) => {
      conversationMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    });

    const completion = await openai.chat.completions.create({
      model: "o1-mini",
      messages: conversationMessages,
      max_completion_tokens: 16000,
    });

    const assistantMessage = completion.choices[0].message.content || "";

    return new Response(
      JSON.stringify({
        content: assistantMessage,
        usage: completion.usage,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: unknown) {
    console.error("Error in openai-chat function:", error);
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