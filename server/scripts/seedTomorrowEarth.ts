import "dotenv/config";
import postgres, { type Sql } from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const sql = postgres(databaseUrl, { ssl: "require", max: 1 });

const zones = [
  { slug: "water", name: "Water", description: "Understand water systems and take practical steps to protect every drop.", icon: "💧", theme: "water" },
  { slug: "energy", name: "Energy", description: "Explore how energy choices shape schools, homes, and communities.", icon: "☀️", theme: "energy" },
  { slug: "circular-economy-waste", name: "Circular Economy & Waste", description: "Rethink materials, reduce waste, and keep useful resources in circulation.", icon: "♻️", theme: "circular" },
  { slug: "biodiversity-nature", name: "Biodiversity & Nature", description: "Discover the living systems that make healthy communities possible.", icon: "🌳", theme: "nature" },
  { slug: "climate", name: "Climate", description: "Investigate climate patterns, choices, and solutions grounded in evidence.", icon: "🌡️", theme: "climate" },
  { slug: "sustainable-cities", name: "Sustainable Cities", description: "Imagine places where people, infrastructure, and nature can thrive together.", icon: "🏙️", theme: "cities" },
  { slug: "sustainable-living", name: "Sustainable Living", description: "Turn everyday decisions into thoughtful, measurable sustainability actions.", icon: "🍃", theme: "living" },
  { slug: "innovation", name: "Innovation", description: "Create and test ideas that respond to real sustainability challenges.", icon: "💡", theme: "innovation" },
] as const;

const missions = [
  { zone: "water", slug: "water-detective", title: "Water Detective", type: "investigate" as const, description: "Find one way water is used in your learning environment and identify an opportunity to conserve it.", instructions: "Observe taps, toilets, drinking stations, or irrigation. Record what you notice, estimate where water may be wasted, and suggest one practical improvement.", minutes: 20, points: 25, evidence: true },
  { zone: "energy", slug: "energy-smart-check", title: "Energy Smart Check", type: "investigate" as const, description: "Investigate the biggest everyday energy choices in one classroom or shared space.", instructions: "Check lighting, cooling, screens, and occupancy. Record two observations and recommend one change that could reduce unnecessary energy use.", minutes: 25, points: 25, evidence: true },
  { zone: "circular-economy-waste", slug: "waste-sort-study", title: "Waste Sort Study", type: "act" as const, description: "Learn what your local waste system accepts and improve one disposal decision.", instructions: "Choose five common items and classify them as recyclable, organic, general, or special waste. Explain one classification that surprised you.", minutes: 20, points: 20, evidence: true },
  { zone: "biodiversity-nature", slug: "micro-habitat-observer", title: "Micro-habitat Observer", type: "learn" as const, description: "Observe a small natural space and document the life it supports.", instructions: "Spend ten quiet minutes observing a garden, tree, planter, or outdoor edge. Record three living things and one relationship between them.", minutes: 20, points: 20, evidence: true },
  { zone: "climate", slug: "climate-evidence-basics", title: "Climate Evidence Basics", type: "learn" as const, description: "Separate climate evidence from assumptions using a reliable source.", instructions: "Find one age-appropriate source about a local or regional climate trend. Write the claim, the evidence supporting it, and one question you still have.", minutes: 30, points: 25, evidence: true },
  { zone: "sustainable-cities", slug: "design-a-better-route", title: "Design a Better Route", type: "create" as const, description: "Redesign one short journey to make it safer, healthier, or lower impact.", instructions: "Map a route to school or around your campus. Add one improvement for walking, cycling, public transport, shade, or accessibility and explain the trade-off.", minutes: 30, points: 25, evidence: true },
  { zone: "sustainable-living", slug: "one-week-impact-choice", title: "One-Week Impact Choice", type: "act" as const, description: "Choose one realistic habit change and reflect on what makes it sustainable.", instructions: "Choose a habit related to food, transport, water, energy, or materials. Plan how you will practice it for one week and decide what evidence you will collect.", minutes: 15, points: 15, evidence: false },
  { zone: "innovation", slug: "idea-to-impact-sketch", title: "Idea to Impact Sketch", type: "create" as const, description: "Turn a sustainability problem into a clear, testable idea.", instructions: "Describe a problem, sketch or explain your proposed response, identify who it helps, and name one small test you could run.", minutes: 35, points: 30, evidence: true },
] as const;

const levels = [
  { slug: "seed", name: "Seed", minPoints: 0, icon: "🌱", description: "Your sustainability journey starts with one meaningful step." },
  { slug: "sprout", name: "Sprout", minPoints: 200, icon: "🌿", description: "You are building consistent sustainability habits." },
  { slug: "eco-builder", name: "Eco Builder", minPoints: 400, icon: "🌳", description: "You are turning learning into visible action." },
  { slug: "sustainability-innovator", name: "Sustainability Innovator", minPoints: 600, icon: "💡", description: "You connect evidence, creativity, and impact." },
  { slug: "earth-champion", name: "Earth Champion", minPoints: 800, icon: "🌍", description: "You are leading meaningful change in your community." },
] as const;

