import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, Activity } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  ip_address: string | null;
  metadata: any;
}

const AuditTrail = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadAuditLogs(session.user.id);
      }
    });
  }, [navigate]);

  const loadAuditLogs = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      document_signed: { label: "Signed", variant: "default" },
      document_uploaded: { label: "Uploaded", variant: "secondary" },
      signature_verified: { label: "Verified", variant: "default" },
      document_deleted: { label: "Deleted", variant: "destructive" },
    };

    const config = actionMap[action] || { label: action, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">SecureSign</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Audit Trail</h2>
          <p className="text-muted-foreground">Complete history of all security events and actions</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-muted-foreground">Loading audit logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="mb-2">No audit logs yet</CardTitle>
              <CardDescription>
                Activity will appear here once you start using the platform
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <Card key={log.id} className="border-border">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg capitalize">
                            {log.action.replace(/_/g, " ")}
                          </CardTitle>
                          {getActionBadge(log.action)}
                        </div>
                        <CardDescription className="space-y-1">
                          <div>
                            {format(new Date(log.created_at), "PPP 'at' p")}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span>Resource: {log.resource_type}</span>
                            {log.ip_address && (
                              <>
                                <span>•</span>
                                <span>IP: {log.ip_address}</span>
                              </>
                            )}
                          </div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 text-xs">
                              {log.metadata.file_name && (
                                <div>File: {log.metadata.file_name}</div>
                              )}
                              {log.metadata.file_size && (
                                <div>Size: {(log.metadata.file_size / 1024).toFixed(2)} KB</div>
                              )}
                            </div>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AuditTrail;
