export const company = {
  name: "TurbineBridge Energy Solutions LLC",
  short: "TurbineBridge",
  abbr: "TBES",
  tagline: "Bridging power to possibilities",
  descriptor: "TBES sits in the middle: buyers, sellers, and the contractors we recommend to bid the work.",
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

export const reach = [
  {
    interest: "I want to buy a turbine",
    eyebrow: "Buy",
    title: "Buy a turbine",
    text: "Tell us the class and the timing. We look for a used unit that can be brought back online. Some new systems are five years out.",
    cta: "Reach out to buy",
  },
  {
    interest: "I want to sell a turbine",
    eyebrow: "Sell",
    title: "Sell a turbine",
    text: "You hold a used unit. Condition can be rough, if it can still be brought back online. Tell us the machine and we take it to a buyer.",
    cta: "Reach out to sell",
  },
  {
    interest: "I want to join the contractor network",
    eyebrow: "Contractors",
    title: "Join the network",
    text: "You repair turbines, generators, or control units. We recommend companies from this network to bid the work our customers need.",
    cta: "Ask to join",
  },
] as const;

export const interests = [
  "I want to buy a turbine",
  "I want to sell a turbine",
  "I want to join the contractor network",
  "Technical verification",
  "Transaction support",
  "Client portal access",
  "Something else",
] as const;
