import { Code2, Globe2, Search, ShoppingCart, Users2, Wallet } from "lucide-react";

const skillGroups = [
  {
    title: "Domain Management",
    icon: Globe2,
    side: "left"
  },
  {
    title: "DNS Configuration",
    icon: Code2,
    side: "left"
  },
  {
    title: "Digital Marketing",
    icon: Search,
    side: "right"
  },
  {
    title: "Client Relations",
    icon: Users2,
    side: "right"
  },
  {
    title: "Domain Investment",
    icon: Wallet,
    side: "left"
  },
  {
    title: "Domain Broker",
    icon: ShoppingCart,
    side: "right"
  }
];

export const Skills = () => {
  return (
    <section className="py-16 relative">
      <div className="space-y-8">
        <div className="relative">
          {/* Left Skills */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 space-y-8">
            {skillGroups.filter(skill => skill.side === "left").map((skill, index) => (
              <div key={index} className="flex items-center justify-end gap-4 group">
                <div className="text-sm font-mono opacity-70 group-hover:opacity-100 transition-opacity">
                  {skill.title}
                </div>
                <div className="relative">
                  <skill.icon className="w-8 h-8 text-purple-500" />
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full filter blur-lg animate-pulse" />
                </div>
                <div className="h-0.5 w-24 bg-gradient-to-r from-purple-500/50 to-blue-500/50 energy-pulse" />
              </div>
            ))}
          </div>

          {/* Right Skills */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 space-y-8">
            {skillGroups.filter(skill => skill.side === "right").map((skill, index) => (
              <div key={index} className="flex items-center justify-start gap-4 group">
                <div className="h-0.5 w-24 bg-gradient-to-l from-purple-500/50 to-blue-500/50 energy-pulse" />
                <div className="relative">
                  <skill.icon className="w-8 h-8 text-purple-500" />
                  <div className="absolute inset-0 bg-purple-500/20 rounded-full filter blur-lg animate-pulse" />
                </div>
                <div className="text-sm font-mono opacity-70 group-hover:opacity-100 transition-opacity">
                  {skill.title}
                </div>
              </div>
            ))}
          </div>

          {/* Central Element */}
          <div className="mx-auto w-64 perspective-1000">
            <div className="relative transform-style-3d">
              <div className="os-window bg-black/90 border-purple-500/20">
                <div className="p-4">
                  <h2 className="text-2xl font-black font-mono text-purple-400 tracking-tight mb-2">
                    Skills
                  </h2>
                  <p className="text-sm text-purple-300/70 font-mono">
                    Domain & Digital Expertise
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};