export const company = {
  name: "TurbineBridge Energy Solutions LLC",
  short: "TurbineBridge",
  tagline: "Bridging power to possibilities",
  descriptor: "We find used turbines of all kinds, then connect you with the specialists who bring them back online.",
};

export const nav = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/solutions", label: "Solutions" },
  { href: "/equipment", label: "Equipment" },
  { href: "/markets", label: "Markets" },
  { href: "/partners", label: "Partner" },
  { href: "/contact", label: "Contact" },
] as const;

export const mailing = {
  line1: "525 Randall Ave Ste 100",
  line2: "PMB 1477",
  line3: "Cheyenne, WY 82001",
};

export const leaders = [
  {
    name: "Tracy Springford",
    role: "CEO",
    phone: "",
    tel: "",
  },
  {
    name: "Brian Salsbury",
    role: "CCO",
    detail: "Chief Commercial Officer",
    phone: "(951) 228-8940",
    tel: "+19512288940",
  },
  {
    name: "Craig Springfrod",
    role: "Director of Business Development",
    phone: "(618) 979-8034",
    tel: "+16189798034",
  },
] as const;

export const interests = [
  "I need a turbine",
  "I have a used unit",
  "I repair turbines or control units",
  "Technical verification",
  "Transaction support",
  "Partnership",
  "Client portal access",
  "Something else",
] as const;
