-- Allow anonymous users to insert demo requests from the landing page
CREATE POLICY "anon_insert_demo_requests"
ON public.demo_requests
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow authenticated users (super admins) to read all demo requests
CREATE POLICY "authenticated_select_demo_requests"
ON public.demo_requests
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users (super admins) to update demo requests (status changes)
CREATE POLICY "authenticated_update_demo_requests"
ON public.demo_requests
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
