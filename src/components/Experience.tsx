interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  description: string;
}

const experiences: ExperienceItem[] = [
  {
    company: "Domain Strategy Consultant",
    role: "Independent Consultant",
    period: "2022 - Present",
    description: "Providing strategic domain name acquisition and management services for businesses."
  },
  {
    company: "Digital Marketing Agency",
    role: "Senior Digital Marketing Specialist",
    period: "2020 - 2022",
    description: "Led digital marketing campaigns and brand development initiatives for multiple clients."
  },
  {
    company: "Tech Startup",
    role: "Marketing Manager",
    period: "2018 - 2020",
    description: "Managed brand identity and digital presence for a growing tech startup."
  }
];

export const Experience = () => {
  return (
    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-12">Work Experience</h2>
        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-6 animate-fade-in">
              <div className="md:w-1/3">
                <h3 className="text-xl font-bold text-primary">{exp.company}</h3>
                <p className="text-gray-500 mt-1">{exp.period}</p>
              </div>
              <div className="md:w-2/3">
                <h4 className="text-lg font-semibold">{exp.role}</h4>
                <p className="text-gray-600 mt-2 leading-relaxed">{exp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};