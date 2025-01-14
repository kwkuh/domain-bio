const skills = [
  "Digital Marketing",
  "Domain Management",
  "Brand Strategy",
  "SEO",
  "Content Marketing",
  "Social Media",
  "Market Research",
  "Analytics",
  "Brand Development",
  "Client Relations"
];

export const Skills = () => {
  return (
    <section className="py-16">
      <div className="space-y-8">
        <h2 className="text-2xl font-bold font-mono text-primary">Skills</h2>
        <div className="flex flex-wrap gap-3">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="px-4 py-2 bg-muted rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-default animate-fade-in font-mono text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};