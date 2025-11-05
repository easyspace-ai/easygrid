/**
 * 真实数据演示应用
 * 使用 EasyGridPro 组件对接真实数据
 * 完全参考 grid-demo 项目的实现方式
 */

import React, { useMemo, useRef, useEffect } from "react";
import { EasyGrid } from "@easygrid/grid";
import { ZustandAuthStore } from "@/lib/zustand-auth-store";
import { useAuthStore } from "@/stores/auth-store";

// 导入样式
// 注意：dashboard 使用自有 Tailwind 配置，不直接导入 grid 包的 index.css（v4 样式入口），避免与本项目 Tailwind 版本冲突。

interface RealDataAppProps {
  tableId: string | null;
  tableName?: string | null;
}

function RealDataApp({ tableId, tableName }: RealDataAppProps) {
  // 等待 Zustand store hydration 完成
  const { _hasHydrated, isAuthenticated, accessToken, user } = useAuthStore();
  
  // 创建认证适配器实例（使用 ref 确保单例，等待 hydration 完成后创建）
  const authStoreRef = useRef<ZustandAuthStore | null>(null);
  
  useEffect(() => {
    // 等待 hydration 完成后再创建 authStore
    if (_hasHydrated && !authStoreRef.current) {
      authStoreRef.current = new ZustandAuthStore();
      console.log('✅ ZustandAuthStore 已创建，认证状态:', {
        isAuthenticated,
        hasToken: !!accessToken,
        hasUser: !!user
      });
    }
    
    return () => {
      if (authStoreRef.current) {
        authStoreRef.current.destroy();
        authStoreRef.current = null;
      }
    };
  }, [_hasHydrated, isAuthenticated, accessToken, user]);

  // 获取服务器地址
  const server = useMemo(() => {
    return (
      import.meta.env.VITE_LUCKDB_SERVER_URL ||
      import.meta.env.VITE_API_URL ||
      "http://localhost:8080"
    );
  }, []);

  // 未配置状态
  if (!tableId) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h3 className="text-lg font-medium text-foreground">
            请选择一个表格
          </h3>
          <p className="text-sm text-muted-foreground">
            从左侧边栏选择一个表格来查看数据
          </p>
        </div>
      </div>
    );
  }

  // 已配置，显示数据视图
  // 等待 authStore 初始化完成后再渲染 EasyGridPro
  if (!_hasHydrated || !authStoreRef.current) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">正在初始化...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 配置信息栏 */}
      <div className="px-4 py-3 border-b border-border bg-muted/50 flex items-center gap-3 text-sm">
        <span className="text-muted-foreground font-medium">真实数据模式：</span>
        <span className="text-primary font-mono">{server}</span>
        <span className={isAuthenticated && accessToken ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {isAuthenticated && accessToken ? "✓ 已认证" : "✗ 未认证"}
        </span>
        <span className="text-green-600 dark:text-green-400">
          ✓ 表格: {tableId}
        </span>
        {tableName && (
          <span className="text-muted-foreground">📋 {tableName}</span>
        )}
      </div>

      {/* 主视图 - 使用 EasyGridPro */}
      <div className="flex-1 min-h-0">
        <EasyGridPro
          server={server}
          tableId={tableId}
          authStore={authStoreRef.current}
          height={undefined} // 使用父容器高度
        />
      </div>
    </div>
  );
}

export default RealDataApp;
