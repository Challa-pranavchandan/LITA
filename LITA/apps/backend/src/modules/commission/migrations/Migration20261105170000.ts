import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261105170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "commission_status_backup_20261105170000" as
        select "id" from "commission"
        where "status" = 'converted' and "order_id" is not null;`
    )
    this.addSql(
      `update "commission" set "status" = 'awaiting_payment' where "status" = 'converted' and "order_id" is not null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `update "commission" as c set "status" = 'converted'
        from "commission_status_backup_20261105170000" as b
        where c."id" = b."id" and c."status" = 'awaiting_payment';`
    )
    this.addSql(
      `drop table "commission_status_backup_20261105170000";`
    )
  }
}
