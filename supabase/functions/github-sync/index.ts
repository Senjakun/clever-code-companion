import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
}

function flattenFiles(files: FileNode[], basePath = ""): { path: string; content: string }[] {
  const result: { path: string; content: string }[] = [];
  
  for (const file of files) {
    const currentPath = basePath ? `${basePath}/${file.name}` : file.name;
    
    if (file.type === "file" && file.content !== undefined) {
      result.push({ path: currentPath, content: file.content });
    } else if (file.type === "folder" && file.children) {
      result.push(...flattenFiles(file.children, currentPath));
    }
  }
  
  return result;
}

async function getDefaultBranch(token: string, repo: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get repository info");
  }

  const data = await response.json();
  return data.default_branch || "main";
}

async function getLatestCommitSha(token: string, repo: string, branch: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/${branch}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    // If branch doesn't exist, try to get default
    const defaultResponse = await fetch(`https://api.github.com/repos/${repo}/git/ref/heads/main`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    
    if (!defaultResponse.ok) {
      throw new Error("Failed to get latest commit");
    }
    
    const data = await defaultResponse.json();
    return data.object.sha;
  }

  const data = await response.json();
  return data.object.sha;
}

async function createBlob(token: string, repo: string, content: string): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo}/git/blobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: btoa(unescape(encodeURIComponent(content))),
      encoding: "base64",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create blob");
  }

  const data = await response.json();
  return data.sha;
}

async function createTree(
  token: string, 
  repo: string, 
  baseTreeSha: string, 
  files: { path: string; sha: string }[]
): Promise<string> {
  const tree = files.map((file) => ({
    path: file.path,
    mode: "100644" as const,
    type: "blob" as const,
    sha: file.sha,
  }));

  const response = await fetch(`https://api.github.com/repos/${repo}/git/trees`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create tree");
  }

  const data = await response.json();
  return data.sha;
}

async function createCommit(
  token: string, 
  repo: string, 
  message: string, 
  treeSha: string, 
  parentSha: string
): Promise<string> {
  const response = await fetch(`https://api.github.com/repos/${repo}/git/commits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parentSha],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create commit");
  }

  const data = await response.json();
  return data.sha;
}

async function updateRef(token: string, repo: string, branch: string, commitSha: string): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sha: commitSha,
      force: true,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to update reference");
  }
}

async function pushToGitHub(
  token: string, 
  repo: string, 
  message: string, 
  files: FileNode[]
): Promise<{ success: boolean; commitSha: string }> {
  const branch = await getDefaultBranch(token, repo);
  const latestCommitSha = await getLatestCommitSha(token, repo, branch);
  
  // Get base tree
  const commitResponse = await fetch(`https://api.github.com/repos/${repo}/git/commits/${latestCommitSha}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  
  if (!commitResponse.ok) {
    throw new Error("Failed to get commit info");
  }
  
  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // Flatten files and create blobs
  const flatFiles = flattenFiles(files);
  const blobPromises = flatFiles.map(async (file) => ({
    path: file.path,
    sha: await createBlob(token, repo, file.content),
  }));
  
  const blobs = await Promise.all(blobPromises);

  // Create tree
  const treeSha = await createTree(token, repo, baseTreeSha, blobs);

  // Create commit
  const newCommitSha = await createCommit(token, repo, message, treeSha, latestCommitSha);

  // Update ref
  await updateRef(token, repo, branch, newCommitSha);

  return { success: true, commitSha: newCommitSha };
}

async function pullFromGitHub(token: string, repo: string): Promise<FileNode[]> {
  const branch = await getDefaultBranch(token, repo);
  
  // Get tree recursively
  const response = await fetch(
    `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to get repository tree");
  }

  const data = await response.json();
  const files: FileNode[] = [];

  // Filter and fetch file contents
  const fileItems = data.tree.filter((item: any) => 
    item.type === "blob" && 
    !item.path.includes("node_modules") &&
    !item.path.includes(".git") &&
    item.size < 100000 // Skip large files
  );

  for (const item of fileItems.slice(0, 50)) { // Limit to 50 files
    try {
      const contentResponse = await fetch(
        `https://api.github.com/repos/${repo}/contents/${item.path}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        if (contentData.encoding === "base64" && contentData.content) {
          const content = decodeURIComponent(escape(atob(contentData.content.replace(/\n/g, ""))));
          files.push({
            id: item.path,
            name: item.path.split("/").pop() || item.path,
            type: "file",
            content,
          });
        }
      }
    } catch (e) {
      console.error(`Failed to fetch ${item.path}:`, e);
    }
  }

  return files;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, token, repo, message, files } = await req.json();

    if (!token || !repo) {
      return new Response(
        JSON.stringify({ error: "Token and repository are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;

    if (action === "push") {
      if (!message || !files) {
        return new Response(
          JSON.stringify({ error: "Message and files are required for push" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      result = await pushToGitHub(token, repo, message, files);
    } else if (action === "pull") {
      const pulledFiles = await pullFromGitHub(token, repo);
      result = { success: true, files: pulledFiles };
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use 'push' or 'pull'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("GitHub sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});