const badges = [
  { slug: "water-guardian", name: "Water Guardian", icon: "💧", description: "Complete 3 verified Water missions.", criteriaType: "mission_count" as const, criteriaConfig: { zoneSlug: "water", count: 3 }, pointsReward: 25 },
  { slug: "evidence-builder", name: "Evidence Builder", icon: "🔬", description: "Complete 3 evidence-based investigations.", criteriaType: "mission_count" as const, criteriaConfig: { missionType: "investigate", count: 3 }, pointsReward: 25 },
  { slug: "circular-thinker", name: "Circular Thinker", icon: "♻️", description: "Complete a Circular Economy & Waste mission.", criteriaType: "mission_count" as const, criteriaConfig: { zoneSlug: "circular-economy-waste", count: 1 }, pointsReward: 20 },
  { slug: "sdg-explorer", name: "SDG Explorer", icon: "🌍", description: "Explore activities across 8 SDGs.", criteriaType: "sdg_count" as const, criteriaConfig: { count: 8 }, pointsReward: 30 },
  { slug: "community-catalyst", name: "Community Catalyst", icon: "🤝", description: "Complete a verified community sustainability action.", criteriaType: "verified_actions" as const, criteriaConfig: { count: 1 }, pointsReward: 25 },
] as const;

async function seed() {
  try {
    await sql.begin(async (tx: Sql) => {
      const admins = await tx`select id from users where role = 'admin' order by id limit 1`;
      if (admins.length === 0) throw new Error("No admin user exists to own seeded missions");
      const adminId = admins[0].id as number;

      await tx`update academic_years set is_current = false where is_current = true`;
      const years = await tx`
        insert into academic_years
          (label, start_date, end_date, points_start_date, points_end_date, expo_start_date, expo_end_date, is_current)
        values
          ('2026/2027', '2026-09-01T00:00:00Z', '2027-08-31T23:59:59Z', '2026-09-01T00:00:00Z', '2027-08-31T23:59:59Z', '2027-05-20T00:00:00Z', '2027-05-21T23:59:59Z', true)
        on conflict (label) do update set
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          points_start_date = excluded.points_start_date,
          points_end_date = excluded.points_end_date,
          expo_start_date = excluded.expo_start_date,
          expo_end_date = excluded.expo_end_date,
          is_current = true,
          updated_at = now()
        returning id
      `;
      const academicYearId = years[0].id as number;
      const zoneIds = new Map<string, number>();

      for (let index = 0; index < levels.length; index += 1) {
        const level = levels[index];
        await tx`
          insert into sustainability_levels (name, slug, min_points, icon, description, sort_order, is_active)
          values (${level.name}, ${level.slug}, ${level.minPoints}, ${level.icon}, ${level.description}, ${index}, true)
          on conflict (slug) do update set
            name = excluded.name,
            min_points = excluded.min_points,
            icon = excluded.icon,
            description = excluded.description,
            sort_order = excluded.sort_order,
            is_active = true,
            updated_at = now()
        `;
      }

      for (const badge of badges) {
        await tx`
          insert into badges (name, slug, description, icon, criteria_type, criteria_config, points_reward, is_active)
          values (${badge.name}, ${badge.slug}, ${badge.description}, ${badge.icon}, ${badge.criteriaType}, ${JSON.stringify(badge.criteriaConfig)}, ${badge.pointsReward}, true)
          on conflict (slug) do update set
            name = excluded.name,
            description = excluded.description,
            icon = excluded.icon,
            criteria_type = excluded.criteria_type,
            criteria_config = excluded.criteria_config,
            points_reward = excluded.points_reward,
            is_active = true,
            updated_at = now()
        `;
      }

      for (let index = 0; index < zones.length; index += 1) {
        const zone = zones[index];
        const rows = await tx`
          insert into sustainability_zones (slug, name, description, icon, theme, sort_order, is_active)
          values (${zone.slug}, ${zone.name}, ${zone.description}, ${zone.icon}, ${zone.theme}, ${index}, true)
          on conflict (slug) do update set
            name = excluded.name,
            description = excluded.description,
            icon = excluded.icon,
            theme = excluded.theme,
            sort_order = excluded.sort_order,
            is_active = true,
            updated_at = now()
          returning id
        `;
        zoneIds.set(zone.slug, rows[0].id as number);
      }

      for (const mission of missions) {
        const zoneId = zoneIds.get(mission.zone);
        if (!zoneId) throw new Error(`Missing zone for mission ${mission.slug}`);
        await tx`
          insert into missions
            (academic_year_id, zone_id, title, slug, description, mission_type, difficulty, instructions, estimated_minutes, points_available, evidence_required, verification_method, repeat_policy, is_published, created_by)
          values
            (${academicYearId}, ${zoneId}, ${mission.title}, ${mission.slug}, ${mission.description}, ${mission.type}, 'easy', ${mission.instructions}, ${mission.minutes}, ${mission.points}, ${mission.evidence}, 'teacher_review', 'once', true, ${adminId})
          on conflict (slug) do update set
            academic_year_id = excluded.academic_year_id,
            zone_id = excluded.zone_id,
            title = excluded.title,
            description = excluded.description,
            mission_type = excluded.mission_type,
            instructions = excluded.instructions,
            estimated_minutes = excluded.estimated_minutes,
            points_available = excluded.points_available,
            evidence_required = excluded.evidence_required,
            is_published = true,
            updated_at = now()
        `;
      }

      console.log(JSON.stringify({ academicYearId, levelsSeeded: levels.length, badgesSeeded: badges.length, zonesSeeded: zones.length, missionsSeeded: missions.length }));
    });
  } finally {
    await sql.end();
  }
}

seed().catch((error) => {
  console.error(error instanceof Error ? error.message : "Seed failed");
  process.exitCode = 1;
});
