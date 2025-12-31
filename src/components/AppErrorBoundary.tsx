import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Uncaught error:", error);
    // eslint-disable-next-line no-console
    console.error("[AppErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="mx-auto max-w-2xl px-6 py-14">
          <h1 className="text-2xl font-semibold">Aplikasi gagal dimuat</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Biasanya ini karena error JavaScript di browser, atau konfigurasi environment saat build.
          </p>

          <div className="mt-6 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium">Error:</p>
            <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">
              {this.state.error.message}
            </pre>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button
              variant="outline"
              onClick={() => {
                // Reset state so user can try navigating again after fixing config
                this.setState({ error: null });
              }}
            >
              Coba lagi
            </Button>
          </div>

          <div className="mt-8 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Langkah cek cepat (VPS):</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Buka DevTools → Console, lihat pesan error.</li>
              <li>Pastikan file <code>/assets/*.js</code> dan <code>/assets/*.css</code> tidak 404.</li>
              <li>Kalau build pakai <code>sudo</code>, jalankan dengan <code>sudo -E</code> biar env kebawa.</li>
            </ol>
          </div>
        </main>
      </div>
    );
  }
}
