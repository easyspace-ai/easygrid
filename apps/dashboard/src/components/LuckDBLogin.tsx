/**
 * LuckDB 登录组件
 * 处理用户认证和 SDK 初始化
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, CheckCircle, AlertCircle, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/auth-store';

interface LuckDBLoginProps {
  onLoginSuccess: () => void;
}

export const LuckDBLogin = ({ onLoginSuccess }: LuckDBLoginProps) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('admin@126.com');
  const [password, setPassword] = useState('Pmker123');
  const [name, setName] = useState('新用户');
  const [confirmPassword, setConfirmPassword] = useState('Pmker123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { login, register } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await login(email, password);
      
      toast({
        title: "登录成功",
        description: "已成功连接到 LuckDB",
      });

      // 通知父组件登录成功
      onLoginSuccess();
      
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.message || '登录失败，请重试');
      toast({
        title: "登录失败",
        description: err.message || '请检查网络连接和凭据',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('请填写所有必填字段');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码长度至少6位');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      });
      
      toast({
        title: "注册成功",
        description: "欢迎使用 LuckDB！",
      });

      // 通知父组件登录成功
      onLoginSuccess();
      
    } catch (err: any) {
      console.error('注册失败:', err);
      setError(err.message || '注册失败，请重试');
      toast({
        title: "注册失败",
        description: err.message || '请检查输入信息',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isLoginMode) {
        handleLogin();
      } else {
        handleRegister();
      }
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-primary-foreground mx-auto mb-4">
            <Database className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl">
            {isLoginMode ? 'LuckDB 登录' : '注册账户'}
          </CardTitle>
          <CardDescription>
            {isLoginMode 
              ? '使用您的账号连接到 LuckDB 服务器'
              : '创建您的 LuckDB 账户'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoginMode && (
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="新用户"
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">邮箱地址</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@126.com"
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              required
            />
          </div>

          {!isLoginMode && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                required
              />
            </div>
          )}

          <Button
            onClick={isLoginMode ? handleLogin : handleRegister}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLoginMode ? '登录中...' : '注册中...'}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {isLoginMode ? '登录' : '注册账户'}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={toggleMode}
            disabled={isLoading}
          >
            {isLoginMode ? (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                没有账户？立即注册
              </>
            ) : (
              '已有账户？返回登录'
            )}
          </Button>

          {isLoginMode && (
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p><strong>服务器地址：</strong> http://localhost:2345 (通过代理)</p>
              <p><strong>默认账号：</strong> admin@126.com</p>
              <p><strong>默认密码：</strong> Pmker123</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
