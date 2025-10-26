import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileSignature, Lock, CheckCircle, Activity, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        
        <header className="container mx-auto px-4 py-6 relative z-10">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">SecureSign</span>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
              <Button onClick={() => navigate("/auth")}>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </nav>
        </header>

        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Enterprise-Grade Security</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Digital Signatures Made Secure
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Sign, verify, and manage documents with military-grade encryption. 
              Full audit trails and compliance-ready security.
            </p>

            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start Signing Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline">
                View Demo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose SecureSign?</h2>
          <p className="text-xl text-muted-foreground">Built for security professionals and enterprises</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="border-border bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Military-Grade Encryption</CardTitle>
              <CardDescription>
                End-to-end encryption with SHA-256 hashing ensures your documents are always secure
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <FileSignature className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Legal Compliance</CardTitle>
              <CardDescription>
                Meets international standards for digital signatures and document authentication
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Activity className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Complete Audit Trail</CardTitle>
              <CardDescription>
                Every action is logged with timestamps, IP addresses, and device information
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Instant Verification</CardTitle>
              <CardDescription>
                Verify signature authenticity instantly with our advanced verification system
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Secure Storage</CardTitle>
              <CardDescription>
                Documents stored with bank-level security in encrypted cloud storage
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-gradient-to-br from-card to-card/50">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              <CardTitle>Role-Based Access</CardTitle>
              <CardDescription>
                Control who can sign, view, or verify documents with granular permissions
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-24">
        <Card className="border-border bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of professionals who trust SecureSign for their digital signature needs
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 SecureSign. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
