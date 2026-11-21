import type {
  ForestAction,
  ForestDiscovery,
  ForestView,
} from "@shared/hiddenForest";

export const forestReferences = {
  abuDhabi: {
    title: "Environment Agency – Abu Dhabi",
    url: "https://www.ead.gov.ae/en/",
  },
  nursery: {
    title: "Nagelkerken et al., mangrove habitat review",
    url: "https://doi.org/10.1016/j.aquabot.2007.12.007",
  },
  water: {
    title: "NOAA, tides and water levels",
    url: "https://oceanservice.noaa.gov/education/tutorial_tides/",
  },
  roots: {
    title: "Smithsonian Ocean, Mangroves",
    url: "https://ocean.si.edu/ocean-life/plants-algae/mangroves",
  },
  salt: {
    title: "Reef and Lovelock, water balance in mangroves",
    url: "https://doi.org/10.1093/aob/mcu174",
  },
  carbon: {
    title: "Donato et al., carbon storage in mangroves",
    url: "https://doi.org/10.1038/ngeo1123",
  },
  fish: {
    title: "FishBase, Arabian killifish",
    url: "https://www.fishbase.se/summary/Aphanius-dispar.html",
  },
  bird: {
    title: "Cornell Lab, Western Reef-Heron",
    url: "https://ebird.org/species/werher1",
  },
  crab: {
    title: "WoRMS, marine species registry",
    url: "https://www.marinespecies.org/",
  },
} as const;

type Reference = keyof typeof forestReferences;
type Entry = {
  title: string;
  description: string;
  source: Reference;
  specimen: string;
};
export const forestDiscoveries: Record<ForestDiscovery, Entry> = {
  "grey-mangrove": {
    title: "Grey Mangrove",
    specimen: "leaf",
    source: "abuDhabi",
    description:
      "Grey mangrove (Avicennia marina) tolerates salt and periodic flooding. Its shelter and leaf litter connect life above and below the water.",
  },
  "coastal-bird": {
    title: "Coastal Bird",
    specimen: "feather",
    source: "bird",
    description:
      "A western reef heron (Egretta gularis) can stalk small prey in shallow coastal water. Its long legs and pointed bill suit this hunting method.",
  },
  "juvenile-fish": {
    title: "Juvenile Fish",
    specimen: "fish",
    source: "fish",
    description:
      "The Arabian killifish (Aphaniops dispar) tolerates a range of salinities. This illustrated fish follows a sheltered edge of the creek.",
  },
  "mangrove-crab": {
    title: "Mangrove Crab",
    specimen: "crab",
    source: "abuDhabi",
    description:
      "Fiddler crabs feed on particles in sediment and retreat into burrows. An enlarged claw is characteristic of male fiddler crabs.",
  },
  "hidden-nursery": {
    title: "Hidden Nursery",
    specimen: "habitat",
    source: "nursery",
    description:
      "Root structure can give small fish shelter and access to food. Nursery value varies by species, habitat connectivity and local conditions.",
  },
  "breathing-roots": {
    title: "Breathing Roots",
    specimen: "roots",
    source: "roots",
    description:
      "Pencil-like pneumatophores rise from shallow lateral roots. When exposed, pores and internal air spaces help oxygen reach submerged tissue.",
  },
  "salt-adaptation": {
    title: "Salt Adaptation",
    specimen: "droplet",
    source: "salt",
    description:
      "Mangroves regulate salt uptake at the roots. Grey mangrove leaves also have salt glands that secrete salts. The enlarged grains illustrate the process.",
  },
  "tidal-rhythm": {
    title: "Tidal Rhythm",
    specimen: "tide",
    source: "water",
    description:
      "Tides change the reach of coastal water. Watch the same roots exposed at low water and covered again as the tide rises.",
  },
  "intertidal-habitat": {
    title: "Intertidal Habitat",
    specimen: "crab",
    source: "water",
    description:
      "The intertidal zone changes between air exposure and flooding. Mudflat feeding opportunities and shallow water access shift with that boundary.",
  },
  "carbon-journey": {
    title: "Carbon Journey",
    specimen: "carbon",
    source: "carbon",
    description:
      "Photosynthesis transfers carbon dioxide into plant biomass. Some plant material enters sediment. Microbes, tidal transport and burial influence its fate.",
  },
  "blue-carbon-vault": {
    title: "Blue Carbon Vault",
    specimen: "sediment",
    source: "carbon",
    description:
      "Waterlogged coastal sediment can preserve organic carbon. Disturbance may expose buried material to oxygen, which can increase decomposition and carbon loss.",
  },
  "ecosystem-connections": {
    title: "Ecosystem Connections",
    specimen: "habitat",
    source: "nursery",
    description:
      "Tides connect the creek to the wider coast. The mangroves change shelter and food availability while birds, crabs and fish use different parts of the system.",
  },
};

