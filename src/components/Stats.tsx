import { motion } from "framer-motion";
import { useTheme } from "@/hooks/use-theme";

export const Stats = () => {
  const { theme } = useTheme();
  
  const stats = [
    { label: "Projects", value: "50+" },
    { label: "Domains Managed", value: "100+" },
    { label: "Success Rate", value: "95%" },
  ];

  return (
    <section className="py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`glass-card p-6 rounded-xl text-center transform hover:scale-105 transition-transform duration-300 ${
              theme === 'dark' ? 'neon-border' : ''
            }`}
          >
            <h3 className="text-4xl font-black gradient-text mb-2">{stat.value}</h3>
            <p className="text-sm text-muted-foreground font-mono">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};