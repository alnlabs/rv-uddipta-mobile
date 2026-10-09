const base = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4800").replace(/\/$/, "");

export async function memberFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api/mobile${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Could not reach the community. Check that the website is running.");
  }
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message || "Could not load that.");
  return body as T;
}
