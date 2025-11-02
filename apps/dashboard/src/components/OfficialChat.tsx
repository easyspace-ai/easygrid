'use client';

import {
  Branch,
  BranchMessages,
  BranchNext,
  BranchPage,
  BranchPrevious,
  BranchSelector,
} from '@/components/ai-elements/branch';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import {
  Message,
  MessageAvatar,
  MessageContent,
} from '@/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Response } from '@/components/ai-elements/response';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/components/ai-elements/sources';
import {
  Suggestion,
  Suggestions,
} from '@/components/ai-elements/suggestion';
import { GlobeIcon } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { ToolUIPart } from 'ai';
import { nanoid } from 'nanoid';
import { useModelSettings } from '@/hooks/useModelSettings';
import { getProviderSpec } from '@/lib/providers';

type MessageType = {
  key: string;
  from: 'user' | 'assistant';
  sources?: { href: string; title: string }[];
  versions: {
    id: string;
    content: string;
  }[];
  reasoning?: {
    content: string;
    duration: number;
  };
  tools?: {
    name: string;
    description: string;
    status: ToolUIPart['state'];
    parameters: Record<string, unknown>;
    result: string | undefined;
    error: string | undefined;
  }[];
  avatar: string;
  name: string;
};

const initialMessages: MessageType[] = [
  {
    key: nanoid(),
    from: 'user',
    versions: [
      {
        id: nanoid(),
        content: '你好！请介绍一下你的功能。',
      },
    ],
    avatar: 'https://github.com/haydenbleasel.png',
    name: '用户',
  },
  {
    key: nanoid(),
    from: 'assistant',
    sources: [
      {
        href: 'https://react.dev/reference/react',
        title: 'React Documentation',
      },
    ],
    versions: [
      {
        id: nanoid(),
        content: `# AI 写作助手

你好！我是你的 AI 写作助手，专门帮助提升文档质量。

## 我的功能

• **📝 优化文本表达** - 让文字更简洁、流畅、专业
• **🎯 提供写作建议** - 根据你的需求给出针对性建议  
• **📊 分析文档结构** - 帮你梳理逻辑和层次
• **✨ 生成创意内容** - 激发灵感，丰富内容

## 使用建议

- 可以问我任何关于写作的问题
- 支持中英文对话
- 可以上传文件进行分析
- 支持多种 AI 模型切换

有什么需要帮助的吗？`,
      },
    ],
    avatar: 'https://github.com/openai.png',
    name: 'AI 助手',
  },
];

const getModels = (currentSettings: any) => {
  const baseModels = [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
    { id: 'claude-2', name: 'Claude 2' },
    { id: 'claude-instant', name: 'Claude Instant' },
    { id: 'palm-2', name: 'PaLM 2' },
    { id: 'llama-2-70b', name: 'Llama 2 70B' },
    { id: 'llama-2-13b', name: 'Llama 2 13B' },
    { id: 'cohere-command', name: 'Command' },
    { id: 'mistral-7b', name: 'Mistral 7B' },
  ];

  // 根据当前配置添加自定义模型选项，使用更简洁的显示
  if (currentSettings.provider === 'ollama' && currentSettings.model) {
    const modelName = currentSettings.model.split(':')[0] || 'Ollama';
    return [
      { id: 'ollama', name: modelName },
      ...baseModels
    ];
  }
  
  if (currentSettings.provider === 'siliconflow' && currentSettings.model) {
    const modelName = currentSettings.model.split('/').pop() || 'SiliconFlow';
    return [
      { id: 'siliconflow', name: modelName },
      ...baseModels
    ];
  }

  return baseModels;
};

const suggestions = [
  '帮我写一份会议纪要',
  '优化这段文字的表达',
  '检查语法和结构',
  '提供写作创意',
  '分析文档结构',
  '生成产品介绍',
  '写一份技术文档',
  '创作营销文案',
];

const mockResponses = [
  "这是一个很好的问题！让我来帮你分析一下。根据我的理解，这个问题涉及到几个关键点，我会逐一为你详细解释。",
  "我很乐意为你提供帮助。从我的角度来看，这个问题需要从多个角度来考虑。让我为你梳理一下思路。",
  "这是一个很有趣的话题！让我来为你详细解答。首先，我们需要理解基础概念，然后逐步深入。",
  "好的，我来帮你解决这个问题。根据我的经验，最好的方法是先分析现状，然后制定具体的解决方案。",
  "这确实是一个值得深入探讨的话题。让我为你提供一个全面的分析和建议。",
];

