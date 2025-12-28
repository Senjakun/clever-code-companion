import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Layout, BarChart3, Zap, Code, Rocket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const templates = [
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'A beautiful, responsive landing page with hero section',
    icon: Layout,
    prompt: 'Create a modern landing page with a hero section, features grid, testimonials, and a footer',
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Admin dashboard with charts and data tables',
    icon: BarChart3,
    prompt: 'Create an admin dashboard with sidebar navigation, charts, and data tables',
  },
];

const features = [
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Generate complete applications in seconds, not hours',
  },
  {
    icon: Code,
    title: 'Production Ready',
    description: 'Clean, maintainable code following best practices',
  },
  {
    icon: Rocket,
    title: 'Deploy Instantly',
    description: 'One-click deployment to share your creations',
  },
];

export default function Landing() {
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, credits, loading: authLoading } = useAuthContext();

  const handleCreateProject = async (projectPrompt: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setCreating(true);
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectPrompt.slice(0, 50) || 'New Project',
        description: projectPrompt,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
      setCreating(false);
      return;
    }

    if (data) {
      navigate(`/editor/${data.id}?prompt=${encodeURIComponent(projectPrompt)}`);
    }
    setCreating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      handleCreateProject(prompt.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl text-foreground">Quine AI</span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="px-3 py-1.5 rounded-lg bg-muted text-sm">
                <span className="text-muted-foreground">Credits:</span>{' '}
                <span className="font-semibold text-foreground">${credits.toFixed(2)}</span>
              </div>
            )}
            {user ? (
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                My Projects
              </Button>
            ) : (
              <Button onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Quine AI
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
              Describe your idea and watch it come to life. Build full-stack applications with the power of AI.
            </p>
          </motion.div>

          {/* Prompt Input */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto mb-16"
          >
            <div className="relative">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to build?"
                className="h-14 text-lg pl-5 pr-32 rounded-xl border-border bg-card/50 focus:border-primary focus:ring-primary"
                disabled={creating}
              />
              <Button
                type="submit"
                disabled={!prompt.trim() || creating}
                className="absolute right-2 top-2 h-10 gap-2"
              >
                {creating ? (
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                ) : (
                  <>
                    Start Building
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.form>

          {/* Starter Templates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-20"
          >
            <h2 className="text-lg font-semibold text-muted-foreground mb-6">
              Or start with a template
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5"
                  onClick={() => handleCreateProject(template.prompt)}
                >
                  <CardContent className="p-6 text-center">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <template.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {features.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Quine AI. Build faster with artificial intelligence.</p>
        </div>
      </footer>
    </div>
  );
}
