import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Layout, ShoppingCart, BarChart3, Send, Zap, Code2, Globe } from 'lucide-react';
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
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Online store with product listings and cart',
    icon: ShoppingCart,
    prompt: 'Create an e-commerce storefront with product grid, filters, and shopping cart',
  },
];

export default function Landing() {
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, credits, loading } = useAuthContext();

  const handleCreateProject = async (projectPrompt: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setCreating(true);
    const projectName = projectPrompt.slice(0, 50) || 'New Project';
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: projectName,
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
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
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
      <main className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto pt-20 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Code Generation</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Welcome to{' '}
              <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Quine AI
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Describe your idea and watch it come to life. Build full-stack applications with the power of AI.
            </p>
          </motion.div>

          {/* Prompt Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-16"
          >
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative bg-card border border-border rounded-2xl p-2 shadow-2xl shadow-primary/5">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What do you want to build?"
                  className="h-14 text-lg bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
                  disabled={creating}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="absolute right-2 top-1/2 -translate-y-1/2 gap-2"
                  disabled={!prompt.trim() || creating}
                >
                  {creating ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Build
                    </>
                  )}
                </Button>
              </div>
            </form>
          </motion.div>

          {/* Starter Templates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 text-center">
              Or start with a template
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                >
                  <Card
                    className="group cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                    onClick={() => handleCreateProject(template.prompt)}
                  >
                    <CardContent className="p-6">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                        <template.icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="max-w-4xl mx-auto py-16 border-t border-border/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Code2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">AI Code Generation</h3>
              <p className="text-sm text-muted-foreground">
                Write code in plain English and let AI do the heavy lifting
              </p>
            </div>
            <div>
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Globe className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Live Preview</h3>
              <p className="text-sm text-muted-foreground">
                See your changes in real-time as you build
              </p>
            </div>
            <div>
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Deploy Instantly</h3>
              <p className="text-sm text-muted-foreground">
                One-click deployment to share your creations
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
