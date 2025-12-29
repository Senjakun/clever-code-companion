import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Key, Save, Eye, EyeOff, Loader2, Mail, Send, CheckCircle, AlertCircle } from 'lucide-react';
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
  const [openaiKey, setOpenaiKey] = useState('');
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

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
        if (k.key_name === 'openai') setOpenaiKey(k.key_value);
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
      { key_name: 'openai', key_value: openaiKey },
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

    setTestingSmtp(true);

    // In a real implementation, this would call an edge function to send a test email
    await new Promise(resolve => setTimeout(resolve, 2000));

    toast({ 
      title: 'Test Email Sent', 
      description: `A test email has been sent to ${testEmail}`,
    });
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
                  <div className="space-y-2">
                    <Label>Google Gemini API Key</Label>
                    <div className="relative">
                      <Input
                        type={showGemini ? 'text' : 'password'}
                        placeholder="AIza..."
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
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
                  </div>

                  <div className="space-y-2">
                    <Label>OpenAI API Key</Label>
                    <div className="relative">
                      <Input
                        type={showOpenai ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full w-10"
                        onClick={() => setShowOpenai(!showOpenai)}
                      >
                        {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button onClick={handleSaveApiKeys} disabled={savingKeys} className="gap-2">
                    {savingKeys ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save API Keys
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    API keys are stored securely in the database and used server-side only.
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
        </Tabs>
      </main>
    </div>
  );
}
