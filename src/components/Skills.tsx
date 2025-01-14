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
    <section className="py-20 px-6 bg-muted">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Skills</h2>
        <div className="flex flex-wrap gap-3">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="px-4 py-2 bg-white rounded-full text-secondary shadow-sm hover:shadow-md transition-shadow animate-fade-in"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};