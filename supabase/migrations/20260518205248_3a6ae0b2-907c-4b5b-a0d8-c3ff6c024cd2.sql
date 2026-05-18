
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public can view company logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Authenticated members of a company can upload/update/delete files under their company folder (company_id/...)
CREATE POLICY "Company admins upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND public.is_company_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Company admins update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND public.is_company_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Company admins delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'company-logos'
  AND public.is_company_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
