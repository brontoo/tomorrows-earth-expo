export const forestViews = [
  "canopy",
  "underwater",
  "roots",
  "tides",
  "carbon",
] as const;
export type ForestView = (typeof forestViews)[number];

export const forestActions = [
  "visit-canopy",
  "visit-underwater",
  "visit-roots",
  "visit-tides",
  "visit-carbon",
  "inspect-tree",
  "watch-heron",
  "follow-fish",
  "inspect-crab",
  "compare-shelter",
  "inspect-pneumatophores",
  "reveal-lateral-roots",
  "inspect-leaf",
  "reveal-salt",
  "observe-low-tide",
  "observe-high-tide",
  "compare-mudflat",
  "trace-uptake",
  "trace-litter",
  "trace-burial",
  "inspect-sediment",
  "compare-disturbance",
  "connect-habitats",
] as const;
export type ForestAction = (typeof forestActions)[number];

export const forestDiscoveryRules = {
  "grey-mangrove": ["inspect-tree"],
  "coastal-bird": ["watch-heron"],
  "juvenile-fish": ["follow-fish"],
  "mangrove-crab": ["inspect-crab"],
  "hidden-nursery": ["follow-fish", "compare-shelter"],
  "breathing-roots": ["inspect-pneumatophores", "reveal-lateral-roots"],
  "salt-adaptation": ["inspect-leaf", "reveal-salt"],
  "tidal-rhythm": ["observe-low-tide", "observe-high-tide"],
  "intertidal-habitat": [
    "observe-low-tide",
    "observe-high-tide",
    "compare-mudflat",
  ],
  "carbon-journey": ["trace-uptake", "trace-litter", "trace-burial"],
  "blue-carbon-vault": ["inspect-sediment", "compare-disturbance"],
  "ecosystem-connections": [
    "inspect-tree",
    "follow-fish",
    "observe-low-tide",
    "observe-high-tide",
    "connect-habitats",
  ],
} as const satisfies Record<string, readonly ForestAction[]>;

export type ForestDiscovery = keyof typeof forestDiscoveryRules;
export const forestDiscoveryIds = Object.keys(
  forestDiscoveryRules
) as ForestDiscovery[];

export function forestProgress(actions: readonly ForestAction[]) {
  const evidence = new Set(actions);
  const discoveries = forestDiscoveryIds.filter(id =>
    forestDiscoveryRules[id].every(action => evidence.has(action))
  );
  return {
    actions: forestActions.filter(action => evidence.has(action)),
    discoveries,
    views: forestViews.filter(view => evidence.has(`visit-${view}`)),
    legacySeal: discoveries.length === forestDiscoveryIds.length,
  };
}

export type ForestProgress = ReturnType<typeof forestProgress>;
