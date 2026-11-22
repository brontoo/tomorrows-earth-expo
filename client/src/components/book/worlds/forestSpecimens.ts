export const forestSpecimens = {
  perch: {
    file: "wildlife/archive-fish.glb",
    name: "Climbing perch",
    detail:
      "The source texture identifies this model as Anabas testudineus, a freshwater fish. Compare its deep body with the flathead mullet seen in the creek.",
  },
  scarlet: {
    file: "wildlife/scarlet-plant.glb",
    name: "Scarlet alien plant",
    detail:
      "A fictional botanical sculpture. Its angular leaves show how artists interpret plant forms.",
    credit: {
      author: "Varvara",
      source:
        "https://sketchfab.com/3d-models/scarlet-alien-plant-9b1d368a8e144a88ab275b5ac7a306c3",
      license: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
} as const;

export type ForestSpecimen = keyof typeof forestSpecimens;
export const forestSpecimenIds = Object.keys(
  forestSpecimens
) as ForestSpecimen[];
