import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Rocket, User, Key, Globe, Check, ArrowRight, ArrowLeft, 
  Eye, EyeOff, Loader2, Sparkles, Server
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const SETUP_KEY = 'app_setup_completed';

interface SetupData {
  adminEmail: string;
  adminPassword: string;
  confirmPassword: string;
  siteDomain: string;
  geminiKey: string;
  deepseekKey: string;
  groqKey: string;
}

export default function Setup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showDeepseek, setShowDeepseek] = useState(false);
  const [showGroq, setShowGroq] = useState(false);
  
  const [data, setData] = useState<SetupData>({
    adminEmail: '',
    adminPassword: '',
    confirmPassword: '',
    siteDomain: typeof window !== 'undefined' ? window.location.hostname : '',
    geminiKey: '',
    deepseekKey: '',
    groqKey: '',
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  const totalSteps = 3;

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      // Check if setup is already completed
      const { data: existingKeys, error: existingKeysError } = await supabase
        .from('api_keys')
        .select('key_name')
        .eq('key_name', 'setup_completed')
        .maybeSingle();

      if (existingKeysError) {
        console.error('Setup status error (api_keys):', existingKeysError);
      }

      if (existingKeys) {
        // Setup already completed, redirect to auth
        navigate('/auth');
        return;
      }

      // Check if there's already an admin user
      const { data: adminRoles, error: adminRolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1);

      if (adminRolesError) {
        console.error('Setup status error (user_roles):', adminRolesError);
      }

      if (adminRoles && adminRoles.length > 0) {
        // Admin exists, mark setup as complete and redirect
        const { error: markError } = await supabase.from('api_keys').insert({
          key_name: 'setup_completed',
          key_value: 'true',
        });

        if (markError) {
          console.error('Setup mark complete error:', markError);
        }

        navigate('/auth');
        return;
      }
    } catch (err: any) {
      console.error('Setup check error:', err);
      toast({
        title: 'Gagal cek status setup',
        description:
          err?.message ||
          'Tidak bisa menghubungi backend. Cek koneksi / konfigurasi deployment.',
        variant: 'destructive',
      });
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      // Validate admin credentials
      if (!data.adminEmail || !data.adminPassword) {
        toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
        return;
      }
      if (data.adminPassword.length < 6) {
        toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
        return;
      }
      if (data.adminPassword !== data.confirmPassword) {
        toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Validate required fields
      if (!data.adminEmail || !data.adminPassword) {
        toast({ 
          title: 'Error', 
          description: 'Email dan password admin harus diisi', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      // 1. Create admin user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.adminEmail,
        password: data.adminPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
        throw signUpError;
      }

      if (!authData.user) {
        throw new Error('Gagal membuat akun admin');
      }

      // 2. Set admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', authData.user.id);

      if (roleError) {
        console.error('Role update error:', roleError);
        // Continue anyway, can be fixed later
      }

      // 3. Save API keys if provided
      const keysToInsert = [
        { key_name: 'setup_completed', key_value: 'true' },
        { key_name: 'site_domain', key_value: data.siteDomain || window.location.hostname },
      ];

      if (data.geminiKey.trim()) {
        keysToInsert.push({ key_name: 'gemini', key_value: data.geminiKey });
      }
      if (data.deepseekKey.trim()) {
        keysToInsert.push({ key_name: 'deepseek', key_value: data.deepseekKey });
      }
      if (data.groqKey.trim()) {
        keysToInsert.push({ key_name: 'groq', key_value: data.groqKey });
      }

      const { error: keysError } = await supabase.from('api_keys').insert(keysToInsert);
      
      if (keysError) {
        console.error('Keys insert error:', keysError);
        // Continue anyway
      }

      toast({ 
        title: 'Setup Selesai!', 
        description: 'Akun admin berhasil dibuat. Silakan login.',
      });

      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({ 
        title: 'Setup Error', 
        description: error.message || 'Gagal menyelesaikan setup', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center dark">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Checking setup status...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Admin Account', icon: User },
    { number: 2, title: 'Domain Setup', icon: Globe },
    { number: 3, title: 'API Keys', icon: Key },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Initial Setup
            </h1>
          </div>
          <p className="text-muted-foreground">Configure your self-hosted instance</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((s, index) => (
            <div key={s.number} className="flex items-center">
              <motion.div
                initial={false}
                animate={{
                  scale: step === s.number ? 1.1 : 1,
                  backgroundColor: step >= s.number ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                }}
                className="h-10 w-10 rounded-full flex items-center justify-center text-white"
              >
                {step > s.number ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </motion.div>
              {index < steps.length - 1 && (
                <div 
                  className={`h-0.5 w-12 mx-2 transition-colors ${
                    step > s.number ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md"
          >
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
              {step === 1 && (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Create Admin Account
                    </CardTitle>
                    <CardDescription>
                      Set up the main administrator account for your instance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Admin Email</Label>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        value={data.adminEmail}
                        onChange={(e) => setData({ ...data, adminEmail: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Minimum 6 characters"
                          value={data.adminPassword}
                          onChange={(e) => setData({ ...data, adminPassword: e.target.value })}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full w-10"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={data.confirmPassword}
                        onChange={(e) => setData({ ...data, confirmPassword: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {step === 2 && (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5 text-primary" />
                      Domain Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure your domain settings (optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Site Domain</Label>
                      <Input
                        type="text"
                        placeholder="example.com"
                        value={data.siteDomain}
                        onChange={(e) => setData({ ...data, siteDomain: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter your domain name without http:// or https://
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-start gap-3">
                        <Server className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-1 text-sm">
                          <p className="font-medium">DNS Configuration</p>
                          <p className="text-muted-foreground">
                            Point your domain's A record to your VPS IP address
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {step === 3 && (
                <>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      API Key Configuration
                    </CardTitle>
                    <CardDescription>
                      Add AI provider API keys (can be configured later in Admin Panel)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Google Gemini API Key</Label>
                      <div className="relative">
                        <Input
                          type={showGemini ? 'text' : 'password'}
                          placeholder="AIza... (optional)"
                          value={data.geminiKey}
                          onChange={(e) => setData({ ...data, geminiKey: e.target.value })}
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
                      <Label>DeepSeek API Key</Label>
                      <div className="relative">
                        <Input
                          type={showDeepseek ? 'text' : 'password'}
                          placeholder="sk-... (opsional)"
                          value={data.deepseekKey}
                          onChange={(e) => setData({ ...data, deepseekKey: e.target.value })}
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
                    </div>
                    <div className="space-y-2">
                      <Label>Groq API Key</Label>
                      <div className="relative">
                        <Input
                          type={showGroq ? 'text' : 'password'}
                          placeholder="gsk_... (opsional)"
                          value={data.groqKey}
                          onChange={(e) => setData({ ...data, groqKey: e.target.value })}
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
                    </div>
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-primary">Tips Profesional</p>
                          <p className="text-muted-foreground">
                            Kunci API juga dapat dikonfigurasi nanti melalui Panel Admin.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="p-6 pt-0 flex justify-between">
                {step > 1 ? (
                  <Button variant="outline" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}
                
                {step < totalSteps ? (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleComplete} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Complete Setup
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
