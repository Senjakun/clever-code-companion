import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Layout, BarChart3, Zap, Code, Rocket, ArrowRight, Star } from 'lucide-react';
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
  const [isFocused, setIsFocused] = useState(false);
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
    <div className="min-h-screen bg-background dark relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient blob */}
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Secondary gradient blob */}
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, hsl(280, 80%, 50%) 0%, transparent 70%)',
          }}
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Subtle grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Header */}
      <header className="relative border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl text-foreground">Quine AI</span>
          </motion.div>

          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            {user && (
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-sm">
                <span className="text-muted-foreground">Credits:</span>{' '}
                <span className="font-bold text-primary">${credits.toFixed(2)}</span>
              </div>
            )}
            {user ? (
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="rounded-xl border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300"
              >
                My Projects
              </Button>
            ) : (
              <Button 
                onClick={() => navigate('/auth')}
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300"
              >
                Sign In
              </Button>
            )}
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8"
          >
            <Star className="h-4 w-4 fill-primary" />
            <span>AI-Powered Development Platform</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
              Idea to app in{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent animate-pulse">
                  seconds
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary to-primary/0 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                />
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
              Describe what you want to build and watch{' '}
              <span className="text-foreground font-medium">Quine AI</span>{' '}
              create it for you in real-time.
            </p>
          </motion.div>

          {/* Prompt Input */}
          <motion.form
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto mb-16"
          >
            <div 
              className={`relative rounded-2xl transition-all duration-500 ${
                isFocused 
                  ? 'shadow-2xl shadow-primary/20 ring-2 ring-primary/30' 
                  : 'shadow-xl shadow-black/10'
              }`}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 blur-xl opacity-50" />
              <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="What do you want to build today?"
                  className="h-16 text-lg pl-6 pr-36 rounded-2xl border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60"
                  disabled={creating}
                />
                <Button
                  type="submit"
                  disabled={!prompt.trim() || creating}
                  className="absolute right-2 top-2 h-12 px-6 gap-2 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all duration-300 disabled:opacity-50"
                >
                  {creating ? (
                    <motion.span 
                      className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Start Building</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.form>

          {/* Starter Templates */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-24"
          >
            <p className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">
              Or start with a template
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                >
                  <Card
                    className="group cursor-pointer bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1"
                    onClick={() => handleCreateProject(template.prompt)}
                  >
                    <CardContent className="p-6 text-left flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
                        <template.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {features.map((feature, index) => (
                <motion.div 
                  key={feature.title} 
                  className="text-center group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  whileHover={{ y: -5 }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 border border-border/50 flex items-center justify-center mx-auto mb-4 group-hover:border-primary/30 group-hover:from-primary/10 group-hover:to-primary/5 transition-all duration-300">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-8 mt-auto bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 Quine AI. Build faster with artificial intelligence.</p>
        </div>
      </footer>
    </div>
  );
}
