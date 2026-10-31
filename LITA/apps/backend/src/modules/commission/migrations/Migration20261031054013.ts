import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261031054013 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "commission" drop constraint if exists "commission_status_check";`);

    this.addSql(`alter table if exists "commission" add column if not exists "paid_at" timestamptz null, add column if not exists "payment_reference" text null;`);
    this.addSql(`alter table if exists "commission" add constraint "commission_status_check" check("status" in ('new', 'in_discussion', 'quoted', 'accepted', 'awaiting_payment', 'paid', 'converted', 'rejected', 'cancelled'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "commission" drop constraint if exists "commission_status_check";`);

    this.addSql(`alter table if exists "commission" drop column if exists "paid_at", drop column if exists "payment_reference";`);

    this.addSql(`alter table if exists "commission" add constraint "commission_status_check" check("status" in ('new', 'in_discussion', 'quoted', 'accepted', 'converted', 'rejected', 'cancelled'));`);
  }

}
