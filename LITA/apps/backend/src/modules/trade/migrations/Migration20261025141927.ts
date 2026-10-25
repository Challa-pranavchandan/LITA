import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261025141927 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "trade_application" ("id" text not null, "name" text not null, "email" text not null, "company" text null, "role" text null, "phone" text null, "website" text null, "message" text null, "status" text check ("status" in ('pending', 'approved', 'rejected')) not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "trade_application_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_trade_application_deleted_at" ON "trade_application" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "trade_application" cascade;`);
  }

}
