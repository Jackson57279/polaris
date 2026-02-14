"use client";

import Link from "next/link";
import { 
  Code2, 
  Sparkles, 
  Users, 
  Terminal, 
  Zap, 
  Globe,
  ArrowRight,
  Github,
  Play,
  FileCode,
  Bot,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Coding",
    description: "Intelligent code suggestions, quick edits with Cmd+K, and an AI conversation assistant that understands your codebase."
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description: "Work together in real-time with instant synchronization. See your teammates' cursors and changes live."
  },
  {
    icon: Terminal,
    title: "In-Browser Execution",
    description: "Run your code directly in the browser with WebContainer. No local setup required."
  },
  {
    icon: Globe,
    title: "GitHub Integration",
    description: "Import existing projects from GitHub or export your work. Keep your code synced anywhere."
  },
  {
    icon: Layers,
    title: "Desktop App",
    description: "Install the Electron desktop app for an offline-capable, native development experience."
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Built on modern web technologies for instant loading and smooth editing experience."
  }
];

const codeSnippet = `
// AI suggests this function
function calculateFibonacci(n) {
  if (n <= 1) return n;
  return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);
}

// Want me to optimize it?
// Press Cmd+K and ask "make it iterative"
`;

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-background to-background" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold">Polaris</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            Pricing
          </Link>
          <Link href="/handler/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/handler/sign-up">
            <Button size="sm">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      <section className="relative z-10 px-6 py-20 md:py-32 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm">
              <Sparkles className="w-4 h-4" />
              <span>AI-powered development environment</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
              Code with the power of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                AI at your fingertips
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-lg">
              A modern cloud IDE that combines powerful coding tools with intelligent AI assistance. 
              Build faster, collaborate in real-time, and ship anywhere.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/handler/sign-up">
                <Button size="lg" className="gap-2 text-base">
                  Start Building Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/handler/sign-in">
                <Button size="lg" variant="outline" className="gap-2 text-base">
                  <Play className="w-4 h-4" />
                  Watch Demo
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Github className="w-4 h-4" />
                <span>GitHub integration</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl" />
            <div className="relative bg-card border rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-background px-3 py-1 rounded-md">
                    <FileCode className="w-3 h-3" />
                    fibonacci.ts
                  </div>
                </div>
              </div>
              <div className="p-4 font-mono text-sm bg-background">
                <pre className="text-muted-foreground"><code>{`// AI suggests this function`}</code></pre>
                <pre className="text-blue-400"><code>function <span className="text-yellow-300">calculateFibonacci</span>(n) {`{`}</code></pre>
                <pre className="pl-4 text-blue-400"><code>if (n &lt;= 1) return n;</code></pre>
                <pre className="pl-4 text-blue-400"><code>return calculateFibonacci(n - 1) + calculateFibonacci(n - 2);</code></pre>
                <pre className="text-blue-400"><code>{"}"}</code></pre>
                <pre><code>{" "}</code></pre>
                <pre className="text-muted-foreground"><code>{`// Want me to optimize it?`}</code></pre>
                <pre className="text-muted-foreground"><code>{`// Press Cmd+K and ask "make it iterative"`}</code></pre>
                <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-start gap-2">
                    <Bot className="w-4 h-4 text-indigo-400 mt-0.5" />
                    <div className="text-xs text-indigo-300">
                      <span className="font-medium">AI Suggestion:</span> This recursive implementation has O(2^n) complexity. 
                      Would you like me to optimize it to O(n) using iteration?
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20 md:py-32 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to build amazing things
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete development environment that combines the best coding tools with AI-powered assistance.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group p-6 rounded-xl bg-card border hover:border-indigo-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-3xl" />
            <div className="relative bg-card border rounded-2xl p-12 md:p-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to transform your workflow?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
                Join thousands of developers who are already building faster with Polaris IDE.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/handler/sign-up">
                  <Button size="lg" className="gap-2 text-base">
                    Get Started for Free
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="text-base">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 px-6 py-8 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Polaris</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for developers who want more.
          </p>
        </div>
      </footer>
    </div>
  );
};
