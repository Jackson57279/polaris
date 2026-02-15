"use client";

import Link from "next/link";
import { motion, Variants } from "motion/react";
import { 
  Sparkles, 
  Zap, 
  MessageSquare,
  RefreshCw,
  Download,
  Check,
  Twitter,
  Github,
  Linkedin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.6 }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5 }
  }
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 }
  }
};

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5 }
  }
};

const pricingPlans = [
  {
    name: "Hobby",
    price: "$0",
    period: "/mo",
    description: "Perfect for side projects.",
    features: [
      "Basic Autocomplete",
      "Local LLM Support",
      "Community Support"
    ],
    cta: "Get Started",
    popular: false
  },
  {
    name: "Pro",
    price: "$20",
    period: "/mo",
    description: "For professional developers.",
    features: [
      "Everything in Hobby",
      "Unlimited Copilot++",
      "GPT-4o & Claude 3.5 Models",
      "Codebase Indexing (up to 10GB)"
    ],
    cta: "Subscribe Pro",
    popular: true
  },
  {
    name: "Team",
    price: "$40",
    period: "/mo",
    description: "For fast-moving squads.",
    features: [
      "Everything in Pro",
      "Centralized Billing",
      "SSO / SAML",
      "Priority Support"
    ],
    cta: "Contact Sales",
    popular: false
  }
];

const testimonials = [
  {
    quote: "Polaris actually understands my code structure. It's not just guessing text; it's architecting solutions. I can't go back to VS Code.",
    author: "Sarah Jenkins",
    role: "Senior Staff Engineer @ Nebula",
    avatar: "SJ"
  },
  {
    quote: "The debugging features are insane. It found a race condition in my React hook that I spent 4 hours looking for, in seconds.",
    author: "Mike Chen",
    role: "CTO @ Vortex.io",
    avatar: "MC"
  },
  {
    quote: "Finally, an AI editor that feels native. Fast, buttery smooth, and the chat interface is exactly where I need it to be.",
    author: "Alex Rivera",
    role: "Frontend Lead @ HyperLoop",
    avatar: "AR"
  }
];

