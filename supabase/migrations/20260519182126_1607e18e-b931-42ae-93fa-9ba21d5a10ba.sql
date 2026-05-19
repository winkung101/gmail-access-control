DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.score_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_name TEXT NOT NULL,
  student_class TEXT,
  license_plate TEXT NOT NULL,
  score_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.score_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view score records" ON public.score_records;
CREATE POLICY "Admins can view score records"
ON public.score_records FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can insert score records" ON public.score_records;
CREATE POLICY "Admins can insert score records"
ON public.score_records FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Admins can delete score records" ON public.score_records;
CREATE POLICY "Admins can delete score records"
ON public.score_records FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX IF NOT EXISTS idx_score_records_license_plate ON public.score_records(license_plate);