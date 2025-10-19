alter table "public"."logs" add column "resident_id" text;

CREATE INDEX logs_resident_id_idx ON public.logs USING btree (resident_id);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.whitelist
    WHERE email = user_email AND is_admin = true
  );
END;
$function$
;



