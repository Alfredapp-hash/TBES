import { useState, type ChangeEvent, type MouseEvent } from "react";
import {
  listings,
  type Application,
  type Condition,
  type Listing,
  type MachineType,
} from "../data/inventory";

type MachineFilter = "All" | MachineType;
type ConditionFilter = "All" | Condition;
type ApplicationFilter = "All" | Application;
type OutputFilter = "All" | "Under 50 MW" | "50–200 MW" | "Over 200 MW";

const MACHINE_OPTIONS: readonly MachineFilter[] = [
  "All",
  "Gas turbine",
  "Generator",
];
const CONDITION_OPTIONS: readonly ConditionFilter[] = [
  "All",
  "As found",
  "Inspected",
];
const APPLICATION_OPTIONS: readonly ApplicationFilter[] = [
  "All",
  "Data center",
  "Industrial",
  "Utility",
  "Mission-critical",
];
const OUTPUT_OPTIONS: readonly OutputFilter[] = [
  "All",
  "Under 50 MW",
  "50–200 MW",
  "Over 200 MW",
];

const INTEREST = "I want to buy a turbine";

function matchesQuery(listing: Listing, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }

  const haystack = [
    listing.name,
    listing.id,
    listing.summary,
    listing.type,
    listing.condition,
    ...listing.applications,
    ...listing.checks,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

function matchesOutput(outputMw: number, band: OutputFilter): boolean {
  switch (band) {
    case "All":
      return true;
    case "Under 50 MW":
      return outputMw < 50;
    case "50–200 MW":
      return outputMw >= 50 && outputMw <= 200;
    case "Over 200 MW":
      return outputMw > 200;
  }
}

function listingMatches(
  listing: Listing,
  query: string,
  machine: MachineFilter,
  condition: ConditionFilter,
  application: ApplicationFilter,
  output: OutputFilter,
): boolean {
  if (machine !== "All" && listing.type !== machine) {
    return false;
  }
  if (condition !== "All" && listing.condition !== condition) {
    return false;
  }
  if (
    application !== "All" &&
    !listing.applications.includes(application)
  ) {
    return false;
  }
  if (!matchesOutput(listing.outputMw, output)) {
    return false;
  }
  return matchesQuery(listing, query);
}

function resultAnnouncement(count: number, filtered: boolean): string {
  if (count === 0) {
    return "No sample listings match";
  }
  if (!filtered) {
    return count === 1 ? "1 sample listing" : `${count} sample listings`;
  }
  if (count === 1) {
    return "1 sample listing matches";
  }
  return `${count} sample listings match`;
}

function contactHref(id: string): string {
  return `/contact?interest=${encodeURIComponent(INTEREST)}&listing=${id}`;
}

type ChipGroupProps<T extends string> = {
  legend: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
};

function ChipGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
}: ChipGroupProps<T>) {
  return (
    <fieldset className="equip-group">
      <legend>{legend}</legend>
      <div className="chip-row">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="chip"
            aria-pressed={value === option}
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              onChange(option);
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <li className="listing-card">
      <p className="listing-id">{listing.id}</p>
      <p className="listing-flag">Sample listing</p>
      <h3>{listing.name}</h3>
      <p className="spec-row">
        <span>{listing.outputLabel}</span>
        <span>{listing.condition}</span>
        <span>{listing.type}</span>
      </p>
      <p className="spec-row">
        {listing.applications.map((application) => (
          <span key={application}>{application}</span>
        ))}
      </p>
      <p>{listing.summary}</p>
      <ul className="check-list">
        {listing.checks.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ul>
      <a href={contactHref(listing.id)}>Ask about this configuration</a>
    </li>
  );
}

export default function EquipmentBrowser() {
  const [query, setQuery] = useState("");
  const [machine, setMachine] = useState<MachineFilter>("All");
  const [condition, setCondition] = useState<ConditionFilter>("All");
  const [application, setApplication] = useState<ApplicationFilter>("All");
  const [output, setOutput] = useState<OutputFilter>("All");

  const filtersActive =
    query.trim().length > 0 ||
    machine !== "All" ||
    condition !== "All" ||
    application !== "All" ||
    output !== "All";

  const visible = listings.filter((listing) =>
    listingMatches(listing, query, machine, condition, application, output),
  );

  function onSearchChange(event: ChangeEvent<HTMLInputElement>): void {
    setQuery(event.currentTarget.value);
  }

  function onClear(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setQuery("");
    setMachine("All");
    setCondition("All");
    setApplication("All");
    setOutput("All");
  }

  function onMachine(value: MachineFilter): void {
    setMachine(value);
  }

  function onCondition(value: ConditionFilter): void {
    setCondition(value);
  }

  function onApplication(value: ApplicationFilter): void {
    setApplication(value);
  }

  function onOutput(value: OutputFilter): void {
    setOutput(value);
  }

  return (
    <section className="equip" aria-label="Sample equipment listings">
      <div className="equip-bar">
        <label className="equip-search" htmlFor="listing-search">
          <span>Search sample listings</span>
          <input
            id="listing-search"
            type="search"
            value={query}
            onChange={onSearchChange}
            autoComplete="off"
          />
        </label>
        {filtersActive ? (
          <button type="button" className="text-button" onClick={onClear}>
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="equip-groups">
        <ChipGroup
          legend="Type"
          value={machine}
          options={MACHINE_OPTIONS}
          onChange={onMachine}
        />
        <ChipGroup
          legend="Condition"
          value={condition}
          options={CONDITION_OPTIONS}
          onChange={onCondition}
        />
        <ChipGroup
          legend="Application"
          value={application}
          options={APPLICATION_OPTIONS}
          onChange={onApplication}
        />
        <ChipGroup
          legend="Output"
          value={output}
          options={OUTPUT_OPTIONS}
          onChange={onOutput}
        />
      </div>

      <p
        className="result-line"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {resultAnnouncement(visible.length, filtersActive)}
      </p>

      {visible.length === 0 ? (
        <div className="equip-empty">
          <p>No sample listings match those filters.</p>
          <button type="button" className="text-button" onClick={onClear}>
            Clear filters
          </button>
          <a href="/contact">Contact TurbineBridge</a>
        </div>
      ) : (
        <ul className="equip-grid">
          {visible.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ul>
      )}
    </section>
  );
}
