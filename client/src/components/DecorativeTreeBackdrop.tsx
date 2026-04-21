import { useMemo } from "react";
import treeSvgMarkup from "@/assets/illustrations/tree.svg?raw";

type DecorativeTreeBackdropProps = {
  startOffset: number;
};

function sanitizeTreeSvg(markup: string): string {
  return markup
    .replace(/<\?xml[^>]*>/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .trim();
}

export default function DecorativeTreeBackdrop({ startOffset }: DecorativeTreeBackdropProps) {
  const inlineTreeSvg = useMemo(() => sanitizeTreeSvg(treeSvgMarkup), []);

  return (
    <div
      aria-hidden="true"
      className="tree-wrapper"
      style={{ top: `${Math.max(0, startOffset)}px`, bottom: "0px" }}
    >
      <div className="tree-svg" dangerouslySetInnerHTML={{ __html: inlineTreeSvg }} />
    </div>
  );
}