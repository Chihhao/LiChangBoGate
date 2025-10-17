revoke delete on table "public"."whitelist" from "anon";

revoke insert on table "public"."whitelist" from "anon";

revoke references on table "public"."whitelist" from "anon";

revoke select on table "public"."whitelist" from "anon";

revoke trigger on table "public"."whitelist" from "anon";

revoke truncate on table "public"."whitelist" from "anon";

revoke update on table "public"."whitelist" from "anon";

revoke delete on table "public"."whitelist" from "authenticated";

revoke insert on table "public"."whitelist" from "authenticated";

revoke references on table "public"."whitelist" from "authenticated";

revoke select on table "public"."whitelist" from "authenticated";

revoke trigger on table "public"."whitelist" from "authenticated";

revoke truncate on table "public"."whitelist" from "authenticated";

revoke update on table "public"."whitelist" from "authenticated";

revoke delete on table "public"."whitelist" from "service_role";

revoke insert on table "public"."whitelist" from "service_role";

revoke references on table "public"."whitelist" from "service_role";

revoke select on table "public"."whitelist" from "service_role";

revoke trigger on table "public"."whitelist" from "service_role";

revoke truncate on table "public"."whitelist" from "service_role";

revoke update on table "public"."whitelist" from "service_role";

alter table "public"."whitelist" add column "resident_id" text default 'N/A'::text;



