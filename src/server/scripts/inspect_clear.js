import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.DB_URI;

async function main() {
  await mongoose.connect(DB_URI);
  console.log('Connected to MongoDB');
  
  const db = mongoose.connection.db;
  const emp = await db.collection('employees').findOne({ id: 'GATECO-EMP-003' });
  console.log('Raw Employee GATECO-EMP-003:', JSON.stringify(emp, null, 2));
  
  await mongoose.connection.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
