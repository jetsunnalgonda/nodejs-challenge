import { exec } from 'child_process';

exec('prisma migrate deploy', (err, stdout, stderr) => {
  if (err) {
    console.error(`Error running migrations: ${err}`);
    return;
  }
  console.log(`Migration output: ${stdout}`);
});
