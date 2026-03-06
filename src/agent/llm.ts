import { config } from '../config.js';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
}

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string; // JSON string
    };
}

export interface LLMResponse {
    message: ChatMessage;
    finish_reason: 'stop' | 'tool_calls' | 'length' | string;
}

export interface ToolDefinition {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: any; // JSON Schema
    };
}

// Function to call a generic OpenAI-compatible LLM via fetch with timeout
async function callLLM(url: string, apiKey: string, model: string, messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
    const payload: any = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
    };

    if (tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 1 minute timeout

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com',
                'X-Title': 'OpenGravity',
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`LLM API Error (${url}): ${response.status} - ${text}`);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error(`LLM for ${model} returned no choices.`);
        }

        return {
            message: data.choices[0].message,
            finish_reason: data.choices[0].finish_reason,
        };
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error(`The LLM request to ${model} timed out after 60 seconds.`);
        }
        throw err;
    }
}

async function callGroq(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
    return callLLM('https://api.groq.com/openai/v1/chat/completions', config.GROQ_API_KEY, 'llama-3.3-70b-versatile', messages, tools);
}

async function callOpenRouter(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
    if (!config.OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured for fallback.');
    }
    return callLLM('https://openrouter.ai/api/v1/chat/completions', config.OPENROUTER_API_KEY, config.OPENROUTER_MODEL, messages, tools);
}

export async function generateCompletion(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
    try {
        return await callGroq(messages, tools);
    } catch (error: any) {
        console.error('⚠️ LLM request failed, trying OpenRouter fallback...', error.message);
        try {
            return await callOpenRouter(messages, tools);
        } catch (fallbackError: any) {
            console.error('❌ OpenRouter fallback also failed:', fallbackError.message);
            throw fallbackError;
        }
    }
}
