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

// Function to call Groq natively via fetch
async function callGroq(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const payload: any = {
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        max_tokens: 4096,
    };

    if (tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Groq API Error: ${response.status} - ${text}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
        throw new Error('Groq no devolvió ninguna respuesta (choices[0] es undefined).');
    }

    return {
        message: data.choices[0].message,
        finish_reason: data.choices[0].finish_reason,
    };
}

// Fallback to OpenRouter if Groq fails
async function callOpenRouter(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
    if (!config.OPENROUTER_API_KEY) {
        throw new Error('OpenRouter API key not configured for fallback.');
    }

    const url = 'https://openrouter.ai/api/v1/chat/completions';
    const payload: any = {
        model: config.OPENROUTER_MODEL,
        messages,
        temperature: 0.7,
    };

    if (tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com',
            'X-Title': 'OpenGravity',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} - ${text}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
        throw new Error('OpenRouter no devolvió ninguna respuesta (choices[0] es undefined).');
    }

    return {
        message: data.choices[0].message,
        finish_reason: data.choices[0].finish_reason,
    };
}

export async function generateCompletion(messages: ChatMessage[], tools: ToolDefinition[]): Promise<LLMResponse> {
    try {
        return await callGroq(messages, tools);
    } catch (error: any) {
        console.error('⚠️ Groq request failed, trying OpenRouter fallback...', error.message);
        try {
            return await callOpenRouter(messages, tools);
        } catch (fallbackError: any) {
            console.error('❌ OpenRouter fallback also failed:', fallbackError.message);
            throw fallbackError;
        }
    }
}
