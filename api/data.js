import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req, res) {
  // Key to store our data
  const DB_KEY = 'fintracker_db_data';

  // Bentuk data kosong default (semua array yang dipakai aplikasi)
  const emptyDb = {
    expenses: [],
    plannerItems: [],
    incomeEntries: [],
    wishlist: [],
    monthlyHistory: []
  };

  try {
    if (req.method === 'GET') {
      // Fetch data
      const data = await redis.get(DB_KEY);
      // Redis might return null if the key doesn't exist yet.
      // Merge dengan emptyDb supaya field baru tidak undefined pada data lama.
      return res.status(200).json({ ...emptyDb, ...(data || {}) });
    }

    else if (req.method === 'POST') {
      // Save data
      const { expenses, plannerItems, incomeEntries, wishlist, monthlyHistory } = req.body;

      // expenses & plannerItems wajib ada (inti aplikasi)
      if (!expenses || !plannerItems) {
        return res.status(400).json({ error: 'Missing expenses or plannerItems in request body' });
      }

      // Simpan SEMUA array — pakai default array kosong bila tidak dikirim.
      await redis.set(DB_KEY, {
        expenses,
        plannerItems,
        incomeEntries: incomeEntries || [],
        wishlist: wishlist || [],
        monthlyHistory: monthlyHistory || []
      });
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
