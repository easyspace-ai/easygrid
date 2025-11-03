/**
 * LuckDB 主内容区域
 * 集成 RealDataApp，显示表格数据
 * 设计理念：专业、高效、用户友好
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Database, 
  Table, 
  RefreshCw, 
  Settings, 
  Share2, 
  Download,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import RealDataApp from './RealDataApp';

interface LuckDBContentProps {
  selectedTableId: string | null;
  selectedTableName: string | null;
  className?: string;
}

export const LuckDBContent = ({ 
  selectedTableId, 
  selectedTableName, 
  className 
}: LuckDBContentProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // 处理表格选择
  useEffect(() => {
    if (selectedTableId && selectedTableName) {
      setIsLoading(true);
      
      // 模拟加载延迟
      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "表格已加载",
          description: `正在显示表格: ${selectedTableName}`,
        });
      }, 500);
    }
  }, [selectedTableId, selectedTableName, toast]);

  // 空状态 - 未选择表格
  if (!selectedTableId || !selectedTableName) {
    return (
      <div className={cn("h-full bg-background flex flex-col", className)}>
        {/* 头部 */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">LuckDB 数据视图</h1>
                <p className="text-sm text-muted-foreground">选择左侧表格开始查看数据</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" disabled>
                <Settings className="w-4 h-4 mr-2" />
                设置
              </Button>
            </div>
          </div>
        </div>

        {/* 空状态内容 */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Table className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            欢迎使用 LuckDB
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            从左侧边栏选择一个表格来开始查看和编辑数据。您可以浏览所有的 Space、Base 和 Table。
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-3 mx-auto">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="font-medium text-foreground mb-1">浏览数据</h3>
              <p className="text-sm text-muted-foreground">
                查看所有 Space、Base 和 Table 的层级结构
              </p>
            </div>
            
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-3 mx-auto">
                <Table className="w-4 h-4" />
              </div>
              <h3 className="font-medium text-foreground mb-1">编辑表格</h3>
              <p className="text-sm text-muted-foreground">
                选择表格后可以查看、编辑和管理数据
              </p>
            </div>
            
            <div className="p-4 rounded-lg border border-border bg-card">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-3 mx-auto">
                <Settings className="w-4 h-4" />
              </div>
              <h3 className="font-medium text-foreground mb-1">管理数据</h3>
              <p className="text-sm text-muted-foreground">
                添加、修改、删除字段和记录
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className={cn("h-full bg-background flex flex-col", className)}>
        {/* 头部 */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                <Table className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{selectedTableName}</h1>
                <p className="text-sm text-muted-foreground">正在加载表格数据...</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>

        {/* 加载内容 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">正在加载表格数据...</p>
          </div>
        </div>
      </div>
    );
  }

  // 表格内容 - 集成 RealDataApp
  return (
    <div className={cn("h-full bg-background flex flex-col", className)}>
      {/* 头部工具栏 */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{selectedTableName}</h1>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  已连接
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Table ID: {selectedTableId}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="w-4 h-4 mr-2" />
              分享
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              导出
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
          </div>
        </div>
      </div>

      {/* 主内容区域 - 集成完整的 RealDataApp */}
      <div className="flex-1 min-h-0">
        <RealDataApp 
          tableId={selectedTableId}
          tableName={selectedTableName}
        />
      </div>
    </div>
  );
};
