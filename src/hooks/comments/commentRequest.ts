interface CommentPage {
  contents: readonly unknown[];
}

interface CommentClient<T extends CommentPage> {
  getComments: (videoId: string) => Promise<T>;
}

export interface CommentRequestOptions<T extends CommentPage> {
  timeoutMs?: number;
  /**
   * Whether a page is worth keeping. The default asks only whether the page
   * has entries, which is not the same question as whether anything readable
   * came out of them: YouTube sends comment text and author in a separate
   * entity batch, and a session whose response omits it parses into rows that
   * have an id and nothing else.
   */
  isUsable?: (page: T) => boolean;
}

function requestWithTimeout<T>(request: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Comment request timed out"));
    }, timeoutMs);

    request.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      reason => {
        clearTimeout(timer);
        reject(reason);
      },
    );
  });
}

/** Tries the signed-in session first and keeps an unusable page only as fallback. */
export async function requestCommentsWithFallback<T extends CommentPage>(
  videoId: string,
  clients: (CommentClient<T> | undefined)[],
  {
    timeoutMs = 10_000,
    isUsable = page => page.contents.length > 0,
  }: CommentRequestOptions<T> = {},
): Promise<T> {
  const uniqueClients = clients.filter(
    (client, index): client is CommentClient<T> =>
      Boolean(client) && clients.indexOf(client) === index,
  );
  let unusablePage: T | undefined;
  let lastError: unknown;

  for (const client of uniqueClients) {
    try {
      const page = await requestWithTimeout(
        client.getComments(videoId),
        timeoutMs,
      );

      if (isUsable(page)) {
        return page;
      }

      unusablePage ??= page;
    } catch (error) {
      lastError = error;
    }
  }

  if (unusablePage) {
    return unusablePage;
  }

  throw lastError ?? new Error("No comment client is available");
}
