/**
 * Keyset pagination cursor: the (occurredAt, id) of the last item of a page.
 *
 * Why keyset and not OFFSET: with OFFSET, a transaction added while the user scrolls shifts
 * every row, so items get skipped or shown twice, and the database still reads all skipped
 * rows. "Rows after (occurredAt, id)" is stable and uses the (userId, occurredAt, id) index.
 * `id` breaks ties between transactions at the same instant.
 *
 * The cursor is opaque to clients (base64url JSON). It is not signed: changing it can only
 * move within the caller's own transactions, because every query also filters by userId.
 */
export interface TransactionCursor {
  occurredAt: Date;
  id: string;
}

export function encodeCursor(cursor: TransactionCursor): string {
  const json = JSON.stringify({ o: cursor.occurredAt.toISOString(), i: cursor.id });
  return Buffer.from(json, "utf8").toString("base64url");
}

/** Null when the string is not a cursor this server produced. */
export function decodeCursor(value: string): TransactionCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed !== "object" || parsed === null || !("o" in parsed) || !("i" in parsed)) {
      return null;
    }
    const { o, i } = parsed;
    if (typeof o !== "string" || typeof i !== "string" || i.length === 0) {
      return null;
    }
    const occurredAt = new Date(o);
    return Number.isNaN(occurredAt.getTime()) ? null : { occurredAt, id: i };
  } catch {
    return null;
  }
}
