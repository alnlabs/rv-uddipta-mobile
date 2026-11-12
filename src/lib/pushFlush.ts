/** No-op on phone — push delivery must not call the website. */
export async function flushPushOutbox() {
  return;
}
