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
  return data;
}
