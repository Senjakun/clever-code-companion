import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Key, Save, Eye, EyeOff, Loader2, Mail, Send, CheckCircle, AlertCircle, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EmailTemplates from '@/components/EmailTemplates';

interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  credits: number;
  created_at: string;
}

interface ApiKey {
  id: string;
  key_name: string;
  key_value: string;
  created_at: string;
}

interface SmtpConfig {
  host: string;
  port: string;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: 'none' | 'ssl' | 'tls';
  enabled: boolean;
}

export default function Admin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCredits, setEditingCredits] = useState<{ [key: string]: string }>({});
  const [savingCredits, setSavingCredits] = useState<{ [key: string]: boolean }>({});
  
  const [geminiKey, setGeminiKey] = useState('');
  const [deepseekKey, setDeepseekKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showDeepseek, setShowDeepseek] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [testingDeepseek, setTestingDeepseek] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [deepseekStatus, setDeepseekStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [groqStatus, setGroqStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // SMTP State
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: '',
    port: '587',
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    encryption: 'tls',
    enabled: false,
  });
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading } = useAuthContext();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        navigate('/dashboard');
        toast({ title: 'Access denied', description: 'Admin access required', variant: 'destructive' });
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch users
    const { data: usersData } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (usersData) {
      setUsers(usersData);
      const creditsMap: { [key: string]: string } = {};
      usersData.forEach((u) => {
        creditsMap[u.user_id] = u.credits.toString();
      });
      setEditingCredits(creditsMap);
    }

    // Fetch API keys including SMTP config
    const { data: keysData } = await supabase
      .from('api_keys')
      .select('*');
    
    if (keysData) {
      setApiKeys(keysData);
      keysData.forEach((k) => {
        if (k.key_name === 'gemini') setGeminiKey(k.key_value);
        if (k.key_name === 'deepseek') setDeepseekKey(k.key_value);
        if (k.key_name === 'groq') setGroqKey(k.key_value);
        if (k.key_name === 'smtp_config') {
          try {
            const config = JSON.parse(k.key_value);
            setSmtp(config);
          } catch (e) {
            console.error('Failed to parse SMTP config');
          }
        }
      });
    }

    setLoading(false);
  };

  const handleUpdateCredits = async (userId: string) => {
    const newCredits = parseFloat(editingCredits[userId]);
    if (isNaN(newCredits) || newCredits < 0) {
      toast({ title: 'Invalid credits', description: 'Please enter a valid number', variant: 'destructive' });
      return;
    }

    setSavingCredits((prev) => ({ ...prev, [userId]: true }));

    const { error } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update credits', variant: 'destructive' });
    } else {
      toast({ title: 'Credits updated' });
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, credits: newCredits } : u));
    }

    setSavingCredits((prev) => ({ ...prev, [userId]: false }));
  };

  const handleSaveApiKeys = async () => {
    setSavingKeys(true);

    const keys = [
      { key_name: 'gemini', key_value: geminiKey },
      { key_name: 'deepseek', key_value: deepseekKey },
      { key_name: 'groq', key_value: groqKey },
    ];

    for (const key of keys) {
      if (!key.key_value.trim()) continue;

      const existing = apiKeys.find((k) => k.key_name === key.key_name);
      
      if (existing) {
        await supabase
          .from('api_keys')
          .update({ key_value: key.key_value })
          .eq('key_name', key.key_name);
      } else {
        await supabase
          .from('api_keys')
          .insert(key);
      }
    }

    toast({ title: 'API Keys saved' });
    setSavingKeys(false);
    fetchData();
  };

  const handleTestApiKey = async (provider: 'gemini' | 'deepseek' | 'groq') => {
    const apiKeyMap: Record<string, string> = {
      gemini: geminiKey,
      deepseek: deepseekKey,
      groq: groqKey,
    };
    const apiKey = apiKeyMap[provider];
    
    const providerNames: Record<string, string> = {
      gemini: 'Gemini',
      deepseek: 'DeepSeek',
      groq: 'Groq',
    };
    
    if (!apiKey.trim()) {
      toast({ 
        title: 'API Key Required', 
        description: `Please enter a ${providerNames[provider]} API key first`,
        variant: 'destructive' 
      });
      return;
    }

    // Set testing state
    if (provider === 'gemini') { setTestingGemini(true); setGeminiStatus('idle'); }
    else if (provider === 'deepseek') { setTestingDeepseek(true); setDeepseekStatus('idle'); }
    else if (provider === 'groq') { setTestingGroq(true); setGroqStatus('idle'); }

    try {
      const { data, error } = await supabase.functions.invoke('test-api-key', {
        body: { provider, apiKey }
      });

      if (error) throw error;

      const setStatus = (status: 'success' | 'error') => {
        if (provider === 'gemini') setGeminiStatus(status);
        else if (provider === 'deepseek') setDeepseekStatus(status);
        else if (provider === 'groq') setGroqStatus(status);
      };

      if (data.success) {
        setStatus('success');
        toast({ 
          title: 'Connection Successful!',
          description: data.message,
        });
      } else {
        setStatus('error');
        toast({ 
          title: 'Connection Failed',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Test API key error:', error);
      if (provider === 'gemini') setGeminiStatus('error');
      else if (provider === 'deepseek') setDeepseekStatus('error');
      else if (provider === 'groq') setGroqStatus('error');
      toast({ 
        title: 'Test Failed',
        description: error.message || 'Failed to test API key',
        variant: 'destructive',
      });
    } finally {
      if (provider === 'gemini') setTestingGemini(false);
      else if (provider === 'deepseek') setTestingDeepseek(false);
      else if (provider === 'groq') setTestingGroq(false);
    }
  };

  const handleSaveSmtp = async () => {
    setSavingSmtp(true);

    const smtpConfigValue = JSON.stringify(smtp);
    const existing = apiKeys.find((k) => k.key_name === 'smtp_config');

    if (existing) {
      await supabase
        .from('api_keys')
        .update({ key_value: smtpConfigValue })
        .eq('key_name', 'smtp_config');
    } else {
      await supabase
        .from('api_keys')
        .insert({ key_name: 'smtp_config', key_value: smtpConfigValue });
    }

    toast({ title: 'SMTP Configuration saved' });
    setSavingSmtp(false);
    fetchData();
  };

  const handleTestSmtp = async () => {
    if (!testEmail.trim()) {
      toast({ title: 'Error', description: 'Please enter a test email address', variant: 'destructive' });
      return;
    }

    // Save SMTP config first
    await handleSaveSmtp();

    setTestingSmtp(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: testEmail,
          subject: 'Test Email - SMTP Configuration',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
              <h1 style="color: #333;">SMTP Test Successful! ✅</h1>
              <p>Congratulations! Your SMTP configuration is working correctly.</p>
              <p><strong>SMTP Host:</strong> ${smtp.host}</p>
              <p><strong>Port:</strong> ${smtp.port}</p>
              <p><strong>Encryption:</strong> ${smtp.encryption.toUpperCase()}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="color: #666; font-size: 12px;">This is a test email sent from your admin panel.</p>
            </div>
          `,
          text: `SMTP Test Successful! Your SMTP configuration is working correctly. Host: ${smtp.host}, Port: ${smtp.port}`,
        },
      });

      if (error) throw error;

      toast({ 
        title: 'Test Email Sent', 
        description: `A test email has been sent to ${testEmail}`,
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      toast({ 
        title: 'Failed to send test email', 
        description: error.message || 'Check your SMTP configuration',
        variant: 'destructive',
      });
    }

    setTestingSmtp(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground">Manage users, API keys, and email settings</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email/SMTP
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage user credits</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.user_id}>
                          <TableCell className="font-medium">{u.email || 'N/A'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={editingCredits[u.user_id] || ''}
                                onChange={(e) => setEditingCredits((prev) => ({ ...prev, [u.user_id]: e.target.value }))}
                                className="w-24 h-8"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateCredits(u.user_id)}
                              disabled={savingCredits[u.user_id]}
                            >
                              {savingCredits[u.user_id] ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="api-keys">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardHeader>
                  <CardTitle>API Key Management</CardTitle>
                  <CardDescription>Configure AI provider API keys (stored securely in database)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Gemini API Key */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Google Gemini API Key</Label>
                      {geminiStatus === 'success' && (
                        <div className="flex items-center gap-1 text-green-500 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          <span>Connected</span>
                        </div>
                      )}
                      {geminiStatus === 'error' && (
                        <div className="flex items-center gap-1 text-red-500 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showGemini ? 'text' : 'password'}
                          placeholder="AIza..."
                          value={geminiKey}
                          onChange={(e) => {
                            setGeminiKey(e.target.value);
                            setGeminiStatus('idle');
                          }}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowGemini(!showGemini)}
                        >
                          {showGemini ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => handleTestApiKey('gemini')}
                        disabled={testingGemini || !geminiKey.trim()}
                        className="gap-2 shrink-0"
                      >
                        {testingGemini ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        Test
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
                    </p>
                  </div>

                  {/* DeepSeek API Key */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>DeepSeek API Key (Logic Engine)</Label>
                      {deepseekStatus === 'success' && (
                        <div className="flex items-center gap-1 text-green-500 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          <span>Connected</span>
                        </div>
                      )}
                      {deepseekStatus === 'error' && (
                        <div className="flex items-center gap-1 text-red-500 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showDeepseek ? 'text' : 'password'}
                          placeholder="sk-..."
                          value={deepseekKey}
                          onChange={(e) => {
                            setDeepseekKey(e.target.value);
                            setDeepseekStatus('idle');
                          }}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowDeepseek(!showDeepseek)}
                        >
                          {showDeepseek ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => handleTestApiKey('deepseek')}
                        disabled={testingDeepseek || !deepseekKey.trim()}
                        className="gap-2 shrink-0"
                      >
                        {testingDeepseek ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        Test
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your API key from <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DeepSeek Platform</a>
                    </p>
                  </div>

                  {/* Groq API Key */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Groq API Key (Fast Executor)</Label>
                      {groqStatus === 'success' && (
                        <div className="flex items-center gap-1 text-green-500 text-xs">
                          <CheckCircle className="h-3 w-3" />
                          <span>Connected</span>
                        </div>
                      )}
                      {groqStatus === 'error' && (
                        <div className="flex items-center gap-1 text-red-500 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>Failed</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showGroq ? 'text' : 'password'}
                          placeholder="gsk_..."
                          value={groqKey}
                          onChange={(e) => {
                            setGroqKey(e.target.value);
                            setGroqStatus('idle');
                          }}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowGroq(!showGroq)}
                        >
                          {showGroq ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => handleTestApiKey('groq')}
                        disabled={testingGroq || !groqKey.trim()}
                        className="gap-2 shrink-0"
                      >
                        {testingGroq ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        Test
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Get your API key from <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Groq Console</a>
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <Button onClick={handleSaveApiKeys} disabled={savingKeys} className="gap-2">
                      {savingKeys ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save All API Keys
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    API keys are stored securely in the database and used server-side only via Edge Functions.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="email">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* SMTP Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Service Status
                      </CardTitle>
                      <CardDescription>Configure SMTP settings for sending emails</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {smtp.enabled ? (
                        <div className="flex items-center gap-2 text-green-500">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Enabled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <AlertCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Disabled</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* SMTP Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>SMTP Configuration</CardTitle>
                  <CardDescription>Enter your SMTP server details for sending emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="space-y-0.5">
                      <Label>Enable SMTP</Label>
                      <p className="text-xs text-muted-foreground">Turn on to enable email sending</p>
                    </div>
                    <Switch
                      checked={smtp.enabled}
                      onCheckedChange={(checked) => setSmtp({ ...smtp, enabled: checked })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SMTP Host</Label>
                      <Input
                        placeholder="smtp.gmail.com"
                        value={smtp.host}
                        onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SMTP Port</Label>
                      <Input
                        placeholder="587"
                        value={smtp.port}
                        onChange={(e) => setSmtp({ ...smtp, port: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        placeholder="your-email@gmail.com"
                        value={smtp.username}
                        onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showSmtpPassword ? 'text' : 'password'}
                          placeholder="App password or SMTP password"
                          value={smtp.password}
                          onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        >
                          {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Encryption</Label>
                    <Select
                      value={smtp.encryption}
                      onValueChange={(value: 'none' | 'ssl' | 'tls') => setSmtp({ ...smtp, encryption: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="tls">TLS (Recommended)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>From Email</Label>
                      <Input
                        type="email"
                        placeholder="noreply@yourdomain.com"
                        value={smtp.from_email}
                        onChange={(e) => setSmtp({ ...smtp, from_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>From Name</Label>
                      <Input
                        placeholder="Quine AI"
                        value={smtp.from_name}
                        onChange={(e) => setSmtp({ ...smtp, from_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveSmtp} disabled={savingSmtp} className="gap-2">
                    {savingSmtp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save SMTP Settings
                  </Button>
                </CardContent>
              </Card>

              {/* Test Email */}
              <Card>
                <CardHeader>
                  <CardTitle>Test Email</CardTitle>
                  <CardDescription>Send a test email to verify your SMTP configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      type="email"
                      placeholder="test@example.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleTestSmtp} 
                      disabled={testingSmtp || !smtp.enabled}
                      variant="outline"
                      className="gap-2"
                    >
                      {testingSmtp ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send Test
                    </Button>
                  </div>
                  {!smtp.enabled && (
                    <p className="text-xs text-amber-500">
                      Enable SMTP first to send test emails
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Common SMTP Providers */}
              <Card>
                <CardHeader>
                  <CardTitle>Common SMTP Providers</CardTitle>
                  <CardDescription>Quick reference for popular email services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'Gmail', host: 'smtp.gmail.com', port: '587', encryption: 'TLS' },
                      { name: 'Outlook', host: 'smtp.office365.com', port: '587', encryption: 'TLS' },
                      { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: '465', encryption: 'SSL' },
                      { name: 'SendGrid', host: 'smtp.sendgrid.net', port: '587', encryption: 'TLS' },
                      { name: 'Mailgun', host: 'smtp.mailgun.org', port: '587', encryption: 'TLS' },
                      { name: 'Zoho', host: 'smtp.zoho.com', port: '465', encryption: 'SSL' },
                    ].map((provider) => (
                      <div 
                        key={provider.name}
                        className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSmtp({ 
                          ...smtp, 
                          host: provider.host, 
                          port: provider.port,
                          encryption: provider.encryption.toLowerCase() as 'ssl' | 'tls'
                        })}
                      >
                        <h4 className="font-medium text-foreground">{provider.name}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {provider.host}:{provider.port} ({provider.encryption})
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Click on a provider to auto-fill host, port, and encryption settings
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="templates">
            <EmailTemplates />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