const OfficialChat = () => {
  const { settings } = useModelSettings();
  const [model, setModel] = useState<string>(() => {
    // 根据当前配置选择默认模型
    if (settings.provider === 'ollama') return 'ollama';
    if (settings.provider === 'siliconflow') return 'siliconflow';
    return 'gpt-4'; // 默认 GPT-4
  });
  const [text, setText] = useState<string>('');
  const [useWebSearch, setUseWebSearch] = useState<boolean>(false);
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready');
  const [messages, setMessages] = useState<MessageType[]>(initialMessages);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const shouldCancelRef = useRef<boolean>(false);
  const addMessageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stop = useCallback(() => {
    console.log('Stopping generation...');

    // Set cancellation flag
    shouldCancelRef.current = true;

    // Clear timeout for adding assistant message
    if (addMessageTimeoutRef.current) {
      clearTimeout(addMessageTimeoutRef.current);
      addMessageTimeoutRef.current = null;
    }

    setStatus('ready');
    setStreamingMessageId(null);
  }, []);

  const streamResponse = useCallback(
    async (messageId: string, content: string) => {
      setStatus('streaming');
      setStreamingMessageId(messageId);
      shouldCancelRef.current = false;

      const words = content.split(' ');
      let currentContent = '';

      for (let i = 0; i < words.length; i++) {
        // Check if streaming should be cancelled
        if (shouldCancelRef.current) {
          setStatus('ready');
          setStreamingMessageId(null);
          return;
        }

        currentContent += (i > 0 ? ' ' : '') + words[i];

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.versions.some((v) => v.id === messageId)) {
              return {
                ...msg,
                versions: msg.versions.map((v) =>
                  v.id === messageId ? { ...v, content: currentContent } : v,
                ),
              };
            }
            return msg;
          }),
        );

        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 100 + 50),
        );
      }

      setStatus('ready');
      setStreamingMessageId(null);
    },
    [],
  );

  const addUserMessage = useCallback(
    async (content: string) => {
      const userMessage: MessageType = {
        key: `user-${Date.now()}`,
        from: 'user',
        versions: [
          {
            id: `user-${Date.now()}`,
            content,
          },
        ],
        avatar: 'https://github.com/haydenbleasel.png',
        name: '用户',
      };

      setMessages((prev) => [...prev, userMessage]);

      // 创建助手消息占位符
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage: MessageType = {
        key: `assistant-${Date.now()}`,
        from: 'assistant',
        versions: [
          {
            id: assistantMessageId,
            content: '',
          },
        ],
        avatar: 'https://github.com/openai.png',
        name: 'AI 助手',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      try {
        // 尝试调用真实模型
        const spec = getProviderSpec(settings.provider);
        if (spec?.chat) {
          setStatus('streaming');
          setStreamingMessageId(assistantMessageId);
          
          const response = await spec.chat(content, {
            baseUrl: settings.baseUrl || '',
            apiToken: settings.apiToken || '',
            model: settings.model || ''
          });
          
          if (response) {
            streamResponse(assistantMessageId, response);
          } else {
            throw new Error('模型返回空响应');
          }
        } else {
          // 如果没有配置真实模型，使用模拟响应
          const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
          streamResponse(assistantMessageId, randomResponse);
        }
      } catch (error: any) {
        console.error('模型调用失败:', error);
        toast.error('模型调用失败', {
          description: error?.message || '请检查模型配置',
        });
        
        // 失败时使用模拟响应
        const fallbackResponse = `抱歉，模型调用失败：${error?.message || '未知错误'}。\n\n请检查：\n• 模型配置是否正确\n• 网络连接是否正常\n• API 密钥是否有效\n\n当前使用模拟响应。`;
        streamResponse(assistantMessageId, fallbackResponse);
      }
    },
    [streamResponse, settings],
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    // If currently streaming or submitted, stop instead of submitting
    if (status === 'streaming' || status === 'submitted') {
      stop();
      return;
    }

    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    setStatus('submitted');

    if (message.files?.length) {
      toast.success('文件已附加', {
        description: `已附加 ${message.files.length} 个文件到消息`,
      });
    }

    await addUserMessage(message.text || '已发送附件');
    setText('');
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setStatus('submitted');
    await addUserMessage(suggestion);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-gray-50/30">
      <div className="flex-1 min-h-0">
        <Conversation className="h-full">
          <ConversationContent className="text-sm text-gray-700 leading-relaxed">
            {messages.map(({ versions, ...message }) => (
              <Branch defaultBranch={0} key={message.key}>
                <BranchMessages>
                  {versions.map((version) => (
                    <Message
                      from={message.from}
                      key={`${message.key}-${version.id}`}
                    >
                      <div>
                        {message.sources?.length && (
                          <Sources>
                            <SourcesTrigger count={message.sources.length} />
                            <SourcesContent>
                              {message.sources.map((source) => (
                                <Source
                                  href={source.href}
                                  key={source.href}
                                  title={source.title}
                                />
                              ))}
                            </SourcesContent>
                          </Sources>
                        )}
                        {message.reasoning && (
                          <Reasoning duration={message.reasoning.duration}>
                            <ReasoningTrigger />
                            <ReasoningContent>
                              {message.reasoning.content}
                            </ReasoningContent>
                          </Reasoning>
                        )}
                        <MessageContent>
                          <Response className="text-gray-600 leading-relaxed bg-gray-50/50 backdrop-blur-sm">{version.content}</Response>
                        </MessageContent>
                      </div>
                      <MessageAvatar name={message.name} src={message.avatar} />
                    </Message>
                  ))}
                </BranchMessages>
                {versions.length > 1 && (
                  <BranchSelector from={message.from}>
                    <BranchPrevious />
                    <BranchPage />
                    <BranchNext />
                  </BranchSelector>
                )}
              </Branch>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      
      <div className="shrink-0 border-t bg-white/80 backdrop-blur-sm">
        <div className="grid gap-2 pt-3">
          <Suggestions className="px-3">
            {suggestions.map((suggestion) => (
              <Suggestion
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                suggestion={suggestion}
                className="text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100/60 px-2.5 py-1.5 rounded-md transition-all duration-200"
              />
            ))}
          </Suggestions>
          <div className="w-full px-3 pb-3">
            <PromptInput
              className="border border-gray-200 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm focus-within:ring-2 focus-within:ring-blue-200/30 focus-within:border-blue-300 transition-all duration-200"
              globalDrop
              multiple
              onSubmit={handleSubmit}
            >
              <PromptInputBody className="p-2.5">
                <PromptInputAttachments>
                  {(attachment) => <PromptInputAttachment data={attachment} />}
                </PromptInputAttachments>
                <PromptInputTextarea
                  className="min-h-[60px] max-h-[120px] resize-none border-0 bg-transparent outline-none ring-0 focus-visible:ring-0 focus-visible:outline-none text-sm text-gray-700 placeholder:text-gray-500"
                  onChange={(event) => setText(event.target.value)}
                  ref={textareaRef}
                  value={text}
                  placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
                />
              </PromptInputBody>
              <PromptInputFooter className="px-2.5 pb-2.5 pt-1.5 border-t border-gray-200/50">
                <PromptInputTools className="gap-2">
                  <PromptInputActionMenu>
                    <PromptInputActionMenuTrigger />
                    <PromptInputActionMenuContent>
                      <PromptInputActionAddAttachments />
                    </PromptInputActionMenuContent>
                  </PromptInputActionMenu>
                  <PromptInputSpeechButton
                    onTranscriptionChange={setText}
                    textareaRef={textareaRef}
                  />
                  <PromptInputButton
                    onClick={() => setUseWebSearch(!useWebSearch)}
                    variant={useWebSearch ? 'default' : 'ghost'}
                    className="h-7 px-2.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
                  >
                    <GlobeIcon size={14} />
                    <span>搜索</span>
                  </PromptInputButton>
                  <PromptInputModelSelect onValueChange={setModel} value={model}>
                    <PromptInputModelSelectTrigger className="h-7 px-2.5 text-xs text-gray-500 border-none shadow-none focus:ring-0 hover:bg-gray-100/50">
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {getModels(settings).map((model) => (
                        <PromptInputModelSelectItem
                          key={model.id}
                          value={model.id}
                        >
                          {model.name}
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>
                <PromptInputSubmit
                  disabled={(!text.trim() && !status) || status === 'streaming'}
                  status={status}
                  className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfficialChat;