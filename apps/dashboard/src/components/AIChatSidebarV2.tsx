'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { 
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  type PromptInputMessage,
} from '@/components/ai-elements/prompt-input';
import { Action, Actions } from '@/components/ai-elements/actions';
import { Response } from '@/components/ai-elements/response';
import { CopyIcon, RefreshCcwIcon, Settings, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModelSettings } from '@/hooks/useModelSettings';

interface AIChatSidebarV2Props {
  className?: string;
}

export const AIChatSidebarV2 = ({ className }: AIChatSidebarV2Props) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { settings } = useModelSettings();
  
  const { messages, sendMessage, status, regenerate } = useChat({
    api: '/api/chat',
    body: {
      model: settings.provider === 'builtin' ? 'deepseek-v3.1:671b-cloud' : `${settings.provider}/${settings.model}`,
      baseUrl: settings.baseUrl,
      apiToken: settings.apiToken,
    },
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;
    
    sendMessage({
      text: message.text,
    });
  };

  const models = [
    { name: '内置模型', value: 'builtin' },
    { name: 'Ollama', value: 'ollama' },
    { name: 'SiliconFlow', value: 'siliconflow' },
  ];

  return (
    <div className={cn(
      "h-full w-full bg-background border-l border-border flex flex-col transition-all duration-200 ease-out",
      className
    )}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 flex-shrink-0">
        {isExpanded && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground">
              <MessageSquare className="w-3 h-3" />
            </div>
            <span className="text-sm font-medium text-foreground">AI 写作助手</span>
            {status === 'streaming' && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="w-2 h-2 animate-spin mr-1" />
                思考中
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
            title={isExpanded ? "收起" : "展开"}
          >
            {isExpanded ? <X className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col flex-1 min-h-0">
          {/* 聊天内容区域 */}
          <Conversation className="flex-1">
            <ConversationContent>
              {messages.length === 0 && (
                <Message from="assistant">
                  <MessageContent>
                    <Response>
                      你好！我是你的 AI 写作助手，专门帮助提升文档质量。

                      我可以帮你：
                      • 📝 优化文本表达
                      • 🎯 提供写作建议
                      • 📊 分析文档结构
                      • ✨ 生成创意内容
                    </Response>
                  </MessageContent>
                </Message>
              )}
              
              {messages.map((message) => (
                <div key={message.id}>
                  <Message from={message.role}>
                    <MessageContent>
                      <Response>{message.content}</Response>
                    </MessageContent>
                  </Message>
                  
                  {message.role === 'assistant' && (
                    <Actions className="mt-2">
                      <Action
                        onClick={() => regenerate()}
                        label="重试"
                      >
                        <RefreshCcwIcon className="size-3" />
                      </Action>
                      <Action
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        label="复制"
                      >
                        <CopyIcon className="size-3" />
                      </Action>
                    </Actions>
                  )}
                </div>
              ))}
              
              {status === 'submitted' && (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">AI 正在思考...</span>
                </div>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* 输入区域 */}
          <div className="p-3 flex-shrink-0 border-t">
            <PromptInput onSubmit={handleSubmit}>
              <PromptInputBody>
                <PromptInputTextarea placeholder="输入消息... (Shift+Enter 换行，Enter 发送)" />
              </PromptInputBody>
              <PromptInputFooter>
                <PromptInputTools>
                  <PromptInputModelSelect
                    value={settings.provider}
                    onValueChange={(value) => {
                      // 这里可以触发模型切换逻辑
                    }}
                  >
                    <PromptInputModelSelectTrigger>
                      <PromptInputModelSelectValue />
                    </PromptInputModelSelectTrigger>
                    <PromptInputModelSelectContent>
                      {models.map((model) => (
                        <PromptInputModelSelectItem key={model.value} value={model.value}>
                          {model.name}
                        </PromptInputModelSelectItem>
                      ))}
                    </PromptInputModelSelectContent>
                  </PromptInputModelSelect>
                </PromptInputTools>
                <PromptInputSubmit disabled={status === 'streaming'} status={status} />
              </PromptInputFooter>
            </PromptInput>
          </div>
        </div>
      )}
    </div>
  );
};

