const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('wb.authToken');
  if (!token) throw new Error('No authentication token found');
  return {
    Authorization: `Token ${token}`,
    'Content-Type': 'application/json',
  };
}

export async function fetchAssociates(): Promise<unknown> {
  const response = await fetch(`${API_BASE_URL}/api/accounts/users/?role=associate`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to fetch associates: ${response.statusText}`);
  return response.json();
}
