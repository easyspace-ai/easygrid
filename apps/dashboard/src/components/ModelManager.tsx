'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useModelSettings } from '@/hooks/useModelSettings';
import { getAllProviders, getProviderSpec, addCustomOpenAIProvider, listProfiles, upsertProfile, removeProfile } from '@/lib/providers';
import { 
  Trash2, 
  Plus, 
  Pencil, 
  Star, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Settings,
  Zap,
  Globe,
  Key,
  Cpu,
  TestTube,
  Copy,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Shield,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ModelProfile {
  id: string;
  name: string;
  provider: string;
  baseUrl?: string;
  apiToken?: string;
  model?: string;
  isDefault?: boolean;
}

export default function ModelManager() {
  const { settings, update } = useModelSettings();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [profiles, setProfiles] = useState<ModelProfile[]>(() => listProfiles());
  const [showDialog, setShowDialog] = useState(false);
  const [draft, setDraft] = useState<ModelProfile>({ 
    id: '', 
    name: '', 
    provider: settings.provider, 
    baseUrl: settings.baseUrl || '', 
    apiToken: settings.apiToken || '', 
    model: settings.model || '', 
    isDefault: false 
  });
  const [activeTab, setActiveTab] = useState<'profiles' | 'providers' | 'custom'>('profiles');

  // 刷新配置列表
  const refreshProfiles = () => {
    setProfiles(listProfiles());
  };

  // 测试连接
  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const spec = getProviderSpec(settings.provider);
      if (spec?.test) {
        await spec.test({ 
          baseUrl: settings.baseUrl || '', 
          apiToken: settings.apiToken || '', 
          model: settings.model || '' 
        });
        setTestResult({ type: 'success', message: '连接测试成功' });
        toast({
          title: "连接成功",
          description: "模型配置测试通过",
        });
      } else {
        setTestResult({ type: 'info', message: '当前提供商无需测试' });
      }
    } catch (e: any) {
      const errorMessage = e?.message || '未知错误';
      setTestResult({ type: 'error', message: `连接失败：${errorMessage}` });
      toast({
        title: "连接失败",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  // 打开添加/编辑对话框
  const openAdd = () => {
    setDraft({ 
      id: `${Date.now()}`, 
      name: '', 
      provider: settings.provider, 
      baseUrl: '', 
      apiToken: '', 
      model: '', 
      isDefault: profiles.length === 0 
    });
    setShowDialog(true);
  };

  const openEdit = (profile: ModelProfile) => {
    setDraft({ ...profile });
    setShowDialog(true);
  };

  // 保存配置
  const saveDraft = () => {
    if (!draft.name.trim()) {
      toast({
        title: "配置名称不能为空",
        description: "请输入一个有意义的配置名称",
        variant: "destructive",
      });
      return;
    }

    upsertProfile(draft);
    refreshProfiles();
    
    // 如果设为默认，立即应用
    if (draft.isDefault) {
      update({ 
        provider: draft.provider as any, 
        baseUrl: draft.baseUrl, 
        apiToken: draft.apiToken, 
        model: draft.model 
      });
    }
    
    setShowDialog(false);
    toast({
      title: "配置已保存",
      description: draft.isDefault ? "已设为默认配置，刷新页面后仍然有效" : "配置已保存到本地存储，刷新页面后仍然有效",
    });
  };

  // 删除配置
  const deleteProfile = (profile: ModelProfile) => {
    if (profile.isDefault) {
      toast({
        title: "无法删除默认配置",
        description: "请先设置其他配置为默认",
        variant: "destructive",
      });
      return;
    }
    
    removeProfile(profile.id);
    refreshProfiles();
    toast({
      title: "配置已删除",
      description: `${profile.name} 已删除`,
    });
  };

  // 设为默认
  const setAsDefault = (profile: ModelProfile) => {
    upsertProfile({ ...profile, isDefault: true });
    refreshProfiles();
    update({ 
      provider: profile.provider as any, 
      baseUrl: profile.baseUrl, 
      apiToken: profile.apiToken, 
      model: profile.model 
    });
    toast({
      title: "默认配置已更新",
      description: `${profile.name} 已设为默认`,
    });
  };

  // 应用配置
  const applyProfile = (profile: ModelProfile) => {
    update({ 
      provider: profile.provider as any, 
      baseUrl: profile.baseUrl, 
      apiToken: profile.apiToken, 
      model: profile.model 
    });
    toast({
      title: "配置已应用",
      description: `已切换到 ${profile.name}`,
    });
  };

  // 复制配置
  const copyProfile = (profile: ModelProfile) => {
    const newProfile = {
      ...profile,
      id: `${Date.now()}`,
      name: `${profile.name} (副本)`,
      isDefault: false
    };
    upsertProfile(newProfile);
    refreshProfiles();
    toast({
      title: "配置已复制",
      description: `已创建 ${newProfile.name}`,
    });
  };

  // 添加自定义提供商
  const addCustomProvider = () => {
    const name = (document.getElementById('customName') as HTMLInputElement)?.value?.trim();
    const id = (document.getElementById('customId') as HTMLInputElement)?.value?.trim();
    const baseUrl = (document.getElementById('customBaseUrl') as HTMLInputElement)?.value?.trim();
    
    if (!name || !id) {
      toast({
        title: "信息不完整",
        description: "请填写提供商名称和ID",
        variant: "destructive",
      });
      return;
    }
    
    addCustomOpenAIProvider(name, id, baseUrl || undefined);
    toast({
      title: "自定义提供商已添加",
      description: `${name} 已添加到提供商列表`,
    });
    
    // 清空表单
    (document.getElementById('customName') as HTMLInputElement).value = '';
    (document.getElementById('customId') as HTMLInputElement).value = '';
    (document.getElementById('customBaseUrl') as HTMLInputElement).value = '';
  };

  // 获取提供商图标
  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'ollama': return <Cpu className="w-4 h-4" />;
      case 'openai': return <Sparkles className="w-4 h-4" />;
      case 'siliconflow': return <Globe className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  // 获取提供商颜色
  const getProviderColor = (providerId: string) => {
    switch (providerId) {
      case 'ollama': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'openai': return 'bg-green-100 text-green-800 border-green-200';
      case 'siliconflow': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden bg-background">
      {/* 头部 */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600">模型管理器</h2>
              <p className="text-xs text-gray-400">管理 AI 模型配置和提供商</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing}
              className="h-8"
            >
              {testing ? (
                <Activity className="w-3 h-3 animate-pulse mr-2" />
              ) : (
                <TestTube className="w-3 h-3 mr-2" />
              )}
              测试连接
            </Button>
          </div>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex space-x-0">
          {[
            { id: 'profiles', label: '配置档案', icon: Star },
            { id: 'providers', label: '提供商', icon: Globe },
            { id: 'custom', label: '自定义', icon: Plus }
          ].map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
                  activeTab === tab.id
                    ? "text-primary border-primary bg-primary/5"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50"
                )}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* 测试结果 */}
        {testResult && (
          <Alert className={cn(
            "border-l-4",
            testResult.type === 'success' && "border-green-500 bg-green-50",
            testResult.type === 'error' && "border-red-500 bg-red-50",
            testResult.type === 'info' && "border-blue-500 bg-blue-50"
          )}>
            <div className="flex items-center space-x-2">
              {testResult.type === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
              {testResult.type === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
              {testResult.type === 'info' && <AlertCircle className="w-4 h-4 text-blue-600" />}
              <AlertDescription className="text-sm">
                {testResult.message}
              </AlertDescription>
              </div>
          </Alert>
        )}

        {/* 配置档案标签页 */}
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-gray-600">配置档案</h3>
                <p className="text-xs text-gray-400">管理你的模型配置档案</p>
              </div>
              <Button onClick={openAdd} size="sm" className="h-8">
                <Plus className="w-4 h-4 mr-2" />
                新建配置
              </Button>
            </div>

            {profiles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                  <h4 className="text-xs font-medium text-gray-600 mb-2">暂无配置档案</h4>
                  <p className="text-xs text-gray-400 text-center mb-4">
                    创建你的第一个模型配置档案，开始使用 AI 助手
                  </p>
                  <Button onClick={openAdd}>
                    <Plus className="w-4 h-4 mr-2" />
                    创建配置
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {profiles.map((profile) => (
                  <Card key={profile.id} className={cn(
                    "transition-all duration-200 hover:shadow-md",
                    profile.isDefault && "ring-2 ring-primary/20 bg-primary/5"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg",
                            getProviderColor(profile.provider)
                          )}>
                            {getProviderIcon(profile.provider)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-xs font-medium text-gray-600">{profile.name}</h4>
                              {profile.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  <Star className="w-3 h-3 mr-1" />
                                  默认
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-gray-400">
                              <span className="flex items-center space-x-1">
                                <Cpu className="w-3 h-3" />
                                <span>{profile.model}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Globe className="w-3 h-3" />
                                <span className="truncate max-w-32">{profile.baseUrl}</span>
                              </span>
                            </div>
                          </div>
        </div>

                        <div className="flex items-center space-x-2">
                          {!profile.isDefault && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => applyProfile(profile)}
                              className="h-8"
                            >
                              应用
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyProfile(profile)}
                            className="h-8 w-8 p-0"
                            title="复制配置"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(profile)}
                            className="h-8 w-8 p-0"
                            title="编辑配置"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {!profile.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAsDefault(profile)}
                              className="h-8 w-8 p-0"
                              title="设为默认"
                            >
                              <Star className="w-4 h-4" />
                            </Button>
                          )}
                          {!profile.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteProfile(profile)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              title="删除配置"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 提供商标签页 */}
        {activeTab === 'providers' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-medium text-gray-600">提供商</h3>
              <p className="text-xs text-gray-400">选择和管理 AI 模型提供商</p>
            </div>

            <div className="grid gap-3">
              {getAllProviders().map((provider) => (
                <Card key={provider.id} className={cn(
                  "transition-all duration-200 hover:shadow-md cursor-pointer",
                  settings.provider === provider.id && "ring-2 ring-primary/20 bg-primary/5"
                )}>
                  <CardContent 
                    className="p-4"
                    onClick={() => update({ provider: provider.id })}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg",
                          getProviderColor(provider.id)
                        )}>
                          {getProviderIcon(provider.id)}
          </div>
                        <div>
                          <h4 className="text-xs font-medium text-gray-600">{provider.name}</h4>
                          <p className="text-xs text-gray-400">AI 模型提供商</p>
          </div>
        </div>

                      <div className="flex items-center space-x-2">
                        {settings.provider === provider.id && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            当前
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 当前配置详情 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xs font-medium text-gray-600">当前配置</CardTitle>
                    <CardDescription className="text-xs text-gray-400">当前选中提供商的配置参数</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      自动保存
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {(getProviderSpec(settings.provider)?.fields || []).map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key} className="text-xs font-normal text-gray-500">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
            <Input
                      id={field.key}
                      type={field.type === 'password' ? 'password' : 'text'}
                      placeholder={field.placeholder}
                      value={(settings as any)[field.key] || ''}
                      onChange={(e) => update({ [field.key]: e.target.value } as any)}
                      className="h-9"
            />
          </div>
        ))}
                
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-400">
                      配置会自动保存到本地存储，刷新页面后仍然有效
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testConnection}
                      disabled={testing}
                      className="h-8"
                    >
                      {testing ? (
                        <Activity className="w-3 h-3 animate-pulse mr-2" />
                      ) : (
                        <TestTube className="w-3 h-3 mr-2" />
                      )}
                      测试连接
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 自定义标签页 */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-medium text-gray-600">自定义提供商</h3>
              <p className="text-xs text-gray-400">添加自定义的 OpenAI 兼容提供商</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-medium text-gray-600">添加自定义提供商</CardTitle>
                <CardDescription className="text-xs text-gray-400">支持任何 OpenAI 兼容的 API 服务</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customName" className="text-xs font-normal text-gray-500">
                      提供商名称
                    </Label>
                    <Input
                      id="customName"
                      placeholder="例如：SiliconFlow 或 自建 OpenAI"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customId" className="text-xs font-normal text-gray-500">
                      提供商 ID
                    </Label>
                    <Input
                      id="customId"
                      placeholder="例如：my-openai"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customBaseUrl" className="text-xs font-normal text-gray-500">
                      Base URL（可选）
                    </Label>
                    <Input
                      id="customBaseUrl"
                      placeholder="https://api.example.com/v1"
                      className="h-9"
                    />
        </div>
      </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-gray-400">
                    添加后将出现在提供商列表中
                  </div>
                  <Button onClick={addCustomProvider} size="sm" className="h-8">
                    <Plus className="w-4 h-4 mr-2" />
                    添加提供商
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 配置对话框 */}
      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-background border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-medium text-gray-600">
                    {draft.id && draft.id !== `${Date.now()}` ? '编辑配置' : '新建配置'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {draft.id && draft.id !== `${Date.now()}` ? '修改现有配置档案' : '创建新的模型配置档案'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDialog(false)}
                  className="h-8 w-8 p-0"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="draftName" className="text-xs font-normal text-gray-500">
                      配置名称 *
                    </Label>
                    <Input
                      id="draftName"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="例如：Ollama 本地 / SiliconFlow 生产"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="draftProvider" className="text-xs font-normal text-gray-500">
                      提供商
                    </Label>
                    <Input
                      id="draftProvider"
                      value={draft.provider}
                      onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
                      placeholder="ollama / siliconflow / my-openai"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="draftModel" className="text-xs font-normal text-gray-500">
                    模型名称
                  </Label>
                  <Input
                    id="draftModel"
                    value={draft.model}
                    onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                    placeholder="例如：llama3:latest / Qwen/Qwen3-8B"
                    className="h-9"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="draftBaseUrl" className="text-xs font-normal text-gray-500">
                    Base URL
                  </Label>
                  <Input
                    id="draftBaseUrl"
                    value={draft.baseUrl}
                    onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                    placeholder="http://localhost:11434 或 https://api.siliconflow.cn/v1"
                    className="h-9"
                  />
              </div>

                <div className="space-y-2">
                  <Label htmlFor="draftApiToken" className="text-xs font-normal text-gray-500">
                    API Key
                  </Label>
                  <Input
                    id="draftApiToken"
                    type="password"
                    value={draft.apiToken}
                    onChange={(e) => setDraft({ ...draft, apiToken: e.target.value })}
                    placeholder="sk-... (部分提供商必填)"
                    className="h-9"
                  />
              </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="draftIsDefault"
                    checked={draft.isDefault}
                    onCheckedChange={(checked) => setDraft({ ...draft, isDefault: checked })}
                  />
                  <Label htmlFor="draftIsDefault" className="text-xs font-normal text-gray-500">
                    设为默认配置
                  </Label>
              </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setShowDialog(false)}
                  className="h-9"
                >
                  取消
                </Button>
                <Button
                  onClick={saveDraft}
                  className="h-9"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  保存配置
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}