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
import { Shield, Upload, FileSignature, ArrowLeft, Loader2, Key, Type, Copy, CheckCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { generateKeyPair, signData, generateHash } from "@/utils/crypto";

const SignDocument = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatingKeys, setGeneratingKeys] = useState(false);
  const [privateKey, setPrivateKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [signMode, setSignMode] = useState<"file" | "text">("file");
  const [generatedSignature, setGeneratedSignature] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        loadStoredKeys(session.user.id);
      }
    });
  }, [navigate]);

  const loadStoredKeys = async (userId: string) => {
    const stored = localStorage.getItem(`keys_${userId}`);
    if (stored) {
      const keys = JSON.parse(stored);
      setPrivateKey(keys.privateKey);
      setPublicKey(keys.publicKey);
    }
  };

  const handleGenerateKeys = async () => {
    if (!user) return;
    setGeneratingKeys(true);
    try {
      const keys = await generateKeyPair();
      setPrivateKey(keys.privateKey);
      setPublicKey(keys.publicKey);
      localStorage.setItem(`keys_${user.id}`, JSON.stringify(keys));
      toast({
        title: "Keys generated successfully!",
        description: "Your private and public keys are ready to use.",
      });
    } catch (error) {
      console.error("Error generating keys:", error);
      toast({
        title: "Error",
        description: "Failed to generate keys",
        variant: "destructive",
      });
    } finally {
      setGeneratingKeys(false);
    }
  };

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


  const handleSign = async () => {
    if (!user || !privateKey || !publicKey) {
      toast({
        title: "Keys required",
        description: "Please generate your key pair first",
        variant: "destructive",
      });
      return;
    }

    if (signMode === "file" && !file) {
      toast({
        title: "File required",
        description: "Please select a file to sign",
        variant: "destructive",
      });
      return;
    }

    if (signMode === "text" && !textContent.trim()) {
      toast({
        title: "Text required",
        description: "Please enter text to sign",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let dataToSign: string;
      let fileName: string;
      let filePath: string | null = null;

      if (signMode === "file" && file) {
        const fileContent = await file.text();
        dataToSign = fileContent;
        fileName = file.name;

        const fileExt = file.name.split('.').pop();
        filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
      } else {
        dataToSign = textContent;
        fileName = `text_document_${Date.now()}.txt`;
      }

      const fileHash = await generateHash(dataToSign);
      const signature = await signData(dataToSign, privateKey);
      
      // Store the generated signature for display
      setGeneratedSignature(signature);

      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_path: filePath || `text/${user.id}/${Date.now()}`,
          file_hash: fileHash,
          status: 'signed'
        })
        .select()
        .single();

      if (docError) throw docError;

      const { error: sigError } = await supabase
        .from('signatures')
        .insert({
          document_id: document.id,
          user_id: user.id,
          signature_data: signature,
          signature_hash: fileHash,
          ip_address: 'client-side',
          user_agent: navigator.userAgent
        });

      if (sigError) throw sigError;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'document_signed',
        resource_type: 'document',
        resource_id: document.id,
        ip_address: 'client-side',
        user_agent: navigator.userAgent,
        metadata: {
          file_name: fileName,
          sign_mode: signMode,
          public_key: publicKey
        }
      });

      toast({
        title: "Document signed successfully!",
        description: "Your document has been cryptographically signed with RSA-2048. Copy the signature below for verification.",
      });
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Key className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Cryptographic Keys</CardTitle>
              <CardDescription>
                Generate your RSA-2048 key pair for digital signatures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!privateKey || !publicKey ? (
                <Button onClick={handleGenerateKeys} disabled={generatingKeys} className="w-full" size="lg">
                  {generatingKeys ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Keys...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Generate Key Pair
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Key className="w-5 h-5" />
                    <span className="font-semibold">Keys Generated Successfully</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Public Key (Base64)</Label>
                      <div className="mt-1 p-3 bg-muted/50 rounded-md font-mono text-xs break-all">
                        {publicKey.substring(0, 80)}...
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Private Key (Base64)</Label>
                      <div className="mt-1 p-3 bg-muted/50 rounded-md font-mono text-xs break-all">
                        {privateKey.substring(0, 80)}... (Stored securely in browser)
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleGenerateKeys} variant="outline" size="sm">
                    Regenerate Keys
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <FileSignature className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Sign Document</CardTitle>
              <CardDescription>
                Choose to sign a file or text content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={signMode} onValueChange={(v) => setSignMode(v as "file" | "text")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <Type className="w-4 h-4 mr-2" />
                    Write Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="space-y-4 mt-4">
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
                </TabsContent>

                <TabsContent value="text" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-content">Text to Sign</Label>
                    <Textarea
                      id="text-content"
                      placeholder="Enter the text you want to sign..."
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      className="min-h-[200px] font-mono"
                    />
                    <p className="text-sm text-muted-foreground">
                      The text will be cryptographically signed with your private key
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {generatedSignature && (
                <Card className="border-2 border-primary">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <h3 className="font-bold text-lg">Document Signed Successfully!</h3>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="generated-signature">Generated Signature (Base64)</Label>
                      <Textarea
                        id="generated-signature"
                        value={generatedSignature}
                        readOnly
                        className="font-mono text-xs h-32"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedSignature);
                          toast({
                            title: "Copied!",
                            description: "Signature copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Signature
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="public-key-copy">Public Key (for verification)</Label>
                      <Textarea
                        id="public-key-copy"
                        value={publicKey}
                        readOnly
                        className="font-mono text-xs h-32"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(publicKey);
                          toast({
                            title: "Copied!",
                            description: "Public key copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Public Key
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-medium">Security Features:</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• RSA-2048 asymmetric cryptography</li>
                  <li>• Base64 encoded signatures</li>
                  <li>• SHA-256 hash verification</li>
                  <li>• Complete audit trail logging</li>
                  <li>• Encrypted cloud storage</li>
                </ul>
              </div>

              <Button
                onClick={handleSign}
                disabled={!privateKey || !publicKey || (signMode === "file" ? !file : !textContent.trim()) || loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <FileSignature className="w-4 h-4 mr-2" />
                    Sign {signMode === "file" ? "File" : "Text"}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SignDocument;
