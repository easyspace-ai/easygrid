import { streamText, convertToModelMessages } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createOpenAI } from 'ai/openai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const {
    messages,
    model,
    baseUrl,
    apiToken,
  }: { 
    messages: any[]; 
    model: string;
    baseUrl?: string;
    apiToken?: string;
  } = await req.json();

  let client;
  
  // 根据配置选择不同的客户端
  if (model.startsWith('ollama/') && baseUrl) {
    // 使用 Ollama
    client = createOpenAI({
      baseURL: baseUrl,
      apiKey: 'ollama', // Ollama 不需要真实的 API key
    });
  } else if (model.startsWith('siliconflow/') && baseUrl && apiToken) {
    // 使用 SiliconFlow
    client = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiToken,
    });
  } else {
    // 默认使用 OpenAI (内置模拟)
    client = openai({
      apiKey: 'mock-key', // 这里会使用内置模拟
    });
  }

  const result = streamText({
    model: client(model.split('/')[1] || 'deepseek-v3.1:671b-cloud'),
    messages: convertToModelMessages(messages),
    system: 'You are a helpful writing assistant that specializes in improving document quality. You can help with text optimization, writing suggestions, document structure analysis, and creative content generation.',
  });

  return result.toDataStreamResponse();
}

