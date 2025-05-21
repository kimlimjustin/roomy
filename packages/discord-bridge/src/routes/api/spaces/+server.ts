import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request }) => {
  try {
    // Get authorization header from request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Make authenticated request to Roomy API to get spaces
    const response = await fetch('https://api.roomy.chat/v1/spaces', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return json({ error: 'Failed to fetch spaces' }, { status: response.status });
    }

    const spaces = await response.json();
    
    return json(spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};