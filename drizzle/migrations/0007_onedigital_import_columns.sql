ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS legacy_member_number text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_legacy_member_number ON public.profiles (legacy_member_number) WHERE legacy_member_number IS NOT NULL;

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS legacy_booking_id text,
  ADD COLUMN IF NOT EXISTS legacy_family_members text;

-- Accounts imported from OneDigital that the devotee has not yet claimed by setting a password.
-- Server-only: no grants to anon/authenticated.
CREATE TABLE public.legacy_import_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_number text NOT NULL,
  source text NOT NULL DEFAULT 'onedigital',
  imported_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
GRANT ALL ON public.legacy_import_accounts TO service_role;
ALTER TABLE public.legacy_import_accounts ENABLE ROW LEVEL SECURITY;