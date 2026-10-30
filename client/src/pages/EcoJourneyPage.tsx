import EcoJourney from "../components/game/EcoJourney";

export default function EcoJourneyPage() {
  // هذه الصفحة تعزل بيئة اللعبة تماماً عن باقي مكونات الموقع
  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#f4f0e5]">
      <EcoJourney />
    </div>
  );
}
