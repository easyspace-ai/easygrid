'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  RefreshCw, 
  Sparkles,
  Settings,
  X,
  Loader2,
  MessageSquare,
  Trash2,
  Download,
  FileText,
  Lightbulb,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useModelSettings } from '@/hooks/useModelSettings';
import { getProviderSpec } from '@/lib/providers';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'analysis';
}

interface AIChatSidebarProps {
  className?: string;
}

export const AIChatSidebar = ({ className }: AIChatSidebarProps) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是你的 AI 写作助手，专门帮助提升文档质量。\n\n我可以帮你：\n• 📝 优化文本表达\n• 🎯 提供写作建议\n• 📊 分析文档结构\n• ✨ 生成创意内容',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { settings } = useModelSettings();

  // 智能 AI 响应生成器（本地内置模拟）
  const generateAIResponse = async (userMessage: string): Promise<Message> => {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
    
    const lowerMessage = userMessage.toLowerCase();
    let response: Message;

    // 根据用户输入类型生成不同响应
    if (lowerMessage.includes('写') || lowerMessage.includes('创作') || lowerMessage.includes('生成')) {
      response = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `我来帮你创作内容！关于"${userMessage}"，我建议按以下结构展开：\n\n**1. 引言部分**\n- 背景介绍\n- 问题陈述\n- 目标设定\n\n**2. 主体内容**\n- 核心观点\n- 支撑论据\n- 案例分析\n\n**3. 结论总结**\n- 要点回顾\n- 行动建议\n- 未来展望\n\n需要我详细展开某个部分吗？`,
        timestamp: new Date(),
        type: 'suggestion'
      };
    } else if (lowerMessage.includes('优化') || lowerMessage.includes('改进') || lowerMessage.includes('修改')) {
      response = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `优化建议分析：\n\n**当前问题识别：**\n• 表达不够简洁\n• 逻辑结构需调整\n• 语言风格需统一\n\n**优化策略：**\n\n1. **语言优化**\n   - 使用主动语态\n   - 避免冗余表达\n   - 增强可读性\n\n2. **结构优化**\n   - 段落层次清晰\n   - 过渡自然流畅\n   - 重点突出明确\n\n3. **内容优化**\n   - 补充具体细节\n   - 增强说服力\n   - 提升专业度\n\n需要我针对具体内容提供详细修改建议吗？`,
        timestamp: new Date(),
        type: 'analysis'
      };
    } else if (lowerMessage.includes('检查') || lowerMessage.includes('错误') || lowerMessage.includes('语法')) {
      response = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: `文档检查报告：\n\n**✅ 语法检查**\n• 标点符号使用正确\n• 句子结构完整\n• 时态使用一致\n\n**📝 表达建议**\n• 部分句子可简化\n• 专业术语使用恰当\n• 逻辑连接词可优化\n\n**🎯 改进建议**\n\n1. **简洁性**：删除不必要的修饰词\n2. **准确性**：确保数据引用正确\n3. **一致性**：统一术语表达\n4. **完整性**：补充缺失信息\n\n需要我提供具体的修改示例吗？`,
        timestamp: new Date(),
        type: 'analysis'
      };
    } else {
      // 通用智能回复
      const responses = [
        `我理解你的需求："${userMessage}"。让我为你提供一些专业的建议...\n\n**核心要点：**\n• 明确目标和受众\n• 结构化的内容组织\n• 清晰的语言表达\n• 具体可操作的建议\n\n**下一步建议：**\n1. 细化具体需求\n2. 收集相关素材\n3. 制定写作大纲\n4. 逐步完善内容\n\n还有什么具体的问题需要我帮助吗？`,
        `关于"${userMessage}"，这是一个很有价值的话题！\n\n**分析角度：**\n• 现状评估\n• 问题识别\n• 解决方案\n• 实施计划\n\n**建议方法：**\n1. 先做背景调研\n2. 明确核心观点\n3. 组织支撑论据\n4. 设计清晰结构\n\n需要我针对某个方面深入分析吗？`,
        `"${userMessage}"确实值得深入探讨。让我为你梳理一下思路：\n\n**思考框架：**\n• What（什么）- 定义和概念\n• Why（为什么）- 原因和意义\n• How（如何）- 方法和步骤\n• When（何时）- 时机和节奏\n\n**实用建议：**\n- 从读者角度思考\n- 使用具体例子\n- 保持逻辑清晰\n- 注重实用价值\n\n希望这些建议对你有帮助！`,
        `针对"${userMessage}"，我建议采用以下策略：\n\n**📊 分析工具**\n• SWOT 分析\n• 5W1H 方法\n• 金字塔原理\n• 思维导图\n\n**✍️ 写作技巧**\n• 开门见山\n• 层层递进\n• 首尾呼应\n• 画龙点睛\n\n**🔍 质量检查**\n• 逻辑自洽\n• 表达准确\n• 结构完整\n• 风格统一\n\n需要我详细解释某个方法吗？`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      response = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: randomResponse,
        timestamp: new Date(),
        type: 'text'
      };
    }

    return response;
  };

  // 实际模型调用（支持 Ollama）
  const callModel = async (userMessage: string): Promise<Message> => {
    const spec = getProviderSpec(settings.provider);
    if (spec?.chat) {
      try {
        const content = await spec.chat(userMessage, { baseUrl: settings.baseUrl || '', apiToken: settings.apiToken || '', model: settings.model || '' });
        return { id: `ai-${Date.now()}`, role: 'assistant', content: content || '（无内容返回）', timestamp: new Date(), type: 'text' };
      } catch (e: any) {
        toast({ title: `${spec.name} 调用失败`, description: e?.message || '请检查配置', variant: 'destructive' });
        return generateAIResponse(userMessage);
      }
    }
    return generateAIResponse(userMessage);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await callModel(userMessage.content);
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      toast({
        title: "发送失败",
        description: "消息发送失败，请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "已复制",
        description: "内容已复制到剪贴板",
      });
    } catch (error) {
      toast({
        title: "复制失败",
        description: "无法复制内容到剪贴板",
        variant: "destructive",
      });
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '你好！我是你的 AI 写作助手，专门帮助提升文档质量。\n\n我可以帮你：\n• 📝 优化文本表达\n• 🎯 提供写作建议\n• 📊 分析文档结构\n• ✨ 生成创意内容',
        timestamp: new Date(),
        type: 'text'
      }
    ]);
    toast({
      title: "对话已清空",
      description: "开始新的对话",
    });
  };

  const exportChat = () => {
    const chatData = {
      timestamp: new Date().toISOString(),
      title: 'AI 写作助手对话记录',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        type: msg.type,
        timestamp: msg.timestamp.toISOString()
      }))
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-writing-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "导出成功",
      description: "聊天记录已导出",
    });
  };

  // 自动滚动到底部
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  // 快速回复建议
  const quickReplies = [
    { text: "帮我写一份会议纪要", icon: FileText },
    { text: "优化这段文字的表达", icon: CheckCircle },
    { text: "检查语法和结构", icon: AlertCircle },
    { text: "提供写作创意", icon: Lightbulb }
  ];

  const handleQuickReply = (reply: string) => {
    setInput(reply);
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'suggestion': return <Lightbulb className="w-3 h-3" />;
      case 'analysis': return <AlertCircle className="w-3 h-3" />;
      default: return <Bot className="w-3 h-3" />;
    }
  };

  const getMessageBadgeColor = (type?: string) => {
    switch (type) {
      case 'suggestion': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'analysis': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-primary text-primary-foreground';
    }
  };

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
              <Sparkles className="w-3 h-3" />
            </div>
            <span className="text-sm font-medium text-foreground">AI 写作助手</span>
            {isLoading && (
              <Badge variant="secondary" className="text-xs">
                <Loader2 className="w-2 h-2 animate-spin mr-1" />
                思考中
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          {isExpanded && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearChat}
                className="h-6 w-6 p-0"
                title="清空对话"
                disabled={isLoading}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportChat}
                className="h-6 w-6 p-0"
                title="导出对话"
                disabled={messages.length <= 1}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                title="设置"
                disabled={isLoading}
              >
                <Settings className="w-3 h-3" />
              </Button>
            </>
          )}
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
          {/* 消息区域 */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-3">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 group",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center",
                      getMessageBadgeColor(message.type)
                    )}>
                      {getMessageIcon(message.type)}
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm relative",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-foreground"
                  )}>
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </div>
                    
                    {/* 操作按钮 */}
                    <div className={cn(
                      "flex items-center space-x-1 mt-2 transition-opacity",
                      "opacity-0 group-hover:opacity-100"
                    )}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(message.content)}
                        className="h-5 w-5 p-0"
                        title="复制内容"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>AI 正在思考...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 快速回复建议 */}
              {messages.length === 1 && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground font-medium">快速开始：</div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickReplies.map((reply, index) => {
                      const IconComponent = reply.icon;
                      return (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickReply(reply.text)}
                          className="text-xs h-8 p-2 text-left justify-start hover:bg-muted/50"
                          disabled={isLoading}
                        >
                          <IconComponent className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{reply.text}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <Separator />

          {/* 输入区域 */}
          <div className="p-3 flex-shrink-0">
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
                className="min-h-[60px] max-h-[120px] resize-none border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {isLoading ? "AI 正在回复..." : "按 Enter 发送，Shift+Enter 换行"}
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  className="h-8"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground text-center">
              AI 助手可帮助优化写作，请验证重要信息
            </div>
          </div>
        </div>
      )}
    </div>
  );
};