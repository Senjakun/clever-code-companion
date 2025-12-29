import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, Loader2, Edit, Eye, Trash2, Plus, Code, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content: string | null;
  description: string | null;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export default function EmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    html_content: '',
    text_content: '',
    description: '',
    variables: [] as string[],
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name');

    if (error) {
      toast({ title: 'Error', description: 'Failed to fetch templates', variant: 'destructive' });
    } else {
      // Transform data to ensure variables is string[]
      const transformed = (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables as string[] : [],
        description: t.description || null,
        text_content: t.text_content || null,
      }));
      setTemplates(transformed);
    }
    setLoading(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content,
      text_content: template.text_content || '',
      description: template.description || '',
      variables: template.variables || [],
    });
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setSelectedTemplate(null);
    setEditForm({
      name: '',
      subject: '',
      html_content: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #6366f1;">{{title}}</h1>
  <p>Hello {{user_name}},</p>
  <p>Your content here...</p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
  <p style="color: #6b7280; font-size: 12px;">© {{app_name}}. All rights reserved.</p>
</div>`,
      text_content: '',
      description: '',
      variables: ['title', 'user_name', 'app_name'],
    });
    setIsEditing(true);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.subject || !editForm.html_content) {
      toast({ title: 'Error', description: 'Name, subject, and HTML content are required', variant: 'destructive' });
      return;
    }

    setSaving(true);

    try {
      if (isCreating) {
        const { error } = await supabase
          .from('email_templates')
          .insert({
            name: editForm.name,
            subject: editForm.subject,
            html_content: editForm.html_content,
            text_content: editForm.text_content || null,
            description: editForm.description || null,
            variables: editForm.variables,
          });

        if (error) throw error;
        toast({ title: 'Template created' });
      } else if (selectedTemplate) {
        const { error } = await supabase
          .from('email_templates')
          .update({
            name: editForm.name,
            subject: editForm.subject,
            html_content: editForm.html_content,
            text_content: editForm.text_content || null,
            description: editForm.description || null,
            variables: editForm.variables,
          })
          .eq('id', selectedTemplate.id);

        if (error) throw error;
        toast({ title: 'Template updated' });
      }

      setIsEditing(false);
      fetchTemplates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }

    setSaving(false);
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}" template?`)) return;

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', template.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    } else {
      toast({ title: 'Template deleted' });
      fetchTemplates();
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewing(true);
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const handleContentChange = (content: string) => {
    const variables = extractVariables(content);
    setEditForm({ ...editForm, html_content: content, variables });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Email Templates
            </CardTitle>
            <CardDescription>Manage email templates for notifications</CardDescription>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Variables</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium font-mono text-sm">{template.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {template.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(template.variables || []).slice(0, 3).map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                      {(template.variables || []).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => handlePreview(template)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(template)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {templates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No templates found. Create your first template.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create Template' : 'Edit Template'}</DialogTitle>
            <DialogDescription>
              Use {"{{variable}}"} syntax for dynamic content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name (unique identifier)</Label>
                <Input
                  placeholder="welcome_email"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  disabled={!isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Sent when a new user registers"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                placeholder="Welcome to {{app_name}}!"
                value={editForm.subject}
                onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
              />
            </div>

            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html" className="gap-2">
                  <Code className="h-4 w-4" />
                  HTML Content
                </TabsTrigger>
                <TabsTrigger value="text">Plain Text</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="mt-4">
                <Textarea
                  placeholder="<div>Your HTML content here...</div>"
                  value={editForm.html_content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                />
              </TabsContent>

              <TabsContent value="text" className="mt-4">
                <Textarea
                  placeholder="Plain text version (optional)"
                  value={editForm.text_content}
                  onChange={(e) => setEditForm({ ...editForm, text_content: e.target.value })}
                  className="min-h-[200px]"
                />
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="border border-border rounded-lg p-4 bg-white text-black min-h-[300px]">
                  <div dangerouslySetInnerHTML={{ __html: editForm.html_content }} />
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Detected Variables</Label>
              <div className="flex flex-wrap gap-2">
                {editForm.variables.map((v) => (
                  <Badge key={v} variant="secondary">
                    {`{{${v}}}`}
                  </Badge>
                ))}
                {editForm.variables.length === 0 && (
                  <span className="text-sm text-muted-foreground">No variables detected</span>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Preview: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Subject: {selectedTemplate?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="border border-border rounded-lg p-6 bg-white text-black min-h-[400px]">
            <div dangerouslySetInnerHTML={{ __html: selectedTemplate?.html_content || '' }} />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setIsPreviewing(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
