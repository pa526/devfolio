/** Shared shape for the /resume builder (Jake's-resume style). */

export interface BuilderEducation {
  school: string;
  degree: string;
  field: string;
  location: string;
  start: string;
  end: string;
  grade: string;
}

export interface BuilderExperience {
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface BuilderProject {
  name: string;
  tech: string;
  link: string;
  bullets: string[];
}

export interface BuilderAchievement {
  title: string;
  detail: string;
}

export interface BuilderCustomSection {
  title: string;
  bullets: string[];
}

export interface BuilderResume {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  github: string;
  linkedin: string;
  leetcode: string;
  website: string;
  otherLinkLabel: string;
  otherLinkUrl: string;
  targetRole: string;
  summary: string;
  education: BuilderEducation[];
  experience: BuilderExperience[];
  projects: BuilderProject[];
  achievements: BuilderAchievement[];
  skillGroups: { label: string; value: string }[];
  customSections: BuilderCustomSection[];
}

export const emptyResume = (name = ""): BuilderResume => ({
  fullName: name,
  email: "",
  phone: "",
  location: "",
  github: "",
  linkedin: "",
  leetcode: "",
  website: "",
  otherLinkLabel: "",
  otherLinkUrl: "",
  targetRole: "",
  summary: "",
  education: [],
  experience: [],
  projects: [],
  achievements: [],
  skillGroups: [
    { label: "Languages", value: "" },
    { label: "Frameworks & Libraries", value: "" },
    { label: "Tools & Platforms", value: "" },
  ],
  customSections: [],
});
