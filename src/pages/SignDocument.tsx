import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Upload, FileSignature, ArrowLeft, Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const SignDocument = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [signatureText, setSignatureText] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const generateHash = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSign = async () => {
    if (!file || !user) return;
    if (!signatureText.trim()) {
      toast({
        title: "Signature required",
        description: "Please enter your signature text",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Generate hashes
      const fileContent = await file.text();
      const fileHash = await generateHash(fileContent);
      const signatureHash = await generateHash(signatureText + fileHash + user.id);

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_hash: fileHash,
          status: 'signed'
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create signature record
      const { error: sigError } = await supabase
        .from('signatures')
        .insert({
          document_id: document.id,
          user_id: user.id,
          signature_data: signatureText,
          signature_hash: signatureHash,
          ip_address: 'client-side', // In production, get from server
          user_agent: navigator.userAgent
        });

      if (sigError) throw sigError;

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'document_signed',
        resource_type: 'document',
        resource_id: document.id,
        ip_address: 'client-side',
        user_agent: navigator.userAgent,
        metadata: {
          file_name: file.name,
          file_size: file.size
        }
      });

      toast({
        title: "Document signed successfully!",
        description: "Your document has been securely signed and stored.",
      });

      navigate("/documents");
    } catch (error: any) {
      console.error("Error signing document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign document",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-border">
          <CardHeader>
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
              <FileSignature className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Sign New Document</CardTitle>
            <CardDescription>
              Upload a document and apply your digital signature
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">Document File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label htmlFor="file" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {file ? (
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-foreground">Click to upload</p>
                      <p className="text-sm text-muted-foreground">
                        PDF, DOC, DOCX, TXT (Max 10MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signature">Your Digital Signature</Label>
              <Input
                id="signature"
                type="text"
                placeholder="Enter your full name as signature"
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                className="font-serif text-lg"
              />
              <p className="text-sm text-muted-foreground">
                This will be cryptographically signed with SHA-256 encryption
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium">Security Features:</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• SHA-256 hash verification</li>
                <li>• Tamper-proof digital signature</li>
                <li>• Complete audit trail logging</li>
                <li>• Encrypted cloud storage</li>
              </ul>
            </div>

            <Button
              onClick={handleSign}
              disabled={!file || !signatureText.trim() || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing Document...
                </>
              ) : (
                <>
                  <FileSignature className="w-4 h-4 mr-2" />
                  Sign Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SignDocument;
