import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1750993592118 implements MigrationInterface {
  name = 'Migration1750993592118';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename refreshToken column to refresh_token to match entity
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "refreshToken" TO "refresh_token"`,
    );

    // Add last_signout_at column
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "last_signout_at" TIMESTAMP DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove last_signout_at column
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "last_signout_at"`,
    );

    // Rename refresh_token back to refreshToken
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "refresh_token" TO "refreshToken"`,
    );
  }
}
