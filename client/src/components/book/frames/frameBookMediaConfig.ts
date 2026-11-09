/** Final /eco-journey media defaults. This route never selects a legacy intro. */
export const ORIGINAL_BOOK_MEDIA = Object.freeze({
  baseUrl:
    "https://hjqyhybgitdizfhwpdcv.supabase.co/storage/v1/object/public/seven-emirates-game/",
  version: "7e-1bc718ef5e77",
});
export function frameBookMediaConfig(env: {
  VITE_BOOK_ASSET_BASE_URL?: string;
  VITE_BOOK_MEDIA_VERSION?: string;
}) {
  const baseUrl =
    env.VITE_BOOK_ASSET_BASE_URL?.trim() || ORIGINAL_BOOK_MEDIA.baseUrl;
  const version =
    env.VITE_BOOK_MEDIA_VERSION?.trim() || ORIGINAL_BOOK_MEDIA.version;
  // Earlier configurations supplied an already-versioned public base.
  return {
    baseUrl,
    version: baseUrl.replace(/\/+$/, "").endsWith("/" + version)
      ? undefined
      : version,
  };
}
