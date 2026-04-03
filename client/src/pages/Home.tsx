import HeroSection from "@/components/HeroSection";
import CategorySelection from "@/components/CategorySelection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import Navigation from "@/components/Navigation";
import { Link } from "wouter";
import { OAuthRedirect } from "@/components/OAuthRedirect";
import ValueProposition from "@/components/ValueProposition";

export default function Home() {
  const { data: stats } = trpc.projects.getStats.useQuery();
  const { data: categories } = trpc.categories.getAll.useQuery();

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-leaf-green/10 via-background to-background">
      <OAuthRedirect />
      <Navigation />

      {/* Hero Section */}
      <HeroSection />

      {/* Value Proposition Section */}
      <ValueProposition />

      {/* Category Selection Section */}
      <CategorySelection />

      {/* Stats Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {[
              { label: stats?.totalProjects ? "Projects Submitted" : "Be the first to submit!", value: stats?.totalProjects || 0, color: "text-primary" },
              { label: stats?.totalStudents ? "Students Participating" : "Join the movement!", value: stats?.totalStudents || 0, color: "text-leaf-green" },
              { label: "Innovation Categories", value: categories?.length || 4, color: "text-digital-cyan" }
            ].map((stat, idx) => (
              <div key={idx} className="glass-card p-10 rounded-3xl text-center group hover:scale-[1.02] transition-transform duration-500">
                <div className={`text-6xl font-black mb-4 tracking-tighter ${stat.color} hero-text-glow`}>
                  {stat.value}
                </div>
                <div className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-8">Our Mission</h2>
          <div className="prose dark:prose-invert max-w-none text-center">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Tomorrow's Earth Expo empowers high school students to become environmental innovators and leaders. Through collaborative projects in environmental protection, sustainable communities, green innovation, and educational awareness, we inspire the next generation to design realistic solutions that raise awareness and demonstrate positive impact for a thriving planet.
            </p>
          </div>
        </div>
      </section>

      {/* Event Info Section */}
      <section className="py-24 relative">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight hero-text-glow mb-4">Mark Your Calendar</h2>
            <p className="text-muted-foreground font-medium">Be part of the most awaited sustainability showcase of 2026</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 rounded-3xl text-center border-l-4 border-l-primary group">
              <div className="text-sm font-bold uppercase tracking-widest text-primary mb-4 opacity-70">Event Date</div>
              <p className="text-4xl font-black mb-2 tracking-tighter">May 14, 2026</p>
              <p className="text-xs text-muted-foreground font-medium">Join us for the grand expo celebration</p>
            </div>
            <div className="glass-card p-8 rounded-3xl text-center border-l-4 border-l-leaf-green">
              <div className="text-sm font-bold uppercase tracking-widest text-leaf-green mb-4 opacity-70">Location</div>
              <p className="text-3xl font-black mb-2 tracking-tight">Um Al-Emarat School</p>
              <p className="text-xs text-muted-foreground font-medium">Abu-Dhabi, United Arab Emirates</p>
            </div>
            <div className="glass-card p-8 rounded-3xl text-center border-l-4 border-l-digital-cyan">
              <div className="text-sm font-bold uppercase tracking-widest text-digital-cyan mb-4 opacity-70">Key Milestones</div>
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs px-2">
                  <span className="font-bold">Apr 30</span>
                  <span className="text-muted-foreground">Deadline</span>
                </div>
                <div className="flex justify-between items-center text-xs px-2">
                  <span className="font-bold">May 1-10</span>
                  <span className="text-muted-foreground">Review</span>
                </div>
                <div className="flex justify-between items-center text-xs px-2">
                  <span className="font-bold">May 14</span>
                  <span className="text-primary font-black">Expo Day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
        <div className="container text-center relative">
          <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-leaf-green to-digital-cyan">Innovate?</span></h2>
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto font-medium">
            Join the journey of sustainability. Showcase your brilliance, vote for the best, and help us save the planet.
          </p>
          <div className="flex justify-center gap-6 flex-wrap">
            <Link href="/innovation-hub">
              <Button size="lg" className="rounded-full px-10 py-8 premium-gradient text-white text-lg font-bold shadow-2xl hover:scale-105 transition-transform border-none">
                Get Started
              </Button>
            </Link>
            <Link href="/vote">
              <Button size="lg" variant="outline" className="rounded-full px-10 py-8 glass-card border-white/20 text-lg font-bold hover:scale-105 transition-transform">
                Vote Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 glass-card border-none rounded-t-[3rem] mt-12">
        <div className="container px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-center md:text-left space-y-4">
              <div className="flex items-center justify-center md:justify-start gap-4">
                <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663327629652/4H46x9AiKyJYDgF5KtC5JK/tee-logo-icon-c4HyST3WbgCi982xP8aQdA.webp" alt="TEE" className="h-12 w-12 object-contain" />
                <span className="text-2xl font-black tracking-tighter">TEE-2026</span>
              </div>
              <p className="text-muted-foreground max-w-md font-medium text-sm">
                Empowering Um Al-Emarat School students to lead the sustainability movement through innovation and creativity.
              </p>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4">
              {["Innovation Hub", "Journey Cinema", "Voting System", "Resources"].map(link => (
                <Link key={link} href={`/${link.toLowerCase().replace(' ', '-')}`} className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
                  {link}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-border/40 text-center text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground/40">
            © 2026 Tomorrow's Earth Expo • All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
