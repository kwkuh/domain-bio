import { Button } from "@/components/ui/button";
import { Link, Terminal, Maximize2, Minus, X } from 'lucide-react';
import { useState } from "react";

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
    description: "Membantu brand untuk tumbuh dan dikenal di dunia digital adalah misi utama. Fokus saya membantu bisnis menemukan nama domain yang tepat sesuai identitas digital mereka, serta mengembangkan strategi domain yang memperkuat eksistensi brand secara online. Selalu mengikuti tren terbaru dan mencari peluang baru untuk memastikan kesuksesan klien adalah prioritas utama!"
  }
];

const currentProjects = [
  { name: "Terbaiq.com", status: "Development", type: "Brand Domain" },
  { name: "Esrevatem.com", status: "Planning", type: "Creative Domain" },
  { name: "DomainExpi.red", status: "Development", type: "Tool Domain" },
  { name: "Indomainer.com", status: "Active", type: "Community Domain" },
  { name: "Aidentity.id", status: "Planning", type: "AI Domain" }
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

        <div className="mt-12">
          <div className="os-window bg-black/20 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="flex items-center justify-between p-3 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-mono text-purple-400">projects.sh</span>
              </div>
              <div className="flex items-center space-x-4">
                <Minus className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                <Maximize2 className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                <X className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
              </div>
            </div>

            <div className="p-6">
              <h2 className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 mb-6">
                Project Yang Lagi Dikerjain 🚀
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {currentProjects.map((project, index) => (
                  <div key={index} className="group relative">
                    <div className="p-4 rounded-lg glass-effect hover:scale-105 transition-all duration-300 cursor-pointer border border-purple-500/20 group-hover:border-purple-500/40">
                      <h4 className="text-purple-400 font-mono font-bold mb-2">
                        {project.name}
                      </h4>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="text-xs text-purple-300/70">{project.type}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                          project.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                          project.status === 'Development' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};