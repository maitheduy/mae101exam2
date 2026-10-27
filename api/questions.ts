import { questionsData } from '../server';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  return res.status(200).json(questionsData);
}
