import { useState, useEffect, useCallback, useRef } from "react";
import { Github, Link, Unlink, GitBranch, Upload, Download, RefreshCw, Check, ExternalLink, FolderGit2, Settings, Zap, ZapOff, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

interface GitHubConnection {
  connected: boolean;
  username?: string;
  avatar_url?: string;
  repo?: Repository;
}

interface GitHubIntegrationProps {
  projectId: string;
  files: any[];
  onImportFiles?: (files: any[]) => void;
}

export function GitHubIntegration({ projectId, files, onImportFiles }: GitHubIntegrationProps) {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<GitHubConnection>({ connected: false });
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState("");
  const [personalToken, setPersonalToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  
  // Auto-sync state
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const lastFilesRef = useRef<string>("");
  const autoSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // New repo creation state
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [showCreateRepo, setShowCreateRepo] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadGitHubConnection();
    }
  }, [open, user]);

  // Auto-sync effect - detect file changes
  useEffect(() => {
    if (!autoSyncEnabled || !selectedRepo || !personalToken) return;

    const currentFilesHash = JSON.stringify(files);
    
    if (lastFilesRef.current && lastFilesRef.current !== currentFilesHash) {
      // Files changed, debounce sync
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
      
      autoSyncTimeoutRef.current = setTimeout(() => {
        performAutoSync();
      }, 3000); // 3 second debounce
    }
    
    lastFilesRef.current = currentFilesHash;

    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
    };
  }, [files, autoSyncEnabled, selectedRepo, personalToken]);

  const performAutoSync = async () => {
    if (!selectedRepo || !personalToken) return;

    setSyncStatus("syncing");
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "push",
          token: personalToken,
          repo: selectedRepo,
          message: `Auto-sync: ${new Date().toLocaleString()}`,
          files: files,
        }),
      });

      if (!response.ok) {
        throw new Error("Auto-sync failed");
      }

      setLastSyncTime(new Date());
      setSyncStatus("success");
      
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch (error) {
      console.error("Auto-sync error:", error);
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  };

  const loadGitHubConnection = async () => {
    try {
      const { data } = await supabase
        .from("api_keys")
        .select("*")
        .eq("key_name", "github_token")
        .maybeSingle();

      if (data) {
        setPersonalToken(data.key_value);
        await fetchUserInfo(data.key_value);
      }

      // Load saved repo preference
      const { data: repoData } = await supabase
        .from("api_keys")
        .select("*")
        .eq("key_name", "github_selected_repo")
        .maybeSingle();

      if (repoData) {
        setSelectedRepo(repoData.key_value);
      }

      // Load auto-sync preference
      const { data: autoSyncData } = await supabase
        .from("api_keys")
        .select("*")
        .eq("key_name", "github_auto_sync")
        .maybeSingle();

      if (autoSyncData) {
        setAutoSyncEnabled(autoSyncData.key_value === "true");
      }
    } catch (error) {
      console.error("Error loading GitHub connection:", error);
    }
  };

  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setConnection({
          connected: true,
          username: userData.login,
          avatar_url: userData.avatar_url,
        });
        await fetchRepositories(token);
      } else {
        setConnection({ connected: false });
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      setConnection({ connected: false });
    }
  };

  const fetchRepositories = async (token: string) => {
    try {
      const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (response.ok) {
        const repos = await response.json();
        setRepositories(repos);
      }
    } catch (error) {
      console.error("Error fetching repositories:", error);
    }
  };

  const handleConnect = async () => {
    if (!personalToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter your GitHub Personal Access Token",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${personalToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error("Invalid token or unauthorized");
      }

      const userData = await response.json();

      const { error } = await supabase.from("api_keys").upsert({
        key_name: "github_token",
        key_value: personalToken,
      }, { onConflict: "key_name" });

      if (error) throw error;

      setConnection({
        connected: true,
        username: userData.login,
        avatar_url: userData.avatar_url,
      });

      await fetchRepositories(personalToken);

      toast({
        title: "Connected!",
        description: `Successfully connected as ${userData.login}`,
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to GitHub",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await supabase.from("api_keys").delete().eq("key_name", "github_token");
      await supabase.from("api_keys").delete().eq("key_name", "github_selected_repo");
      await supabase.from("api_keys").delete().eq("key_name", "github_auto_sync");
      setConnection({ connected: false });
      setPersonalToken("");
      setRepositories([]);
      setSelectedRepo("");
      setAutoSyncEnabled(false);
      toast({
        title: "Disconnected",
        description: "GitHub account has been disconnected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive",
      });
    }
  };

  const handleRepoSelect = async (repoFullName: string) => {
    setSelectedRepo(repoFullName);
    
    // Save selection
    await supabase.from("api_keys").upsert({
      key_name: "github_selected_repo",
      key_value: repoFullName,
    }, { onConflict: "key_name" });
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    
    await supabase.from("api_keys").upsert({
      key_name: "github_auto_sync",
      key_value: enabled.toString(),
    }, { onConflict: "key_name" });

    toast({
      title: enabled ? "Auto-sync enabled" : "Auto-sync disabled",
      description: enabled 
        ? "Changes will automatically push to GitHub" 
        : "Manual push required for changes",
    });
  };

  const handlePush = async () => {
    if (!selectedRepo || !commitMessage.trim()) {
      toast({
        title: "Error",
        description: "Please select a repository and enter a commit message",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "push",
          token: personalToken,
          repo: selectedRepo,
          message: commitMessage,
          files: files,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to push to GitHub");
      }

      toast({
        title: "Push successful!",
        description: `Changes pushed to ${selectedRepo}`,
      });
      setCommitMessage("");
      setLastSyncTime(new Date());
    } catch (error) {
      toast({
        title: "Push failed",
        description: error instanceof Error ? error.message : "Failed to push changes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!selectedRepo) {
      toast({
        title: "Error",
        description: "Please select a repository",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          action: "pull",
          token: personalToken,
          repo: selectedRepo,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to pull from GitHub");
      }

      if (onImportFiles && result.files) {
        onImportFiles(result.files);
      }

      toast({
        title: "Pull successful!",
        description: `Pulled ${result.files?.length || 0} files from ${selectedRepo}`,
      });
    } catch (error) {
      toast({
        title: "Pull failed",
        description: error instanceof Error ? error.message : "Failed to pull changes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a repository name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("https://api.github.com/user/repos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${personalToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newRepoName,
          private: newRepoPrivate,
          auto_init: true,
          description: `Created from QuinYukie AI - ${projectId}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create repository");
      }

      const newRepo = await response.json();
      await fetchRepositories(personalToken);
      handleRepoSelect(newRepo.full_name);
      setShowCreateRepo(false);
      setNewRepoName("");

      toast({
        title: "Repository created!",
        description: `${newRepo.full_name} has been created and connected`,
      });

      // Auto push initial code
      setTimeout(async () => {
        if (files.length > 0) {
          setLoading(true);
          try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/github-sync`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({
                action: "push",
                token: personalToken,
                repo: newRepo.full_name,
                message: "Initial commit from QuinYukie AI",
                files: files,
              }),
            });
            toast({
              title: "Initial push complete!",
              description: "Your code has been pushed to the new repository",
            });
          } catch (e) {
            console.error("Initial push failed:", e);
          } finally {
            setLoading(false);
          }
        }
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create repository",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return <RefreshCw className="h-3 w-3 animate-spin text-primary" />;
      case "success":
        return <Check className="h-3 w-3 text-green-500" />;
      case "error":
        return <ZapOff className="h-3 w-3 text-destructive" />;
      default:
        return autoSyncEnabled ? <Zap className="h-3 w-3 text-primary" /> : null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl border-border/50 bg-card hover:bg-muted"
        >
          <Github className="h-4 w-4 text-foreground" />
          <span className="hidden sm:inline text-foreground">GitHub</span>
          {connection.connected && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
              {getSyncStatusIcon()}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Github className="h-5 w-5 text-foreground" />
            GitHub Integration
          </DialogTitle>
          <DialogDescription>
            Connect your GitHub account to sync your project with repositories.
          </DialogDescription>
        </DialogHeader>

        {!connection.connected ? (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Github className="h-4 w-4" />
                Connect to GitHub
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Link your GitHub account to push and pull code directly from the editor.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-token">Personal Access Token</Label>
              <div className="relative">
                <Input
                  id="github-token"
                  type={showToken ? "text" : "password"}
                  placeholder="ghp_..."
                  value={personalToken}
                  onChange={(e) => setPersonalToken(e.target.value)}
                  className="pr-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Create a token at{" "}
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github.com/settings/tokens
                </a>
                {" "}with <code className="bg-muted px-1 rounded">repo</code> scope.
              </p>
            </div>

            <Button 
              onClick={handleConnect} 
              disabled={loading || !personalToken.trim()}
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Link className="h-4 w-4 mr-2" />
              )}
              Connect to GitHub
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="sync" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sync">Sync</TabsTrigger>
              <TabsTrigger value="auto">Auto-Sync</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="sync" className="space-y-4 mt-4">
              {/* Connected User */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                {connection.avatar_url && (
                  <img
                    src={connection.avatar_url}
                    alt={connection.username}
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm">{connection.username}</p>
                  <p className="text-xs text-muted-foreground">Connected to GitHub</p>
                </div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>

              {/* Repository Selection or Create */}
              {showCreateRepo ? (
                <div className="space-y-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Create New Repository</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setShowCreateRepo(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <Input
                    placeholder="my-awesome-project"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="private-repo" className="text-xs text-muted-foreground">
                      Private repository
                    </Label>
                    <Switch
                      id="private-repo"
                      checked={newRepoPrivate}
                      onCheckedChange={setNewRepoPrivate}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateRepo} 
                    disabled={loading || !newRepoName.trim()}
                    className="w-full"
                  >
                    {loading ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FolderGit2 className="h-4 w-4 mr-2" />
                    )}
                    Create & Connect
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Repository</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setShowCreateRepo(true)}
                      disabled={loading}
                    >
                      <FolderGit2 className="h-3 w-3" />
                      Create New
                    </Button>
                  </div>
                  <Select value={selectedRepo} onValueChange={handleRepoSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a repository" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="h-[200px]">
                        {repositories.map((repo) => (
                          <SelectItem key={repo.id} value={repo.full_name}>
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-3 w-3" />
                              <span>{repo.full_name}</span>
                              {repo.private && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  Private
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Commit Message */}
              <div className="space-y-2">
                <Label htmlFor="commit-msg">Commit Message</Label>
                <Input
                  id="commit-msg"
                  placeholder="Update from QuinYukie AI"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePull}
                  disabled={loading || !selectedRepo}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Pull
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePush}
                  disabled={loading || !selectedRepo || !commitMessage.trim()}
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Push
                </Button>
              </div>

              {selectedRepo && (
                <a
                  href={`https://github.com/${selectedRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on GitHub
                </a>
              )}
            </TabsContent>

            <TabsContent value="auto" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Auto-Sync</h4>
                  </div>
                  <Switch
                    checked={autoSyncEnabled}
                    onCheckedChange={handleAutoSyncToggle}
                    disabled={!selectedRepo}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically push changes to GitHub when files are modified. 
                  Changes are synced with a 3-second debounce.
                </p>
              </div>

              {!selectedRepo && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-xs text-yellow-500">
                    Please select a repository first to enable auto-sync.
                  </p>
                </div>
              )}

              {autoSyncEnabled && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Last sync</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {lastSyncTime 
                        ? lastSyncTime.toLocaleTimeString() 
                        : "Never"
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      {getSyncStatusIcon()}
                      <span className="text-sm">Status</span>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {syncStatus}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Repository</span>
                    </div>
                    <span className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {selectedRepo}
                    </span>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-3">
                <h4 className="font-medium text-sm">Account</h4>
                <div className="flex items-center gap-3">
                  {connection.avatar_url && (
                    <img
                      src={connection.avatar_url}
                      alt={connection.username}
                      className="h-12 w-12 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">{connection.username}</p>
                    <a
                      href={`https://github.com/${connection.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-2">
                <h4 className="font-medium text-sm">Token Permissions</h4>
                <p className="text-xs text-muted-foreground">
                  Your token has access to repositories. To change permissions, 
                  generate a new token on GitHub.
                </p>
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  Manage Tokens
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="w-full"
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect GitHub
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
