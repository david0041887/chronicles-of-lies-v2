"use server";

// The 5-round choose-1-of-4 starter flow was removed in Phase C.
// The tutorial flow lives in /welcome/tutorial and completes via
// /api/tutorial/complete. This file is kept as a placeholder to
// avoid breaking imports in historical code.

export async function _deprecated_noop() {
  return { ok: true };
}
