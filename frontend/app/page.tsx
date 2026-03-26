"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";

// ── 3D Network Animation ──
function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let mouse = { x: -1000, y: -1000 };

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const handleMouseMove = (e: MouseEvent) => { mouse = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", handleMouseMove);

    interface Node { x: number; y: number; z: number; vx: number; vy: number; vz: number; size: number; pulse: number; pulseSpeed: number; }
    const nodes: Node[] = [];
    for (let i = 0; i < 80; i++) {
      nodes.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, z: Math.random() * 400, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, vz: (Math.random() - 0.5) * 0.3, size: Math.random() * 2.5 + 1, pulse: Math.random() * Math.PI * 2, pulseSpeed: Math.random() * 0.02 + 0.01 });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx; n.y += n.vy; n.z += n.vz; n.pulse += n.pulseSpeed;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
        if (n.z < 0 || n.z > 400) n.vz *= -1;
        const dx = n.x - mouse.x, dy = n.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) { const f = (1 - dist / 250) * 0.02; n.vx += dx * f; n.vy += dy * f; }
        n.vx *= 0.999; n.vy *= 0.999;
        const scale = Math.max(0.05, (400 - n.z) / 400);
        const drawSize = Math.max(0.1, n.size * scale * (1 + Math.sin(n.pulse) * 0.3));
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j], cdx = n.x - m.x, cdy = n.y - m.y, cd = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cd < 200) { ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.strokeStyle = `rgba(99,102,241,${Math.max(0, (1 - cd / 200) * 0.15 * scale)})`; ctx.lineWidth = Math.max(0.1, 0.5 * scale); ctx.stroke(); }
        }
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, drawSize * 4);
        g.addColorStop(0, `rgba(99,102,241,${0.4 * scale})`); g.addColorStop(1, "rgba(99,102,241,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, drawSize * 4, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, drawSize, 0, Math.PI * 2); ctx.fillStyle = `rgba(165,180,252,${0.8 * scale})`; ctx.fill();
      }
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(animationId); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", handleMouseMove); };
  }, []);

  return <canvas ref={canvasRef} id="network-canvas" />;
}

// ── Floating gradient orbs ──
function FloatingOrbs() {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
    </div>
  );
}

// ── Scroll-reveal wrapper ──
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ── Animated counter hook ──
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (!started) return;
    let v = 0; const step = target / (duration / 16);
    const t = setInterval(() => { v += step; if (v >= target) { setCount(target); clearInterval(t); } else setCount(Math.floor(v)); }, 16);
    return () => clearInterval(t);
  }, [started, target, duration]);
  return { count, ref };
}

// ── Typing text effect ──
function TypingText({ texts }: { texts: string[] }) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const cur = texts[index];
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && displayed.length < cur.length) t = setTimeout(() => setDisplayed(cur.slice(0, displayed.length + 1)), 80);
    else if (!deleting && displayed.length === cur.length) t = setTimeout(() => setDeleting(true), 2000);
    else if (deleting && displayed.length > 0) t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 40);
    else if (deleting) { setDeleting(false); setIndex((i) => (i + 1) % texts.length); }
    return () => clearTimeout(t!);
  }, [displayed, deleting, index, texts]);
  return <span className="text-brand-400">{displayed}<span className="animate-pulse text-brand-300">|</span></span>;
}

