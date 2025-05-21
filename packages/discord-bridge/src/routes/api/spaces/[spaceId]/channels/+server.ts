import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
  try {
    const { spaceId } = params;
    
    // Get authorization header from request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Make authenticated request to Roomy API to get channels in the space
    const response = await fetch(`https://api.roomy.chat/v1/spaces/${spaceId}/channels`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return json({ error: 'Failed to fetch channels' }, { status: response.status });
    }

    const channels = await response.json();
    
    return json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};