type Interaction = {
  action: ForestAction;
  label: string;
  detail: string;
  source: Reference;
};
export const forestAreas: Record<
  ForestView,
  { label: string; interactions: Interaction[] }
> = {
  canopy: {
    label: "Forest Canopy",
    interactions: [
      {
        action: "inspect-tree",
        label: "Inspect the grey mangrove",
        detail: "The canopy above the tidal bank belongs to Avicennia marina.",
        source: "abuDhabi",
      },
      {
        action: "inspect-leaf",
        label: "Magnify a leaf",
        detail:
          "Notice the simple oval leaf and its central vein. The magnifier shows visible anatomy.",
        source: "salt",
      },
      {
        action: "reveal-salt",
        label: "Reveal salt secretion",
        detail:
          "Pale grains indicate secretion at the leaf surface in this conceptual overlay.",
        source: "salt",
      },
      {
        action: "watch-heron",
        label: "Watch the reef heron",
        detail:
          "Long legs allow the heron to hunt in the shallows without immersing most of its body.",
        source: "bird",
      },
      {
        action: "inspect-crab",
        label: "Inspect the fiddler crab",
        detail:
          "Look for its raised claw and the narrow burrow entrance along the mudflat.",
        source: "crab",
      },
    ],
  },
  underwater: {
    label: "Beneath the Surface",
    interactions: [
      {
        action: "follow-fish",
        label: "Follow the juvenile fish",
        detail: "Watch the small fish move along the creek near shelter.",
        source: "fish",
      },
      {
        action: "compare-shelter",
        label: "Compare open water and roots",
        detail:
          "The comparison moves from open creek to root shelter. Root gaps can limit access for larger predators.",
        source: "nursery",
      },
    ],
  },
  roots: {
    label: "Root Labyrinth",
    interactions: [
      {
        action: "inspect-pneumatophores",
        label: "Inspect breathing roots",
        detail:
          "These exposed tips connect to lateral roots beneath the mud. Gas exchange is possible when the pores are exposed.",
        source: "roots",
      },
      {
        action: "reveal-lateral-roots",
        label: "Reveal underground roots",
        detail:
          "The schematic shows the upright pneumatophores joining horizontal roots below the sediment.",
        source: "roots",
      },
    ],
  },
  tides: {
    label: "Tidal World",
    interactions: [
      {
        action: "compare-mudflat",
        label: "Inspect the tidal bank",
        detail:
          "Compare the same bank at both ends of the slider. The model shows relative water levels for an illustrative tidal cycle.",
        source: "water",
      },
      {
        action: "connect-habitats",
        label: "Trace the creek to the coast",
        detail:
          "Follow the channel out of the forest. Tidal connections let water, organic material and animals move between habitats.",
        source: "nursery",
      },
    ],
  },
  carbon: {
    label: "Carbon Vault",
    interactions: [
      {
        action: "trace-uptake",
        label: "Trace plant uptake",
        detail:
          "Photosynthesis incorporates atmospheric carbon into leaves, stems and roots.",
        source: "carbon",
      },
      {
        action: "trace-litter",
        label: "Follow fallen litter",
        detail: "Leaf fragments can decompose, wash away, or enter sediment.",
        source: "carbon",
      },
      {
        action: "trace-burial",
        label: "Follow burial",
        detail:
          "Some organic material persists below the surface in oxygen-poor sediment.",
        source: "carbon",
      },
      {
        action: "inspect-sediment",
        label: "Inspect sediment layers",
        detail:
          "The cutaway displays illustrative mineral sediment, root traces and buried organic matter.",
        source: "carbon",
      },
      {
        action: "compare-disturbance",
        label: "Compare sediment disturbance",
        detail:
          "Disturbance can expose buried material to oxygen. The animation shows a potential pathway without estimating a release.",
        source: "carbon",
      },
    ],
  },
};

export const forestInteractions = Object.fromEntries(
  Object.values(forestAreas)
    .flatMap(a => a.interactions)
    .map(i => [i.action, i])
) as Partial<Record<ForestAction, Interaction>>;
