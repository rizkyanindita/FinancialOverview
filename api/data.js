import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  // Key to store our data
  const DB_KEY = 'fintracker_db_data';

  try {
    if (req.method === 'GET') {
      // Fetch data
      const data = await redis.get(DB_KEY);
      // Redis might return null if the key doesn't exist yet
      return res.status(200).json(data || { expenses: [], plannerItems: [] });
    } 
    
    else if (req.method === 'POST') {
      // Save data
      const { expenses, plannerItems } = req.body;
      
      if (!expenses || !plannerItems) {
        return res.status(400).json({ error: 'Missing expenses or plannerItems in request body' });
      }

      await redis.set(DB_KEY, { expenses, plannerItems });
      return res.status(200).json({ success: true });
    } 
    
    else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Redis Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
