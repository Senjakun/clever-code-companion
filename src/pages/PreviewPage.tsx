import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LivePreview } from "@/components/LivePreview";
import { FileNode } from "@/lib/file-system";
import { Loader2 } from "lucide-react";

export default function PreviewPage() {
  const { projectId } = useParams();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    if (projectId) {
      fetchProjectFiles();
    }
  }, [projectId]);

  const fetchProjectFiles = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("name, files")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProjectName(data.name);
        // Parse files from JSON
        const projectFiles = (data.files as unknown as FileNode[]) || [];
        setFiles(projectFiles);
      }
    } catch (error) {
      console.error("Failed to load project:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background dark">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background dark">
      <LivePreview files={files} />
    </div>
  );
}