// ── Animated agent demo ──
function AgentDemo() {
  const [step, setStep] = useState(0);
  const msgs = [
    { role: "user" as const, text: "Find me React developer jobs in San Francisco" },
    { role: "agent" as const, text: "Searching 10,000+ listings... Found 12 high-match positions." },
    { role: "agent" as const, text: "Top match: Senior React Engineer at Stripe — 94% fit based on your resume." },
    { role: "user" as const, text: "Draft an application email for the Stripe role" },
    { role: "agent" as const, text: "Email drafted and ready to send via Gmail. Subject: \"Application — Senior React Engineer\"" },
  ];

  useEffect(() => {
    if (step >= msgs.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 1200 : 1800);
    return () => clearTimeout(t);
  }, [step, msgs.length]);

  const restart = useCallback(() => setStep(0), []);

  return (
    <div className="relative gradient-border rounded-2xl overflow-hidden backdrop-blur-md">
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <span className="w-3 h-3 rounded-full bg-red-500/80" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs text-gray-500 font-mono">CareerForge Agent — Live Session</span>
        <button onClick={restart} className="ml-auto text-xs text-gray-600 hover:text-brand-400 transition-colors font-mono">replay</button>
      </div>
      <div className="p-5 space-y-3 min-h-[260px]">
        {msgs.slice(0, step).map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`} style={{ animationDelay: `${i * 80}ms` }}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-brand-600/90 text-white" : "bg-white/5 border border-white/10 text-gray-300"}`}>
              {m.text}
            </div>
          </div>
        ))}
        {step < msgs.length && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
              <div className="flex gap-1">
                <span className="typing-dot w-1.5 h-1.5 bg-brand-400 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 bg-brand-400 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 bg-brand-400 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════
// ── HomePage ──
// ══════════════════════════════════════════════════
export default function HomePage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const t = setInterval(() => setActiveStep((s) => (s + 1) % 4), 3500);
    return () => clearInterval(t);
  }, []);

  const handleUpload = async () => {
    if (!resumeFile) return;
    setUploading(true); setUploadStatus("");
    const fd = new FormData(); fd.append("file", resumeFile);
    try {
      const res = await fetch(`${API_URL}/resume/upload`, { method: "POST", body: fd });
      const data = await res.json();
      setUploadStatus(res.ok ? `Resume indexed! ${data.chunks} chunks created.` : `Error: ${data.detail}`);
    } catch { setUploadStatus("Failed to connect to backend."); }
    finally { setUploading(false); }
  };

  const stat1 = useCounter(10000);
  const stat2 = useCounter(95);
  const stat3 = useCounter(50);
  const stat4 = useCounter(24);

  const steps = [
    { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12", label: "Upload", title: "Upload Your Resume", desc: "Drop your PDF and our AI extracts skills, experience, and career goals in seconds." },
    { icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9", label: "Connect", title: "Connect Your Accounts", desc: "Link Gmail and Calendar so the agent can draft emails and schedule interviews on your behalf." },
    { icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", label: "Analyze", title: "AI Agent Goes to Work", desc: "GPT-4o matches your profile against thousands of openings, ranks by fit, and surfaces the best opportunities." },
    { icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "Act", title: "Take Action", desc: "One-click apply, auto-drafted cover letters, scheduled follow-ups — your agent handles the busywork." },
  ];

  const features = [
    { icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z", title: "Smart Job Search", desc: "Semantic matching against 10k+ listings ranked by your skills and goals.", color: "brand" },
    { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", title: "Resume Analysis", desc: "RAG-powered vector search extracts strengths, gaps, and improvement areas.", color: "purple" },
    { icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", title: "Email Automation", desc: "Auto-draft cover letters, follow-ups, and thank-you notes via Gmail.", color: "emerald" },
    { icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", title: "Calendar Sync", desc: "Schedule mock interviews and follow-ups directly on your Google Calendar.", color: "blue" },
    { icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", title: "Real-Time Dashboard", desc: "Interactive chat UI where you converse with the agent and see live results.", color: "cyan" },
    { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: "Autonomous Actions", desc: "The agent decides which tools to use, chains them, and reports back — zero hand-holding.", color: "amber" },
  ];

  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    brand:   { bg: "bg-brand-500/10", border: "border-brand-500/20", text: "text-brand-400" },
    purple:  { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
    blue:    { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
    cyan:    { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400" },
    amber:   { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
  };

  const techStack = [
    { name: "Next.js", color: "text-white" }, { name: "React 19", color: "text-cyan-400" },
    { name: "FastAPI", color: "text-emerald-400" }, { name: "GPT-4o", color: "text-purple-400" },
    { name: "ChromaDB", color: "text-orange-400" }, { name: "OpenAI Functions", color: "text-green-400" },
    { name: "Gmail API", color: "text-red-400" }, { name: "Calendar API", color: "text-blue-400" },
    { name: "TypeScript", color: "text-blue-300" }, { name: "Tailwind CSS", color: "text-teal-400" },
    { name: "Docker", color: "text-sky-400" }, { name: "Python 3.11", color: "text-yellow-400" },
  ];

  return (
    <>
      <NetworkBackground />
      <FloatingOrbs />
      <main className="relative z-10 flex flex-col items-center min-h-screen px-4 overflow-x-hidden">

        {/* ── Hero ── */}
        <section className="flex flex-col items-center justify-center min-h-screen text-center max-w-4xl mx-auto">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-brand-950/60 text-brand-300 px-5 py-2 rounded-full text-sm font-medium mb-8 border border-brand-800/40 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-400" />
              </span>
              AI-Powered Career Agent
            </div>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 leading-[0.95]">
              <span className="text-white">Career</span>
              <span className="bg-gradient-to-r from-brand-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Forge</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-2xl md:text-3xl text-gray-300 font-light mb-4">
              <TypingText texts={["Find your dream job in seconds", "Auto-draft cover letters with AI", "Schedule interviews automatically", "Analyze resume strengths instantly"]} />
            </p>
          </Reveal>
          <Reveal delay={300}>
            <p className="text-base text-gray-500 mb-10 max-w-xl leading-relaxed">
              The autonomous AI agent that searches jobs, analyzes your resume,
              drafts emails, and manages your entire career pipeline — so you can focus on what matters.
            </p>
          </Reveal>
          <Reveal delay={400}>
            <div className="flex gap-4 flex-wrap justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="!px-10 !py-4 !text-base !rounded-2xl shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 transition-all hover:scale-105">
                  Launch Dashboard →
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="secondary" size="lg" className="!px-10 !py-4 !text-base !rounded-2xl transition-all hover:scale-105">
                  How It Works
                </Button>
              </a>
            </div>
          </Reveal>
          <div className="mt-16 animate-bounce">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </div>
        </section>

        {/* ── Live Stats ── */}
        <section className="w-full max-w-5xl mx-auto mb-28">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { ref: stat1.ref, val: `${stat1.count.toLocaleString()}+`, label: "Jobs Indexed" },
              { ref: stat2.ref, val: `${stat2.count}%`, label: "Match Accuracy" },
              { ref: stat3.ref, val: `${stat3.count}ms`, label: "Avg Response" },
              { ref: stat4.ref, val: `${stat4.count}/7`, label: "Always Online" },
            ].map((s, i) => (
              <Reveal key={i} delay={i * 100}>
                <div ref={s.ref} className="gradient-border rounded-2xl p-6 backdrop-blur-md text-center group hover:scale-105 transition-transform cursor-default">
                  <p className="text-3xl md:text-4xl font-bold text-white mb-1">{s.val}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Agent Capabilities ── */}
        <section className="w-full max-w-5xl mx-auto mb-28">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-brand-400 text-sm font-semibold tracking-wider uppercase mb-3">What Your Agent Can Do</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Six Powerful Capabilities</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Each tool is available to the agent autonomously — it decides when and how to chain them together.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const c = colorMap[f.color];
              return (
                <Reveal key={i} delay={i * 80}>
                  <div className="group gradient-border rounded-2xl p-6 backdrop-blur-md hover:scale-[1.03] transition-all duration-300 cursor-default h-full">
                    <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center mb-4 border ${c.border} group-hover:scale-110 transition-transform`}>
                      <svg className={`w-5 h-5 ${c.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                    </div>
                    <h3 className="font-semibold text-white text-base mb-1.5">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ── Live Agent Demo ── */}
        <section className="w-full max-w-5xl mx-auto mb-28">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <div>
                <p className="text-brand-400 text-sm font-semibold tracking-wider uppercase mb-3">See It In Action</p>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Your Agent, Working Live</h2>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Watch how the agent processes a natural language query, searches thousands of job listings, finds the best match, and drafts a professional application email — all in one conversation.
                </p>
                <ul className="space-y-3">
                  {["Understands context from your resume", "Chains multiple tools automatically", "Returns structured, actionable results"].map((t, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                      <span className="w-5 h-5 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <AgentDemo />
            </Reveal>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="w-full max-w-5xl mx-auto mb-28 scroll-mt-20">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-brand-400 text-sm font-semibold tracking-wider uppercase mb-3">Simple Workflow</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">How It Works</h2>
              <p className="text-gray-500 max-w-lg mx-auto">Four steps from upload to hired. Our agent automates the tedious parts of your job search.</p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="flex items-center justify-center gap-0 mb-10">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center">
                  <button onClick={() => setActiveStep(i)} className={`relative flex flex-col items-center group transition-all duration-300 ${activeStep === i ? "scale-110" : "opacity-50 hover:opacity-80"}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300 ${activeStep === i ? "bg-brand-500/20 border-brand-500/50 shadow-lg shadow-brand-500/20" : "bg-white/5 border-white/10"}`}>
                      <svg className={`w-6 h-6 transition-colors ${activeStep === i ? "text-brand-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} /></svg>
                    </div>
                    <span className={`text-xs mt-2 font-medium transition-colors ${activeStep === i ? "text-brand-300" : "text-gray-600"}`}>{step.label}</span>
                  </button>
                  {i < steps.length - 1 && <div className={`w-12 md:w-20 h-0.5 mx-2 rounded transition-colors duration-300 ${i < activeStep ? "bg-brand-500/50" : "bg-white/5"}`} />}
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="gradient-border rounded-2xl p-8 md:p-10 backdrop-blur-md text-center max-w-2xl mx-auto transition-all duration-500">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{steps[activeStep].title}</h3>
              <p className="text-gray-400 leading-relaxed">{steps[activeStep].desc}</p>
              <div className="mt-6 flex justify-center">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (<div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === activeStep ? "w-8 bg-brand-400" : "w-2 bg-white/10"}`} />))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Get Started Cards ── */}
        <section className="w-full max-w-5xl mx-auto mb-28">
          <Reveal>
            <div className="text-center mb-14">
              <p className="text-brand-400 text-sm font-semibold tracking-wider uppercase mb-3">Quick Setup</p>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Get Started</h2>
              <p className="text-gray-500 max-w-lg mx-auto">Set up your agent in under a minute. Upload, connect, and launch.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            <Reveal delay={0}>
              <div className="gradient-border rounded-2xl p-6 backdrop-blur-md float-animation group hover:scale-[1.03] transition-all h-full" style={{ animationDelay: "0s" }}>
                <div className="w-12 h-12 bg-brand-500/15 rounded-xl flex items-center justify-center mb-5 border border-brand-500/20 group-hover:bg-brand-500/25 transition-colors">
                  <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Upload Resume</h3>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">Upload your PDF resume for AI-powered analysis and job matching.</p>
                <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-brand-500/30 file:text-sm file:font-medium file:bg-brand-500/10 file:text-brand-300 hover:file:bg-brand-500/20 mb-3 file:cursor-pointer" />
                <Button onClick={handleUpload} disabled={!resumeFile || uploading} size="sm">{uploading ? "Uploading..." : "Upload & Index"}</Button>
                {uploadStatus && <p className="mt-2 text-xs text-gray-400">{uploadStatus}</p>}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="gradient-border rounded-2xl p-6 backdrop-blur-md float-animation group hover:scale-[1.03] transition-all h-full" style={{ animationDelay: "0.5s" }}>
                <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center mb-5 border border-emerald-500/20 group-hover:bg-emerald-500/25 transition-colors">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Connect Google</h3>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">Link Gmail and Calendar for automated email drafts and scheduling.</p>
                <Button variant="secondary" size="sm" onClick={async () => {
                  try { const res = await fetch(`${API_URL}/auth/google/login`); const data = await res.json(); if (data.auth_url) window.location.href = data.auth_url; }
                  catch { alert("Failed to connect to backend"); }
                }}>Connect Account</Button>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="gradient-border rounded-2xl p-6 backdrop-blur-md glow-card float-animation group hover:scale-[1.03] transition-all h-full" style={{ animationDelay: "1s" }}>
                <div className="w-12 h-12 bg-purple-500/15 rounded-xl flex items-center justify-center mb-5 border border-purple-500/20 group-hover:bg-purple-500/25 transition-colors">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">Launch Agent</h3>
                <p className="text-sm text-gray-400 mb-5 leading-relaxed">Start the AI agent to find jobs, analyze your profile, and take action.</p>
                <Link href="/dashboard"><Button size="sm">Open Dashboard</Button></Link>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section className="w-full max-w-5xl mx-auto mb-28">
          <Reveal>
            <p className="text-xs text-gray-600 uppercase tracking-widest text-center mb-6">Powered By</p>
            <div className="relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0a0a0f] to-transparent z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0a0a0f] to-transparent z-10" />
              <div className="flex animate-scroll gap-8 whitespace-nowrap">
                {[...techStack, ...techStack].map((t, i) => (
                  <span key={i} className={`text-sm font-mono font-medium ${t.color} opacity-60 hover:opacity-100 transition-opacity cursor-default select-none`}>{t.name}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Final CTA ── */}
        <section className="w-full max-w-3xl mx-auto mb-16 text-center">
          <Reveal>
            <div className="relative gradient-border rounded-3xl p-10 md:p-14 backdrop-blur-md overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Forge Your Career?</h2>
                <p className="text-gray-400 mb-8 max-w-lg mx-auto">Stop spending hours on job boards. Let the AI agent do the heavy lifting while you prepare for interviews.</p>
                <Link href="/dashboard">
                  <Button size="lg" className="!px-12 !py-4 !text-base !rounded-2xl shadow-lg shadow-brand-600/30 hover:shadow-brand-600/50 transition-all hover:scale-105">
                    Get Started — It&apos;s Free
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ── Footer ── */}
        <footer className="w-full max-w-5xl mx-auto pb-8 pt-4 border-t border-white/5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
            <p>CareerForge Agent &copy; {new Date().getFullYear()} — Built with AI</p>
            <div className="flex gap-6">
              <span className="hover:text-gray-400 transition-colors cursor-default">Next.js + FastAPI + GPT-4o</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
