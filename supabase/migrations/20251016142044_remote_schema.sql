create sequence "public"."whitelist_id_seq";

create table "public"."whitelist" (
    "id" bigint not null default nextval('whitelist_id_seq'::regclass),
    "email" text not null,
    "created_at" timestamp with time zone not null default now(),
    "is_admin" boolean not null default false
);


alter sequence "public"."whitelist_id_seq" owned by "public"."whitelist"."id";

CREATE UNIQUE INDEX whitelist_email_key ON public.whitelist USING btree (email);

CREATE UNIQUE INDEX whitelist_pkey ON public.whitelist USING btree (id);

alter table "public"."whitelist" add constraint "whitelist_pkey" PRIMARY KEY using index "whitelist_pkey";

alter table "public"."whitelist" add constraint "whitelist_email_key" UNIQUE using index "whitelist_email_key";

create policy "Allow admins to delete"
on "public"."whitelist"
as permissive
for delete
to authenticated
using ((EXISTS ( SELECT 1
   FROM whitelist admin_check
  WHERE ((admin_check.email = auth.email()) AND (admin_check.is_admin = true)))));


create policy "Allow admins to insert"
on "public"."whitelist"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM whitelist admin_check
  WHERE ((admin_check.email = auth.email()) AND (admin_check.is_admin = true)))));


create policy "Allow admins to read all entries"
on "public"."whitelist"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM whitelist admin_check
  WHERE ((admin_check.email = auth.email()) AND (admin_check.is_admin = true)))));


create policy "Allow admins to update"
on "public"."whitelist"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM whitelist admin_check
  WHERE ((admin_check.email = auth.email()) AND (admin_check.is_admin = true)))))
with check ((EXISTS ( SELECT 1
   FROM whitelist admin_check
  WHERE ((admin_check.email = auth.email()) AND (admin_check.is_admin = true)))));


create policy "Allow authenticated to read own entry"
on "public"."whitelist"
as permissive
for select
to authenticated
using ((email = auth.email()));




