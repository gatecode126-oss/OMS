import 'dotenv/config';
import mongoose from 'mongoose';

async function check() {
  await mongoose.connect(process.env.DB_URI);
  console.log('Connected to Main DB');
  
  const db = mongoose.connection.db;
  const docs = await db.collection('documents').find({}).toArray();
  console.log('Total Documents in DB:', docs.length);
  docs.forEach(d => {
    console.log(`- name: ${d.name}, category: ${d.category}, id: ${d.id}, type: ${d.type}`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
