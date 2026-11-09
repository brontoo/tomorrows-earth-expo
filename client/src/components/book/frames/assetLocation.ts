/** The base can already be versioned (backward compatible), or a version is appended explicitly. */
export function resolveAssetLocation(
  configuredBase: string,
  origin: string,
  version?: string
) {
  const base = new URL(
    configuredBase.endsWith("/") ? configuredBase : configuredBase + "/",
    origin
  );
  if (
    !/^https?:$/.test(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw new Error("Invalid public frame asset base URL");
  if (
    version &&
    (!/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(version) ||
      version === "." ||
      version === "..")
  )
    throw new Error("Invalid media version");
  const assetBase = version ? new URL(version + "/", base) : base;
  return {
    baseUrl: assetBase.href,
    manifestUrl: new URL("manifest.json", assetBase).href,
  };
}
