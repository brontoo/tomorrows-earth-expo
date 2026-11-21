-- Additive migration. Apply only to an approved database after review.
BEGIN;
CREATE TABLE IF NOT EXISTS public.hidden_forest_evidence (
  student_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action varchar(48) NOT NULL CHECK (action IN ('visit-canopy', 'visit-underwater', 'visit-roots', 'visit-tides', 'visit-carbon', 'inspect-tree', 'watch-heron', 'follow-fish', 'inspect-crab', 'compare-shelter', 'inspect-pneumatophores', 'reveal-lateral-roots', 'inspect-leaf', 'reveal-salt', 'observe-low-tide', 'observe-high-tide', 'compare-mudflat', 'trace-uptake', 'trace-litter', 'trace-burial', 'inspect-sediment', 'compare-disturbance', 'connect-habitats')),
  observed_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS hidden_forest_evidence_student_action_idx
  ON public.hidden_forest_evidence (student_id, action);
ALTER TABLE public.hidden_forest_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hidden_forest_evidence FROM PUBLIC, anon, authenticated;
COMMIT;
