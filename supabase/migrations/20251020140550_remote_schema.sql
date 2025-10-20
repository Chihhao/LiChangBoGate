drop policy "Allow admins to read all entries" on "public"."whitelist";

drop policy "Allow authenticated to read own entry" on "public"."whitelist";

drop policy "Allow admins to read all logs" on "public"."logs";

drop policy "Allow admins to delete" on "public"."whitelist";

drop policy "Allow admins to insert" on "public"."whitelist";

drop policy "Allow admins to update" on "public"."whitelist";

drop index if exists "public"."logs_resident_id_idx";

CREATE INDEX logs_user_id_idx ON public.logs USING btree (user_id);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_admin(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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

create policy "Allow authenticated users to read whitelist"
on "public"."whitelist"
as permissive
for select
to authenticated
using ((is_admin(( SELECT auth.email() AS email)) OR (email = ( SELECT auth.email() AS email))));


create policy "Allow admins to read all logs"
on "public"."logs"
as permissive
for select
to authenticated
using (is_admin(( SELECT auth.email() AS email)));


create policy "Allow admins to delete"
on "public"."whitelist"
as permissive
for delete
to authenticated
using (is_admin(( SELECT auth.email() AS email)));


create policy "Allow admins to insert"
on "public"."whitelist"
as permissive
for insert
to authenticated
with check (is_admin(( SELECT auth.email() AS email)));


create policy "Allow admins to update"
on "public"."whitelist"
as permissive
for update
to authenticated
using (is_admin(( SELECT auth.email() AS email)))
with check (is_admin(( SELECT auth.email() AS email)));




