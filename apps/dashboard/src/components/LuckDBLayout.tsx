/**
 * LuckDB 主布局组件
 * 重构后的三栏布局，集成 SDK 和 RealDataApp
 * 设计理念：专业、现代、高效
 */

import { useState, useEffect } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  PanelLeft, 
  PanelRight, 
  Database, 
  Calendar,
  Grid3X3,
  Settings,
  Bell,
  User,
  Search,
  MoreHorizontal,
  LogOut,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth-store";
import luckdb from "@/lib/luckdb";
import { LuckDBSidebar } from "./LuckDBSidebar";
import { LuckDBContent } from "./LuckDBContent";
import { LuckDBLogin } from "./LuckDBLogin";
import OfficialChat from "./OfficialChat";
import PromptManager from "./PromptManager";
import ModelManager from "./ModelManager";

export const LuckDBLayout = () => {
  // 认证状态
  const { isAuthenticated, user, logout, accessToken, _hasHydrated } = useAuthStore();
  
  // UI 状态
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'chat' | 'prompts' | 'models'>('chat');
  
  const { toast } = useToast();

  // 计算面板尺寸
  const getMainPanelSize = () => {
    if (leftSidebarOpen && rightSidebarOpen) return 60;
    if (leftSidebarOpen || rightSidebarOpen) return 80;
    return 100;
  };
  
  const getSidebarSize = () => {
    if (leftSidebarOpen && rightSidebarOpen) return 20;
    return 20;
  };

  // 强制重新渲染ResizablePanelGroup的key
  const panelGroupKey = `${leftSidebarOpen ? 'L' : 'l'}-${rightSidebarOpen ? 'R' : 'r'}`;

  // 切换侧边栏
  const toggleLeftSidebar = () => {
    setLeftSidebarOpen(!leftSidebarOpen);
  };

  const toggleRightSidebar = () => {
    setRightSidebarOpen(!rightSidebarOpen);
  };

  // 处理退出登录
  const handleLogout = async () => {
    try {
      await logout();
      setSelectedTableId(null);
      setSelectedTableName(null);
      toast({
        title: "已退出登录",
        description: "已清除登录状态",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "退出登录失败",
        description: "请重试",
        variant: "destructive",
      });
    }
  };

  // 处理表格选择
  const handleTableSelect = (tableId: string, tableName: string) => {
    setSelectedTableId(tableId);
    setSelectedTableName(tableName);
  };

  // 添加延迟以确保DOM更新完成
  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    
    return () => clearTimeout(timer);
  }, [leftSidebarOpen, rightSidebarOpen]);

  // ✅ 等待 Zustand persist hydration 完成
  if (!_hasHydrated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
          <div>
            <h3 className="text-sm font-medium text-foreground">正在加载</h3>
            <p className="text-xs text-muted-foreground mt-1">恢复登录状态...</p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Hydration 完成后，再判断是否已登录
  if (!isAuthenticated) {
    return <LuckDBLogin onLoginSuccess={() => {}} />;
  }

  return (
    <div className="h-screen bg-background text-foreground overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="h-12 bg-background border-b border-border flex items-center justify-between px-4 flex-shrink-0">
        {/* 左侧导航 */}
        <div className="flex items-center space-x-2">
          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
            <Calendar className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </div>

        {/* 中间标题 */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Year 2025 &gt; Week 42 &gt;</span>
          <Calendar className="w-4 h-4" />
          <span className="text-sm font-medium">2025-10-16</span>
        </div>

        {/* 右侧导航 */}
        <div className="flex items-center space-x-2">
          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          
          {/* 用户信息 */}
          {user && (
            <div className="flex items-center space-x-2 px-2 py-1 rounded-md bg-muted/50">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <span className="text-sm font-medium">{user.name || user.email}</span>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="p-1.5 hover:bg-muted rounded-md transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="h-[calc(100vh-3rem)]">
        <ResizablePanelGroup 
          direction="horizontal" 
          className="h-full"
          key={panelGroupKey}
        >
          {/* 左侧边栏 - LuckDB 数据 */}
          {leftSidebarOpen && (
            <>
              <ResizablePanel defaultSize={getSidebarSize()} minSize={15} maxSize={35}>
                <LuckDBSidebar 
                  onTableSelect={handleTableSelect}
                  className="h-full"
                />
              </ResizablePanel>
              <ResizableHandle className="w-1 bg-border hover:bg-border/80 transition-colors" />
            </>
          )}
          
          {/* 中间主内容区域 */}
          <ResizablePanel defaultSize={getMainPanelSize()} minSize={40}>
            <LuckDBContent 
              selectedTableId={selectedTableId}
              selectedTableName={selectedTableName}
              className="h-full"
            />
          </ResizablePanel>
          
          {/* 右侧边栏 - AI 助手 */}
          {rightSidebarOpen && (
            <>
              <ResizableHandle className="w-1 bg-border hover:bg-border/80 transition-colors" />
              <ResizablePanel defaultSize={getSidebarSize()} minSize={15} maxSize={35}>
                <div className="h-full flex flex-col overflow-hidden">
                  {/* 右侧边栏头部 */}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-background/95 backdrop-blur-sm border-b border-border flex-shrink-0">
                    <div className="flex items-center space-x-1">
                      {/* 聊天标签 */}
                      <button 
                        onClick={() => setRightTab('chat')} 
                        className={cn(
                          "relative px-2.5 py-1.5 rounded-md transition-all duration-200 flex items-center space-x-1.5",
                          rightTab === 'chat' 
                            ? "bg-primary/10 text-primary shadow-sm" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                        title="AI 聊天"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-xs font-normal">聊天</span>
                      </button>
                      
                      {/* 提示标签 */}
                      <button 
                        onClick={() => setRightTab('prompts')} 
                        className={cn(
                          "relative px-2.5 py-1.5 rounded-md transition-all duration-200 flex items-center space-x-1.5",
                          rightTab === 'prompts' 
                            ? "bg-primary/10 text-primary shadow-sm" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                        title="提示词管理"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-xs font-normal">提示</span>
                      </button>
                      
                      {/* 模型标签 */}
                      <button 
                        onClick={() => setRightTab('models')} 
                        className={cn(
                          "relative px-2.5 py-1.5 rounded-md transition-all duration-200 flex items-center space-x-1.5",
                          rightTab === 'models' 
                            ? "bg-primary/10 text-primary shadow-sm" 
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                        title="模型配置"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span className="text-xs font-normal">模型</span>
                      </button>
                    </div>
                    
                    {/* 关闭按钮 */}
                    <button 
                      onClick={toggleRightSidebar}
                      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-all duration-200"
                      title="关闭侧边栏"
                    >
                      <PanelRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  {/* 右侧边栏内容 */}
                  <div className="flex-1 min-h-0">
                    {rightTab === 'chat' ? <OfficialChat /> : rightTab === 'prompts' ? <PromptManager /> : <ModelManager />}
                  </div>
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* 侧边栏切换按钮 - 当侧边栏关闭时显示 */}
      {!leftSidebarOpen && (
        <button 
          onClick={toggleLeftSidebar}
          className="fixed left-4 top-16 z-50 p-2 bg-background border border-border rounded-md shadow-lg hover:bg-muted transition-colors"
          title="打开数据侧边栏"
        >
          <PanelRight className="w-4 h-4" />
        </button>
      )}
      
      {!rightSidebarOpen && (
        <button 
          onClick={toggleRightSidebar}
          className="fixed right-4 top-16 z-50 p-2 bg-background border border-border rounded-md shadow-lg hover:bg-muted transition-colors"
          title="打开AI助手"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
