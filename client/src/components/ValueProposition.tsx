import { Lightbulb, Users, Vote, BookOpen, Film } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ValueProposition() {
  const features = [
    {
      icon: Lightbulb,
      title: "Innovation Hub",
      description: "Discover groundbreaking sustainability projects from students across the school. Explore ideas that are shaping a better future.",
      iconColor: "text-primary",
    },
    {
      icon: Users,
      title: "Dashboard",
      description: "Track your project progress, receive feedback, and collaborate with your team in one centralized, high-tech workspace.",
      iconColor: "text-leaf-green",
    },
    {
      icon: Vote,
      title: "Voting System",
      description: "Cast your vote for the most impactful projects and help determine the winners of the People's Choice Award.",
      iconColor: "text-digital-cyan",
    },
    {
      icon: BookOpen,
      title: "Resources",
      description: "Access comprehensive guides, rubrics, and resources to help you develop and present your sustainability project.",
      iconColor: "text-orange-500",
    },
    {
      icon: Film,
      title: "Cinema",
      description: "Watch inspiring sustainability documentaries and student project highlights that showcase innovation in action.",
      iconColor: "text-rose-500",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-20 animate-fadeIn">
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight hero-text-glow">What You'll Experience</h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Tomorrow's Earth Expo provides a premium platform to develop, showcase, and celebrate your innovations.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="glass-card p-10 rounded-[2.5rem] flex flex-col items-center text-center group hover:scale-[1.05] hover:-translate-y-2 transition-all duration-500 border-white/20 shadow-2xl"
              >
                <div className={`${feature.iconColor} mb-8 p-6 glass-card rounded-3xl group-hover:scale-110 transition-transform duration-500`}>
                  <IconComponent size={48} strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-black mb-4 tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
