import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Shield, ArrowLeft, CheckCircle, XCircle, Upload, Loader2, Type, Key, Copy } from "lucide-react";
import { verifySignature, generateHash } from "@/utils/crypto";

const VerifySignature = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyMode, setVerifyMode] = useState<"file" | "text">("file");
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [manualSignature, setManualSignature] = useState("");
  const [manualPublicKey, setManualPublicKey] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        // Auto-load public key from localStorage (same as sign document)
        const stored = localStorage.getItem(`keys_${session.user.id}`);
        if (stored) {
          const keys = JSON.parse(stored);
          setManualPublicKey(keys.publicKey);
        }
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

  const handleTextChange = (value: string) => {
    setTextContent(value);
    setVerificationResult(null);
  };


  const handleVerify = async () => {
    if (verifyMode === "file" && !file) {
      toast({
        title: "File required",
        description: "Please select a file to verify",
        variant: "destructive",
      });
      return;
    }

    if (verifyMode === "text" && !textContent.trim()) {
      toast({
        title: "Text required",
        description: "Please enter text to verify",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setVerificationResult(null);

    try {
      let dataToVerify: string;

      if (verifyMode === "file" && file) {
        dataToVerify = await file.text();
      } else {
        dataToVerify = textContent;
      }

      // Use manual inputs if provided, otherwise fetch from database
      let signatureData = manualSignature;
      let publicKey = manualPublicKey;
      let documentDetails = null;

      // If manual data not provided, try to fetch from database
      if (!signatureData || !publicKey) {
        const fileHash = await generateHash(dataToVerify);

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
            message: "This content has not been signed or no signature/public key provided"
          });
          return;
        }

        const doc = documents[0];
        const signature = doc.signatures?.[0];

        if (!signature) {
          setVerificationResult({
            verified: false,
            message: "No signature found for this content"
          });
          return;
        }

        // Get public key and signature from audit logs
        const { data: auditLogs } = await supabase
          .from('audit_logs')
          .select('metadata')
          .eq('resource_id', doc.id)
          .eq('action', 'document_signed')
          .limit(1)
          .single();

        const metadata = auditLogs?.metadata as { public_key?: string; signature?: string } | null;
        const dbPublicKey = metadata?.public_key;
        const dbSignature = metadata?.signature || signature.signature_data;
        
        if (!dbPublicKey) {
          setVerificationResult({
            verified: false,
            message: "Public key not found in database. Cannot verify signature."
          });
          return;
        }

        signatureData = dbSignature;
        publicKey = dbPublicKey;

        // Auto-populate manual fields with the EXACT keys from database
        setManualSignature(signatureData);
        setManualPublicKey(publicKey);
      }

      const isValid = await verifySignature(dataToVerify, signatureData, publicKey);

      if (isValid) {
        setVerificationResult({
          verified: true,
          message: "Signature verified successfully! Content is authentic and unmodified."
        });

        toast({
          title: "Verification Complete",
          description: "Signature is valid and authentic",
        });
      } else {
        setVerificationResult({
          verified: false,
          message: "Signature verification failed! Content may have been tampered with."
        });
      }
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
            <Tabs value={verifyMode} onValueChange={(v) => setVerifyMode(v as "file" | "text")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">
                  <Upload className="w-4 h-4 mr-2" />
                  Verify File
                </TabsTrigger>
                <TabsTrigger value="text">
                  <Type className="w-4 h-4 mr-2" />
                  Verify Text
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4 mt-4">
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
              </TabsContent>

              <TabsContent value="text" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="verify-text">Text to Verify</Label>
                  <Textarea
                    id="verify-text"
                    placeholder="Enter the text to verify..."
                    value={textContent}
                    onChange={(e) => handleTextChange(e.target.value)}
                    className="min-h-[200px] font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    The signature will be verified using the stored public key
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50">
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="w-4 h-4" />
                Verification Credentials
                {manualSignature && manualPublicKey && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">Auto-filled from database</span>
                )}
              </h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="manual-signature">Generated Signature (Base64)</Label>
                  {manualSignature && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(manualSignature);
                        toast({
                          title: "Copied!",
                          description: "Signature copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
                <Textarea
                  id="manual-signature"
                  placeholder="Paste the generated signature here or it will auto-fill from database..."
                  value={manualSignature}
                  onChange={(e) => setManualSignature(e.target.value)}
                  className="font-mono text-xs h-32"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="manual-public-key">Public Key (Same as in Sign Document)</Label>
                  {manualPublicKey && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(manualPublicKey);
                        toast({
                          title: "Copied!",
                          description: "Public key copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                  )}
                </div>
                <Textarea
                  id="manual-public-key"
                  placeholder="Paste the public key here or it will auto-fill from database..."
                  value={manualPublicKey}
                  onChange={(e) => setManualPublicKey(e.target.value)}
                  className="font-mono text-xs h-32"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-xs text-foreground">
                  <strong>✓ Auto-filled:</strong> Public key automatically loaded from your sign document keys.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Database lookup:</strong> Signature will auto-fill when you verify a document signed in this system.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong>Manual entry:</strong> You can paste both values manually if signing was done externally.
                </p>
              </div>
            </div>

            <Button
              onClick={handleVerify}
              disabled={(verifyMode === "file" ? !file : !textContent.trim()) || loading}
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
                      <p className="text-muted-foreground">{verificationResult.message}</p>
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
                <li>• Content hash generated using SHA-256</li>
                <li>• RSA-2048 signature verification with public key</li>
                <li>• Base64 signature comparison</li>
                <li>• Tamper detection through cryptographic validation</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerifySignature;
