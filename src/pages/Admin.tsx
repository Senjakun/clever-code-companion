import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Key, Save, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

    // Fetch API keys
    const { data: keysData } = await supabase
      .from('api_keys')
      .select('*');
    
    if (keysData) {
      setApiKeys(keysData);
      keysData.forEach((k) => {
        if (k.key_name === 'gemini') setGeminiKey(k.key_value);
        if (k.key_name === 'openai') setOpenaiKey(k.key_value);
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
            <p className="text-xs text-muted-foreground">Manage users and API keys</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
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
        </Tabs>
      </main>
    </div>
  );
}