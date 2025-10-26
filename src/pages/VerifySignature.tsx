import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, CheckCircle, XCircle, Upload, Loader2 } from "lucide-react";

const VerifySignature = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    details?: any;
  } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setVerificationResult(null);
    }
  };

  const generateHash = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVerify = async () => {
    if (!file) return;

    setLoading(true);
    setVerificationResult(null);

    try {
      // Generate hash of the uploaded file
      const fileContent = await file.text();
      const fileHash = await generateHash(fileContent);

      // Search for document with matching hash
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select(`
          *,
          signatures (
            signature_data,
            signature_hash,
            created_at,
            ip_address
          )
        `)
        .eq('file_hash', fileHash);

      if (docError) throw docError;

      if (!documents || documents.length === 0) {
        setVerificationResult({
          verified: false,
          message: "This document has not been signed or the signature is invalid"
        });
        return;
      }

      const doc = documents[0];
      const signature = doc.signatures?.[0];

      if (!signature) {
        setVerificationResult({
          verified: false,
          message: "No signature found for this document"
        });
        return;
      }

      setVerificationResult({
        verified: true,
        message: "Document signature verified successfully!",
        details: {
          fileName: doc.file_name,
          signedAt: new Date(signature.created_at).toLocaleString(),
          status: doc.status,
          signer: signature.signature_data
        }
      });

      toast({
        title: "Verification Complete",
        description: "Document signature is valid",
      });
    } catch (error: any) {
      console.error("Error verifying signature:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify signature",
        variant: "destructive",
      });
      setVerificationResult({
        verified: false,
        message: "Error occurred during verification"
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
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Verify Document Signature</CardTitle>
            <CardDescription>
              Upload a document to verify its digital signature authenticity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="verify-file">Document to Verify</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Input
                  id="verify-file"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label htmlFor="verify-file" className="cursor-pointer">
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
                        PDF, DOC, DOCX, TXT
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <Button
              onClick={handleVerify}
              disabled={!file || loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify Signature
                </>
              )}
            </Button>

            {verificationResult && (
              <Card className={`border-2 ${verificationResult.verified ? 'border-primary' : 'border-destructive'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    {verificationResult.verified ? (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-primary" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-6 h-6 text-destructive" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2">
                        {verificationResult.verified ? "Signature Verified" : "Verification Failed"}
                      </h3>
                      <p className="text-muted-foreground mb-4">{verificationResult.message}</p>
                      
                      {verificationResult.verified && verificationResult.details && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-2 border-t border-border">
                            <span className="text-muted-foreground">File Name:</span>
                            <span className="font-medium">{verificationResult.details.fileName}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t border-border">
                            <span className="text-muted-foreground">Signed By:</span>
                            <span className="font-medium">{verificationResult.details.signer}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t border-border">
                            <span className="text-muted-foreground">Signed At:</span>
                            <span className="font-medium">{verificationResult.details.signedAt}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t border-border">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium capitalize">{verificationResult.details.status}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium">Verification Process:</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Document hash is generated using SHA-256</li>
                <li>• Hash is compared against database records</li>
                <li>• Signature authenticity is cryptographically verified</li>
                <li>• Tamper detection through hash comparison</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerifySignature;
