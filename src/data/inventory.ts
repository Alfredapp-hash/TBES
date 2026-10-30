/** Sample configurations for the catalog. Not machines held for sale. */

export type Application =
  | "Data center"
  | "Industrial"
  | "Utility"
  | "Mission-critical";

export type MachineType = "Gas turbine" | "Generator";

export type Condition = "As found" | "Inspected";

export type Listing = {
  id: string;
  name: string;
  type: MachineType;
  condition: Condition;
  outputMw: number;
  outputLabel: string;
  applications: Application[];
  summary: string;
  checks: string[];
};

export const listings: Listing[] = [
  {
    id: "TB-S01",
    name: "Aeroderivative gas turbine",
    type: "Gas turbine",
    condition: "As found",
    outputMw: 40,
    outputLabel: "40 MW class",
    applications: ["Data center", "Mission-critical"],
    summary:
      "A fast-start aeroderivative package in the 40 MW class for firm power when a grid upgrade is years away.",
    checks: [
      "Fast-start duty",
      "40 MW class output",
      "Used unit, condition as found",
    ],
  },
  {
    id: "TB-S02",
    name: "Industrial gas turbine",
    type: "Gas turbine",
    condition: "As found",
    outputMw: 15,
    outputLabel: "15 MW class",
    applications: ["Industrial", "Mission-critical"],
    summary:
      "An industrial gas turbine in the 15 MW class for on-site generation when a plant cannot wait on the interconnect.",
    checks: [
      "15 MW class output",
      "On-site plant load",
      "For a site waiting on an interconnect",
    ],
  },
  {
    id: "TB-S03",
    name: "F-class gas turbine",
    type: "Gas turbine",
    condition: "Inspected",
    outputMw: 230,
    outputLabel: "230 MW class",
    applications: ["Utility"],
    summary:
      "An F-class gas turbine in the 230 MW class for utility or large-load duty, with condition taken from an inspection.",
    checks: [
      "230 MW class output",
      "Hours and starts from inspection",
      "Inspected and described, not brought back to new",
    ],
  },
  {
    id: "TB-S04",
    name: "E-class gas turbine",
    type: "Gas turbine",
    condition: "Inspected",
    outputMw: 100,
    outputLabel: "100 MW class",
    applications: ["Utility", "Industrial"],
    summary:
      "An E-class gas turbine in the 100 MW class for utility or industrial duty, with condition taken from an inspection.",
    checks: [
      "100 MW class output",
      "Inspection notes for the turbine section",
      "Remaining life taken from the record",
    ],
  },
  {
    id: "TB-S05",
    name: "Continuous-duty gas generator",
    type: "Generator",
    condition: "As found",
    outputMw: 8,
    outputLabel: "8 MW class",
    applications: ["Data center"],
    summary:
      "A continuous-duty gas generator in the 8 MW class for steady power at a data center.",
    checks: [
      "8 MW class output",
      "Continuous-duty rating",
      "Used package, condition as found",
    ],
  },
  {
    id: "TB-S06",
    name: "Gas generator package",
    type: "Generator",
    condition: "Inspected",
    outputMw: 20,
    outputLabel: "20 MW class",
    applications: ["Data center", "Industrial"],
    summary:
      "A gas generator package in the 20 MW class for data center or industrial load, with condition taken from an inspection.",
    checks: [
      "20 MW class output",
      "Engine and generator inspected separately",
      "Operating hours included",
    ],
  },
  {
    id: "TB-S07",
    name: "High-output generator package",
    type: "Generator",
    condition: "As found",
    outputMw: 50,
    outputLabel: "50 MW class",
    applications: ["Mission-critical", "Data center"],
    summary:
      "A high-output generator package in the 50 MW class for mission-critical and data center power.",
    checks: [
      "50 MW class output",
      "Used package, condition as found",
      "For mission-critical and data center load",
    ],
  },
  {
    id: "TB-S08",
    name: "Utility generator",
    type: "Generator",
    condition: "Inspected",
    outputMw: 120,
    outputLabel: "120 MW class",
    applications: ["Utility"],
    summary:
      "A utility generator in the 120 MW class, with condition taken from an inspection.",
    checks: [
      "120 MW class output",
      "Stator and rotor notes from inspection",
      "Prior service included in the description",
    ],
  },
];
