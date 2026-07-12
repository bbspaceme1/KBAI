-- Fix advisor RLS policy to scope access to assigned clients only
-- Create advisor_clients table for client assignments

CREATE TABLE advisor_clients (
  advisor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (advisor_id, client_id)
);

-- Enable RLS on advisor_clients
ALTER TABLE advisor_clients ENABLE ROW LEVEL SECURITY;

-- Policies for advisor_clients
CREATE POLICY "Advisors view own client assignments" ON advisor_clients FOR SELECT TO authenticated
  USING (advisor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage advisor assignments" ON advisor_clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update transactions policy to scoped access
DROP POLICY "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'advisor')
      AND EXISTS (
        SELECT 1 FROM advisor_clients
        WHERE advisor_id = auth.uid()
        AND client_id = transactions.user_id
      )
    )
  );

-- Update profiles policy for advisors (scoped access)
DROP POLICY "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'advisor')
      AND EXISTS (
        SELECT 1 FROM advisor_clients
        WHERE advisor_id = auth.uid()
        AND client_id = profiles.id
      )
    )
  );