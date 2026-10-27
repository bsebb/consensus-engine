export async function dashboardRequest(path, body, { signal } = {}) {
  const response = await fetch('/api/v1/dashboard' + path, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Dashboard temporarily unavailable. Please try again.');
  }
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Please try again.');
    error.status = response.status;
    throw error;
  }
  // Frontend and backend deploy independently. Never display partial metrics
  // from the previous analytics contract during a rolling release.
  if (path.startsWith('/analytics') && (!data.audience || !data.votes)) {
    throw new Error(
      'The dashboard update is finishing. Please refresh in a moment.'
    );
  }
  return data;
}
