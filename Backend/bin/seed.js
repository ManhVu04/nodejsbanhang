#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
  const dotenv = require('dotenv');
  const envFiles = [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../.env.local')
  ];
  for (const envFile of envFiles) {
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile, override: true, quiet: true });
    }
  }
}

const mongoose = require('mongoose');
const roleModel = require('../schemas/roles');
const userModel = require('../schemas/users');
const cartModel = require('../schemas/carts');

const ROLES = [
  { name: 'Admin', description: 'Quan tri vien' },
  { name: 'Moderator', description: 'Kiem duyet vien' },
  { name: 'User', description: 'Nguoi dung' }
];

const ADMIN = {
  username: process.env.SEED_ADMIN_USERNAME || 'admin',
  password: process.env.SEED_ADMIN_PASSWORD || 'Admin@123',
  email: (process.env.SEED_ADMIN_EMAIL || 'admin@minishop.local').toLowerCase(),
  fullName: 'Administrator'
};

async function main() {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    throw new Error('MONGODB_URI is empty. Set it in Backend/.env.local');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  console.log('Connected to MongoDB.');

  for (const role of ROLES) {
    const existing = await roleModel.findOne({ name: { $regex: new RegExp(`^${role.name}$`, 'i') } });
    if (existing) {
      console.log(`Role exists: ${role.name}`);
    } else {
      await roleModel.create(role);
      console.log(`Role created: ${role.name}`);
    }
  }

  const adminRole = await roleModel.findOne({ name: { $regex: /^admin$/i }, isDeleted: false });

  let admin = await userModel.findOne({ username: ADMIN.username });
  if (admin) {
    console.log(`Admin user exists: ${ADMIN.username}`);
  } else {
    admin = await userModel.create({
      username: ADMIN.username,
      password: ADMIN.password,
      email: ADMIN.email,
      fullName: ADMIN.fullName,
      status: true,
      role: adminRole._id,
      loginCount: 0
    });
    await cartModel.create({ user: admin._id });
    console.log(`Admin user created: ${ADMIN.username} / ${ADMIN.password}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
