import { trpc } from "@/lib/trpc";
import { Droplets, Leaf, Recycle, Zap, CheckCircle2 } from "lucide-react";
import {
  GameShell,
  FieldHeading,
  FieldNotice,
} from "@/components/field/GameShell";
const ICONS = [Droplets, Zap, Recycle, Leaf];
const LABELS: Record<string, string> = {
  water_liters: "Water conserved",
  electricity_kwh: "Energy reduced",
  waste_kg: "Waste diverted",
  recycling_kg: "Recycling recorded",
  plastic_items: "Plastic items avoided",
  plants_added: "Plants added",
  trees_added: "Trees added",
  food_waste_kg: "Food waste reduced",
  transport_km: "Lower-impact travel",
  custom: "Community impact",
};
export default function Impact() {
  const query = trpc.impact.getSchoolSummary.useQuery();
  return (
    <GameShell>
      <FieldHeading
        eyebrow="VERIFIED SCHOOL IMPACT"
        title="Small actions, shared change."
        description="A record of what our community has measured and verified. Each number keeps its own unit and review status."
      >
        <Leaf className="field-heading-icon" size={62} strokeWidth={0.8} />
      </FieldHeading>
      <div className="field-info-strip">
        <CheckCircle2 size={18} />
        <span>
          These are reviewed school measurements. Your personal points and
          stamps live in your passport.
        </span>
      </div>
      {query.isLoading && (
        <FieldNotice>Gathering verified measurements…</FieldNotice>
      )}
      {query.isError && (
        <FieldNotice error onRetry={() => void query.refetch()}>
          Impact data could not be loaded.
        </FieldNotice>
      )}
      {!query.isLoading && !query.isError && query.data?.length === 0 && (
        <div className="field-empty">
          <Leaf size={30} />
          <h2>Every change starts somewhere.</h2>
          <p>Verified measurements will appear here as teachers review them.</p>
        </div>
      )}
      <div className="field-impact-grid">
        {query.data?.map((item, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
            <article
              className="field-impact-card"
              key={`${item.metricType}-${item.unit}`}
            >
              <Icon size={27} strokeWidth={1.2} />
              <span className="field-kicker">VERIFIED MEASUREMENT</span>
              <h2>
                {item.metricLabel || LABELS[item.metricType] || item.metricType}
              </h2>
              <strong>
                {item.total ?? 0}
                <small>{item.unit}</small>
              </strong>
              <span className="field-muted">Reviewed school impact</span>
            </article>
          );
        })}
      </div>
    </GameShell>
  );
}
