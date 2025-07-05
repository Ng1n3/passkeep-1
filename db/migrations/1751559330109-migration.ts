import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1751559330109 implements MigrationInterface {
  name = 'Migration1751559330109';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make password nullable
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password" DROP NOT NULL
    `);

    // Add picture
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "picture" character varying
    `);

    // Add provider
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "provider" character varying NOT NULL DEFAULT 'local'
    `);

    // Add googleId + unique constraint
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "googleId" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_googleId" UNIQUE ("googleId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove googleId unique constraint
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT "UQ_googleId"
    `);

    // Remove googleId column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "googleId"
    `);

    // Remove provider column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "provider"
    `);

    // Remove picture column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "picture"
    `);

    // Revert password to NOT NULL
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password" SET NOT NULL
    `);
  }
}
