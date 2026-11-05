#!/bin/sh
set -e

# Zorg dat de data-map bestaat (Railway persistent volume op /data)
mkdir -p /data/uploads

# Symlink uploads naar het volume
if [ ! -L /app/uploads ]; then
  ln -s /data/uploads /app/uploads
fi

# Maak/update de database
npx prisma db push --skip-generate

# Seed admin-account als er nog geen gebruikers zijn
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
p.user.count().then(async (n) => {
  if (n === 0) {
    const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    await p.user.create({ data: { username: 'admin', email: 'admin@casino.local', passwordHash: hash, role: 'ADMIN', balance: 0 } });
    console.log('Admin aangemaakt (wachtwoord: ' + (process.env.ADMIN_PASSWORD || 'admin123') + ')');
  }
  await p.\$disconnect();
});
"

# Start de Next.js standalone server
exec node server.js
