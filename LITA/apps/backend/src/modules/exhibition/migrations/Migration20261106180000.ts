import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261106180000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "exhibition" add column if not exists "images" jsonb null;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "exhibition" drop column if exists "images";`
    )
  }
}
