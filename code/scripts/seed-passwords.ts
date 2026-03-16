/**
 * Script to generate bcrypt hashes for demo seed users.
 * Run: npx ts-node scripts/seed-passwords.ts
 *
 * Default password for all demo users: Admin@123
 */
import * as bcrypt from 'bcrypt';

async function main() {
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 10);

  console.log('=== SMTTS Seed Password Hashes ===');
  console.log(`Password: ${password}`);
  console.log(`Bcrypt Hash: ${hash}`);
  console.log('');
  console.log('Replace placeholder hashes in 003_seed_data.sql with:');
  console.log(hash);
}

main().catch(console.error);
