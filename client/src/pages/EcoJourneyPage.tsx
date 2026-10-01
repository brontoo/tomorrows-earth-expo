import EcoJourney from "../components/game/EcoJourney";

export default function EcoJourneyPage() {
  // هذه الصفحة تعزل بيئة اللعبة تماماً عن باقي مكونات الموقع
  return (
    <div className="w-full h-screen overflow-hidden bg-black">
      <EcoJourney />
    </div>
  );
}