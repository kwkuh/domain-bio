const skills = [
  "Domain Management",
  "DNS Configuration",
  "Domain Strategy",
  "Domain Portfolio Management",
  "Digital Marketing",
  "Domain Acquisition",
  "Domain Monetization",
  "DNS Security",
  "Domain Catch",
  "Domain Broker",
  "Brand Identity",
  "Brand Protection",
  "SEO",
  "Content Marketing",
  "Social Media",
  "Market Research",
  "Analytics",
  "Brand Development",
  "Client Relations",
  "Digital Strategy",
  "SEO Optimization",
  "Backlink Building",
  "Link Building Strategy",
  "Website Design",
  "Landing Page Design",
  "WordPress Development",
  "Digital Branding",
  "Email Marketing",
  "Social Media Marketing",
  "Content Strategy",
  "Conversion Optimization",
  "Google Analytics",
  "Search Console Management"
];

export const Skills = () => {
  return (
    <section className="py-16">
      <div className="space-y-8">
        <h2 className="text-3xl font-black font-mono text-primary tracking-tight">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-muted rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-default animate-fade-in font-mono font-bold"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};