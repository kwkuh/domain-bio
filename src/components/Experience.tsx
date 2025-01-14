import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";

interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  description: string;
}

const experiences: ExperienceItem[] = [
  {
    company: "Qwords",
    role: "Staff Karyawan - Corporate Sales / Domain Name Specialist",
    period: "March 2024 - Present",
    description: "Sekarang, saya kerja di Qwords sebagai Corporate Sales dan Domain Name Specialist. Tugas saya bantu bisnis cari nama domain yang pas, pilih hosting server yang tepat, dan bantu bikin website mereka supaya bisa tampil maksimal di dunia digital. Saya pastikan semuanya berjalan dengan lancar supaya bisnis mereka sukses online, dengan cara yang mudah dan efektif."
  }
];

const currentProjects = [
  "Indonesias.com",
  "Terbaiq.com",
  "Esrevatem.com",
  "Red.co.id",
  "DomainExpi.red",
  "Indomainer.com",
  "Aidentity.id",
  "Social.co.id"
];

export const Experience = () => {
  return (
    <section className="py-12">
      <div className="space-y-8">
        <h2 className="text-2xl font-bold font-mono text-primary">
          Perjalanan Karir 🌱
        </h2>
        
        <div className="space-y-12">
          {experiences.map((exp, index) => (
            <div key={index} className="group flex flex-col md:flex-row gap-4 animate-fade-in hover:bg-muted/50 p-4 rounded-lg transition-colors">
              <div className="md:w-1/3">
                <h3 className="text-lg font-bold text-primary font-mono">{exp.company}</h3>
                <p className="text-muted-foreground text-sm mt-1">{exp.period}</p>
              </div>
              <div className="md:w-2/3">
                <h4 className="text-base font-semibold">{exp.role}</h4>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  {exp.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-6">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => window.open('https://www.linkedin.com/in/kukuh-laksana/', '_blank')}
          >
            <Link className="w-4 h-4" />
            Yuk, Kenalan di LinkedIn! 🤝
          </Button>
        </div>

        <div className="mt-12 bg-gradient-to-br from-purple-400/10 via-pink-500/10 to-purple-600/10 p-6 rounded-xl border border-purple-500/20">
          <h2 className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 mb-6">
            Project Yang Lagi Dikerjain 🚀
          </h2>
          <h3 className="text-lg font-semibold mb-2 text-purple-400">
            Suka Membangun:
          </h3>
          <p className="text-sm text-muted-foreground mb-4 italic">
            Pernah manage lebih dari 3000 domain portofolio pribadi
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentProjects.map((project, index) => (
              <div 
                key={index} 
                className="p-4 rounded-lg bg-purple-500/5 hover:bg-purple-500/10 transition-all hover:scale-105 cursor-pointer border border-purple-500/20"
              >
                <h4 className="text-purple-400 font-mono font-bold">
                  {project}
                </h4>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};