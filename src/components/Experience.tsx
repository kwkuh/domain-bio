interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  description: string;
}

const experiences: ExperienceItem[] = [
  {
    company: "Qwords",
    role: "Corporate Sales / Domain Name Specialist",
    period: "March 2024 - Present",
    description: "Currently working as a Corporate Sales and Domain Name Specialist, helping businesses establish and optimize their online presence through strategic domain management."
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
    <section className="py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-8">Work Experience</h2>
        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-4 animate-fade-in">
              <div className="md:w-1/3">
                <h3 className="text-lg font-bold text-primary">{exp.company}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{exp.period}</p>
              </div>
              <div className="md:w-2/3">
                <h4 className="text-base font-semibold">{exp.role}</h4>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-2 leading-relaxed">{exp.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};