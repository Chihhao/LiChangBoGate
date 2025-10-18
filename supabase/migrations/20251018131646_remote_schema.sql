drop policy "Allow admins to delete" on "public"."whitelist";

drop policy "Allow admins to insert" on "public"."whitelist";

drop policy "Allow admins to read all entries" on "public"."whitelist";

drop policy "Allow admins to update" on "public"."whitelist";

revoke delete on table "public"."logs" from "anon";

revoke insert on table "public"."logs" from "anon";

revoke references on table "public"."logs" from "anon";

revoke select on table "public"."logs" from "anon";

revoke trigger on table "public"."logs" from "anon";

revoke truncate on table "public"."logs" from "anon";

revoke update on table "public"."logs" from "anon";

revoke delete on table "public"."logs" from "authenticated";

revoke insert on table "public"."logs" from "authenticated";

revoke references on table "public"."logs" from "authenticated";

revoke select on table "public"."logs" from "authenticated";

revoke trigger on table "public"."logs" from "authenticated";

revoke truncate on table "public"."logs" from "authenticated";

revoke update on table "public"."logs" from "authenticated";

revoke delete on table "public"."logs" from "service_role";

revoke insert on table "public"."logs" from "service_role";

revoke references on table "public"."logs" from "service_role";

revoke select on table "public"."logs" from "service_role";

revoke trigger on table "public"."logs" from "service_role";

revoke truncate on table "public"."logs" from "service_role";

revoke update on table "public"."logs" from "service_role";

alter table "public"."whitelist" enable row level security;

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

create policy "Allow admins to delete"
on "public"."whitelist"
as permissive
for delete
to authenticated
using (is_admin(auth.email()));


create policy "Allow admins to insert"
on "public"."whitelist"
as permissive
for insert
to authenticated
with check (is_admin(auth.email()));


create policy "Allow admins to read all entries"
on "public"."whitelist"
as permissive
for select
to authenticated
using (is_admin(auth.email()));


create policy "Allow admins to update"
on "public"."whitelist"
as permissive
for update
to authenticated
using (is_admin(auth.email()))
with check (is_admin(auth.email()));