const Navbar = () => {
  return (
    <motion.nav 
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#4169E1] flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="text-lg font-semibold">Polaris</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </Link>
          <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Customers
          </Link>
          <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Changelog
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/handler/sign-in" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/handler/sign-up">
            <Button size="sm" className="bg-[#4169E1] hover:bg-[#4169E1]/90 text-white">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[#4169E1]/10 rounded-full blur-[120px]" />
        <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div variants={fadeInUp}>
            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-[#4169E1]/30 bg-[#4169E1]/10 text-[#4169E1] rounded-full">
              <Sparkles className="w-3 h-3 mr-2" />
              v2.0 is now available in Public Beta
            </Badge>
          </motion.div>
          
          <motion.h1 
            variants={fadeInUp}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            Code at the
            <br />
            <span className="bg-gradient-to-r from-[#4169E1] via-purple-500 to-pink-500 bg-clip-text text-transparent">
              speed of thought.
            </span>
          </motion.h1>
          
          <motion.p 
            variants={fadeInUp}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Polaris is the AI-first editor designed to understand your entire codebase. 
            Generate, refactor, and debug faster than ever before.
          </motion.p>
          
          <motion.div 
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link href="/handler/sign-up">
              <Button size="lg" className="bg-[#4169E1] hover:bg-[#4169E1]/90 text-white px-8">
                <Download className="w-4 h-4 mr-2" />
                Download for Mac
              </Button>
            </Link>
            <Link href="#">
              <Button size="lg" variant="outline" className="px-8">
                Read the Manifesto
              </Button>
            </Link>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scaleIn}
          className="relative max-w-5xl mx-auto"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-[#4169E1]/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-2xl opacity-50" />
          
          <div className="relative bg-card border rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <span className="text-xs text-muted-foreground">main.tsx — Polaris</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 p-4 font-mono text-sm bg-[#1e1e1e]">
                <pre className="text-muted-foreground"><code>1  <span className="text-purple-400">import</span> {"{ useState, useEffect }"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;react&apos;</span>;</code></pre>
                <pre className="text-muted-foreground"><code>2  <span className="text-purple-400">import</span> {"{ OpenAI }"} <span className="text-purple-400">from</span> <span className="text-green-400">&apos;@polaris/ai&apos;</span>;</code></pre>
                <pre><code>3</code></pre>
                <pre className="text-muted-foreground"><code>4  <span className="text-purple-400">export default function</span> <span className="text-yellow-300">AIComponent</span>() {"{"}</code></pre>
                <pre className="text-muted-foreground"><code>5    <span className="text-purple-400">const</span> [data, setData] = <span className="text-yellow-300">useState</span>(null);</code></pre>
                <pre><code>6</code></pre>
                <pre className="text-muted-foreground"><code>7    <span className="text-gray-500">// Polaris Suggestion: Implement efficient data fetching with caching</span></code></pre>
                <pre className="bg-[#4169E1]/20 -mx-4 px-4"><code>8    <span className="text-purple-400">useEffect</span>(() =&gt; {"{"}</code></pre>
                <pre className="bg-[#4169E1]/20 -mx-4 px-4"><code>9      <span className="text-purple-400">const</span> fetchData = <span className="text-purple-400">async</span> () =&gt; {"{"}</code></pre>
                <pre className="bg-[#4169E1]/20 -mx-4 px-4"><code>10       <span className="text-purple-400">const</span> result = <span className="text-purple-400">await</span> api.<span className="text-yellow-300">get</span>(<span className="text-green-400">&apos;/users&apos;</span>);</code></pre>
                <pre className="bg-[#4169E1]/20 -mx-4 px-4"><code>11       <span className="text-yellow-300">setData</span>(result.json());</code></pre>
                <pre className="bg-[#4169E1]/20 -mx-4 px-4"><code>12     {"}"};</code></pre>
                <pre className="bg-[#4169E1]/20 -mx-4 px-4"><code>13   {"}"}, []);</code></pre>
                <pre><code>14</code></pre>
                <pre className="text-muted-foreground"><code>15   <span className="text-purple-400">return</span> (</code></pre>
                <pre className="text-muted-foreground"><code>16     {"<"}<span className="text-yellow-300">div</span> className=<span className="text-green-400">&quot;p-4 bg-slate-900&quot;</span>{"&gt;"}</code></pre>
                <pre className="text-muted-foreground"><code>17       {"{"}/* Content renders here */{"}"}</code></pre>
                <pre className="text-muted-foreground"><code>18     {"</"}<span className="text-yellow-300">div</span>{"&gt;"}</code></pre>
                <pre className="text-muted-foreground"><code>19   );</code></pre>
                <pre className="text-muted-foreground"><code>20 {"}"}</code></pre>
              </div>
              
              <div className="border-l bg-card/50 p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Polaris Chat</span>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                
                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded-lg text-xs">
                    <span className="text-[#4169E1] font-medium">AI</span>
                    <p className="mt-1 text-muted-foreground">I noticed you&apos;re fetching user data. Should I add error handling and a loading state?</p>
                  </div>
                  
                  <div className="bg-[#4169E1] text-white p-3 rounded-lg text-xs">
                    <p>Yes, please refactor it.</p>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg text-xs">
                    <span className="text-[#4169E1] font-medium">AI</span>
                    <p className="mt-1 text-muted-foreground">Generating refactor...</p>
                    <div className="mt-2 h-1 bg-background rounded-full overflow-hidden">
                      <div className="h-full w-2/3 bg-[#4169E1] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">Ask Polaris...</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
            Built for Flow State
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every feature in Polaris is crafted to keep your hands on the keyboard and your mind on the problem.
          </motion.p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={slideInLeft}
            className="group p-6 rounded-xl bg-card border hover:border-[#4169E1]/30 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-[#4169E1]/10 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-[#4169E1]" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Copilot++</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Predicts your next edit, not just the next word. Polaris understands project context to autocomplete entire functions.
            </p>
            <div className="bg-[#1e1e1e] rounded-lg p-3 font-mono text-xs overflow-hidden">
              <pre className="text-purple-400">function <span className="text-yellow-300">calculateVelocity</span>(d, t) {"{"}</pre>
              <pre className="text-gray-500">  // Copilot++ suggestion</pre>
              <pre className="text-blue-400">  return d / t;</pre>
              <pre className="text-purple-400">{"}"}</pre>
            </div>
          </motion.div>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={slideInRight}
            className="group p-6 rounded-xl bg-card border hover:border-[#4169E1]/30 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Context Aware</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Ask questions about your entire repo. &quot;Where is the auth logic?&quot;
            </p>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <div className="bg-card p-2 rounded mb-2 text-xs text-muted-foreground">
                How do I add a new route?
              </div>
              <div className="bg-[#4169E1]/10 p-2 rounded text-xs">
                <span className="text-[#4169E1] font-medium">Check routes.ts</span>. I can generate the boilerplate for you.
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={slideInLeft}
            className="group p-6 rounded-xl bg-card border hover:border-[#4169E1]/30 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <RefreshCw className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Refactor</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Transform messy code into clean, performant logic with a single click.
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="bg-red-500/10 p-2 rounded">
                <span className="text-red-400">-</span> var x = 10
                <br />
                <span className="text-red-400">-</span> var y = 20
                <br />
                <span className="text-red-400">-</span> console.log(x+y)
              </div>
              <div className="bg-green-500/10 p-2 rounded">
                <span className="text-green-400">+</span> const width = 10;
                <br />
                <span className="text-green-400">+</span> const height = 20;
                <br />
                <span className="text-green-400">+</span> console.log(area(width, height));
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={slideInRight}
            className="group p-6 rounded-xl bg-card border hover:border-[#4169E1]/30 transition-all duration-300"
          >
            <div className="h-full flex flex-col justify-center">
              <div className="bg-muted rounded-lg p-4 font-mono text-xs">
                <div className="text-muted-foreground mb-2">Ask about your code...</div>
                <div className="space-y-2">
                  <div className="bg-card p-2 rounded border">
                    Explain this function
                  </div>
                  <div className="bg-card p-2 rounded border">
                    Find all usages of this variable
                  </div>
                  <div className="bg-card p-2 rounded border">
                    Generate unit tests
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-muted/30">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mb-4">
            Simple, transparent pricing
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Start for free, upgrade when you need super powers.
          </motion.p>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto"
        >
          {pricingPlans.map((plan) => (
            <motion.div
              key={plan.name}
              variants={scaleIn}
              className={`relative p-6 rounded-xl border transition-all duration-300 ${
                plan.popular 
                  ? "bg-[#4169E1]/5 border-[#4169E1]/30 scale-105" 
                  : "bg-card border hover:border-[#4169E1]/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-[#4169E1] text-white border-0">
                    MOST POPULAR
                  </Badge>
                </div>
              )}
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/handler/sign-up" className="block">
                <Button 
                  className={`w-full ${
                    plan.popular 
                      ? "bg-[#4169E1] hover:bg-[#4169E1]/90 text-white" 
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const SocialProofSection = () => {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
          className="mb-12"
        >
          <div className="w-1 h-8 bg-[#4169E1] rounded-full mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold">
            Loved by engineers at
          </h2>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="flex flex-wrap gap-8 items-center mb-16 text-muted-foreground"
        >
          <span className="text-xl font-semibold">ACME Corp</span>
          <span className="text-xl font-semibold">Nebula</span>
          <span className="text-xl font-semibold">Vortex.io</span>
          <span className="text-xl font-semibold">HyperLoop</span>
          <span className="text-xl font-semibold">StackFlow</span>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              key={testimonial.author}
              variants={fadeInUp}
              className="p-6 rounded-xl bg-card border"
            >
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                &quot;{testimonial.quote}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4169E1] to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-medium text-sm">{testimonial.author}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="border-t py-16">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="grid md:grid-cols-5 gap-12"
        >
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#4169E1] flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-lg font-semibold">Polaris</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              The fast code editor you&apos;ll ever need. Built by developers, for developers, with intelligence at the core.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Github className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Twitter className="w-5 h-5" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                <Linkedin className="w-5 h-5" />
              </Link>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Download</Link></li>
              <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Changelog</Link></li>
              <li><Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">Documentation</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">API</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Community</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Blog</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Careers</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Manifesto</Link></li>
              <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mt-16 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-sm text-muted-foreground">
            © 2025 Polaris Inc. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made by Polaris • San Francisco
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <PricingSection />
        <SocialProofSection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
