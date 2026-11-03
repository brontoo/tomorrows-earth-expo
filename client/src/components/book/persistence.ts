const key = (profile: string) => `sevenEmiratesBook:v1:${profile}`;
export function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Navigation still works in memory. */
  }
}
export function readBook(profile: string) {
  try {
    const saved = JSON.parse(readStorage(key(profile)) ?? "null");
    if (saved && Number.isInteger(saved.chapter))
      return {
        chapter: Math.max(0, Math.min(6, saved.chapter)),
        seenStamps: Array.isArray(saved.seenStamps)
          ? (saved.seenStamps.filter(
              (v: unknown) => typeof v === "string"
            ) as string[])
          : [],
      };
    // Only migrate the previous location. Mission completion always comes from the server.
    const legacy = JSON.parse(
      readStorage(`uaeTrainJourney:v1:${profile}`) ?? "{}"
    );
    return {
      chapter: Number.isInteger(legacy.station)
        ? Math.max(0, Math.min(6, legacy.station))
        : 0,
      seenStamps: [] as string[],
    };
  } catch {
    return { chapter: 0, seenStamps: [] as string[] };
  }
}
export function saveBook(
  profile: string,
  chapter: number,
  seenStamps: string[]
) {
  writeStorage(key(profile), JSON.stringify({ chapter, seenStamps }));
  // Presentation-only keys. Leave every other key, including educational progress, intact.
  try {
    localStorage.removeItem(`uaeTrainJourney:v1:${profile}`);
    localStorage.removeItem("uaeTrainPreviewSeen:v1");
  } catch {
    /* optional storage */
  }
}
