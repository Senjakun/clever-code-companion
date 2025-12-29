import { useState, useEffect } from "react";
import { Github, Link, Unlink, GitBranch, Upload, Download, RefreshCw, Check, ExternalLink, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  useEffect(() => {
    if (open && user) {
      loadGitHubConnection();
    }
  }, [open, user]);

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
      // Verify token
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

      // Save token to database
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
      setConnection({ connected: false });
      setPersonalToken("");
      setRepositories([]);
      setSelectedRepo("");
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
    const repoName = prompt("Enter new repository name:");
    if (!repoName) return;

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
          name: repoName,
          private: true,
          auto_init: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create repository");
      }

      const newRepo = await response.json();
      await fetchRepositories(personalToken);
      setSelectedRepo(newRepo.full_name);

      toast({
        title: "Repository created!",
        description: `${newRepo.full_name} has been created`,
      });
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl border-border/50"
        >
          <Github className="h-4 w-4" />
          <span className="hidden sm:inline">GitHub</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub Integration
          </DialogTitle>
          <DialogDescription>
            Connect your GitHub account to sync your project with repositories.
          </DialogDescription>
        </DialogHeader>

        {!connection.connected ? (
          <div className="space-y-4 py-4">
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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sync">Sync</TabsTrigger>
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

              {/* Repository Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Repository</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleCreateRepo}
                    disabled={loading}
                  >
                    <FolderGit2 className="h-3 w-3 mr-1" />
                    Create New
                  </Button>
                </div>
                <Select value={selectedRepo} onValueChange={setSelectedRepo}>
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