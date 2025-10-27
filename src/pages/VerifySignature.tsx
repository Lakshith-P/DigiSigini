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
import { Shield, ArrowLeft, CheckCircle, XCircle, Upload, Loader2, Type } from "lucide-react";
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
          message: "This content has not been signed or the signature is invalid"
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

      // Get public key from audit logs
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('metadata')
        .eq('resource_id', doc.id)
        .eq('action', 'document_signed')
        .limit(1)
        .single();

      const metadata = auditLogs?.metadata as { public_key?: string } | null;
      const publicKey = metadata?.public_key;
      
      if (!publicKey) {
        setVerificationResult({
          verified: false,
          message: "Public key not found. Cannot verify signature."
        });
        return;
      }

      const isValid = await verifySignature(dataToVerify, signature.signature_data, publicKey);

      if (isValid) {
        setVerificationResult({
          verified: true,
          message: "Signature verified successfully! Content is authentic and unmodified.",
          details: {
            fileName: doc.file_name,
            signedAt: new Date(signature.created_at).toLocaleString(),
            status: doc.status,
            signatureBase64: signature.signature_data.substring(0, 64) + "...",
            publicKeyPreview: publicKey.substring(0, 64) + "..."
          }
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
                      <p className="text-muted-foreground mb-4">{verificationResult.message}</p>
                      
                      {verificationResult.verified && verificationResult.details && (
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-2 border-t border-border">
                            <span className="text-muted-foreground">File Name:</span>
                            <span className="font-medium">{verificationResult.details.fileName}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t border-border">
                            <span className="text-muted-foreground">Signed At:</span>
                            <span className="font-medium">{verificationResult.details.signedAt}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t border-border">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium capitalize">{verificationResult.details.status}</span>
                          </div>
                          <div className="py-2 border-t border-border space-y-1">
                            <span className="text-muted-foreground">Signature (Base64):</span>
                            <p className="font-mono text-xs break-all bg-muted/50 p-2 rounded">
                              {verificationResult.details.signatureBase64}
                            </p>
                          </div>
                          <div className="py-2 border-t border-border space-y-1">
                            <span className="text-muted-foreground">Public Key:</span>
                            <p className="font-mono text-xs break-all bg-muted/50 p-2 rounded">
                              {verificationResult.details.publicKeyPreview}
                            </p>
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
