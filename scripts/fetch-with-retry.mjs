const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 20000];
const isRetryableStatus = status => status === 404 || status === 408 || status === 425 || status === 429 || status >= 500;

export async function fetchTextWithRetry(url, {
  fetchImpl = fetch,
  sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)),
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  timeoutMs = 10000,
  label = new URL(url).pathname,
  validateBody = () => true,
  onRetry = () => {},
} = {}) {
  let lastFailure = 'no response';
  const totalAttempts = retryDelaysMs.length + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    let response;
    let body;
    let requestError;
    try {
      response = await fetchImpl(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 200) body = await response.text();
    } catch (error) {
      requestError = error;
    }

    if (requestError) {
      lastFailure = requestError.name === 'TimeoutError' || requestError.name === 'AbortError'
        ? 'request timed out'
        : `request failed (${requestError.name || 'unknown error'})`;
    } else if (response.status === 200) {
      const validation = validateBody(body, response);
      if (validation === true) return { response, body };
      lastFailure = typeof validation === 'string' ? validation : 'response body failed validation';
    } else {
      lastFailure = `HTTP ${response.status}`;
      if (!isRetryableStatus(response.status)) throw new Error(`${label} returned ${lastFailure}`);
    }

    if (attempt === totalAttempts) break;
    const delayMs = retryDelaysMs[attempt - 1];
    onRetry({ attempt, totalAttempts, delayMs, reason: lastFailure });
    await sleep(delayMs);
  }

  throw new Error(`${label} did not become ready after ${totalAttempts} attempts: ${lastFailure}`);
}
