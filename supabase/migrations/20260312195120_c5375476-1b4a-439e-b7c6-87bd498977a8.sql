CREATE POLICY "Members can update household member health"
ON public.household_members
FOR UPDATE
TO authenticated
USING (household_id = get_user_household_id(auth.uid()))
WITH CHECK (household_id = get_user_household_id(auth.uid()));