// HjksClient — session + CSRF management for HJKS site

const HJKS_BASE = "https://hjks.jepx.or.jp/hjks";
const ALLOWED_HOST = "hjks.jepx.or.jp";

// --- Error classes ---

export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

export class CsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsrfError";
  }
}

export class NetworkError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "NetworkError";
  }
}

// --- Types ---

export interface FetchParams {
  area?: string;
  format?: string;
  maintemode?: string;
  startdtfrom?: string;
  startdtto?: string;
}

// --- HjksClient ---

export class HjksClient {
  private cookies = new Map<string, string>();
  private csrfToken: string | null = null;
  private lastRequestTime = 0;

  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 1000;
  private static readonly RATE_LIMIT_MS = 1000;

  // --- Cookie helpers ---

  private parseCookies(headers: Headers): void {
    const setCookies = headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const match = sc.match(/^([^=]+)=([^;]*)/);
      if (match) {
        this.cookies.set(match[1].trim(), match[2].trim());
      }
    }
  }

  private cookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  // --- CSRF extraction ---

  private extractCsrf(html: string): string | null {
    // Try <input name="_csrf" value="...">
    const inputMatch = html.match(
      /<input[^>]+name=["']_csrf["'][^>]+value=["']([^"']+)["']/i
    );
    if (inputMatch) return inputMatch[1];

    // Try value before name order
    const inputMatch2 = html.match(
      /<input[^>]+value=["']([^"']+)["'][^>]+name=["']_csrf["']/i
    );
    if (inputMatch2) return inputMatch2[1];

    // Try <meta name="_csrf" content="...">
    const metaMatch = html.match(
      /<meta[^>]+name=["']_csrf["'][^>]+content=["']([^"']+)["']/i
    );
    if (metaMatch) return metaMatch[1];

    return null;
  }

  // --- Rate limiting ---

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < HjksClient.RATE_LIMIT_MS) {
      await new Promise((r) => setTimeout(r, HjksClient.RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  // --- Retry with exponential backoff ---

  private async withRetry<T>(
    label: string,
    fn: () => Promise<T>
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < HjksClient.MAX_RETRIES; attempt++) {
      try {
        await this.rateLimit();
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < HjksClient.MAX_RETRIES - 1) {
          const delay =
            HjksClient.BASE_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[${label}] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw new NetworkError(
      `${label} failed after ${HjksClient.MAX_RETRIES} attempts`,
      lastError
    );
  }

  // --- Public methods ---

  /**
   * GET /hjks/outages to establish session (JSESSIONID) and extract CSRF token.
   */
  async initSession(): Promise<void> {
    await this.withRetry("initSession", async () => {
      const res = await fetch(`${HJKS_BASE}/outages`, {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": "hjks-viewer/1.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      this.parseCookies(res.headers);

      // Follow redirect if needed
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (location) {
          const redirectUrl = location.startsWith("http")
            ? location
            : `${HJKS_BASE}${location.startsWith("/") ? "" : "/"}${location}`;

          // Validate redirect stays on allowed host
          try {
            const parsedUrl = new URL(redirectUrl);
            if (parsedUrl.hostname !== ALLOWED_HOST) {
              throw new NetworkError(`Redirect to external host rejected: ${parsedUrl.hostname}`);
            }
          } catch (e) {
            if (e instanceof NetworkError) throw e;
            throw new NetworkError(`Invalid redirect URL: ${redirectUrl}`);
          }

          await this.rateLimit();
          const res2 = await fetch(redirectUrl, {
            method: "GET",
            redirect: "manual",
            headers: {
              "User-Agent": "hjks-viewer/1.0",
              Cookie: this.cookieHeader(),
            },
          });
          this.parseCookies(res2.headers);
          const html = await res2.text();
          this.csrfToken = this.extractCsrf(html);
        }
      } else {
        const html = await res.text();
        this.csrfToken = this.extractCsrf(html);
      }

      if (!this.cookies.has("JSESSIONID")) {
        throw new SessionError("Failed to obtain JSESSIONID");
      }
      if (!this.csrfToken) {
        throw new CsrfError("Failed to extract CSRF token");
      }
    });
  }

  /**
   * POST /hjks/outages with csv=csv to download outage CSV data.
   * Returns the CSV text (decoded from Shift_JIS if necessary).
   */
  async downloadOutagesCsv(params?: FetchParams): Promise<string> {
    return this.withRetry("downloadOutagesCsv", async () => {
      if (!this.csrfToken) {
        throw new SessionError("Session not initialized. Call initSession() first.");
      }

      const body = new URLSearchParams();
      body.set("csv", "csv");
      body.set("_csrf", this.csrfToken);
      if (params?.area) body.set("area", params.area);
      if (params?.format) body.set("format", params.format);
      if (params?.maintemode) body.set("maintemode", params.maintemode);
      if (params?.startdtfrom) body.set("startdtfrom", params.startdtfrom);
      if (params?.startdtto) body.set("startdtto", params.startdtto);

      const res = await fetch(`${HJKS_BASE}/outages`, {
        method: "POST",
        redirect: "manual",
        headers: {
          "User-Agent": "hjks-viewer/1.0",
          Cookie: this.cookieHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      this.parseCookies(res.headers);

      if (res.status >= 300 && res.status < 400) {
        // Re-init session on redirect (session expired)
        throw new SessionError("Session expired (redirect on CSV download)");
      }

      if (!res.ok) {
        throw new NetworkError(`CSV download failed with status ${res.status}`);
      }

      const contentType = res.headers.get("content-type") ?? "";
      const arrayBuffer = await res.arrayBuffer();

      // Decode as Shift_JIS if the content type suggests it, otherwise try UTF-8
      if (
        contentType.includes("shift_jis") ||
        contentType.includes("Shift_JIS") ||
        contentType.includes("sjis")
      ) {
        return new TextDecoder("shift_jis").decode(arrayBuffer);
      }

      // Try UTF-8 first, fall back to Shift_JIS if it looks garbled
      const utf8Text = new TextDecoder("utf-8").decode(arrayBuffer);
      if (utf8Text.includes("\ufffd")) {
        return new TextDecoder("shift_jis").decode(arrayBuffer);
      }
      return utf8Text;
    });
  }

  /**
   * GET /hjks/unit to obtain a page-specific CSRF token for the unit endpoint.
   */
  private async fetchUnitCsrf(): Promise<string> {
    const res = await fetch(`${HJKS_BASE}/unit`, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "hjks-viewer/1.0",
        Cookie: this.cookieHeader(),
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    this.parseCookies(res.headers);
    const html = await res.text();
    const csrf = this.extractCsrf(html);
    if (!csrf) {
      throw new CsrfError("Failed to extract CSRF token from /unit page");
    }
    return csrf;
  }

  /**
   * POST /hjks/unit with csv=csv to download unit CSV data.
   */
  async downloadUnitsCsv(): Promise<string> {
    return this.withRetry("downloadUnitsCsv", async () => {
      if (!this.cookies.has("JSESSIONID")) {
        throw new SessionError("Session not initialized. Call initSession() first.");
      }

      // Fetch a CSRF token specific to the /unit page
      await this.rateLimit();
      const unitCsrf = await this.fetchUnitCsrf();

      const body = new URLSearchParams();
      body.set("csv", "csv");
      body.set("_csrf", unitCsrf);

      const res = await fetch(`${HJKS_BASE}/unit`, {
        method: "POST",
        redirect: "manual",
        headers: {
          "User-Agent": "hjks-viewer/1.0",
          Cookie: this.cookieHeader(),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      this.parseCookies(res.headers);

      if (res.status >= 300 && res.status < 400) {
        throw new SessionError("Session expired (redirect on unit CSV download)");
      }

      if (!res.ok) {
        throw new NetworkError(`Unit CSV download failed with status ${res.status}`);
      }

      const contentType = res.headers.get("content-type") ?? "";
      const arrayBuffer = await res.arrayBuffer();

      if (
        contentType.includes("shift_jis") ||
        contentType.includes("Shift_JIS") ||
        contentType.includes("sjis")
      ) {
        return new TextDecoder("shift_jis").decode(arrayBuffer);
      }

      const utf8Text = new TextDecoder("utf-8").decode(arrayBuffer);
      if (utf8Text.includes("\ufffd")) {
        return new TextDecoder("shift_jis").decode(arrayBuffer);
      }
      return utf8Text;
    });
  }

  /**
   * GET /hjks/top — scrape the top page (no auth required).
   * Returns raw HTML.
   */
  async scrapeTopPage(): Promise<string> {
    return this.withRetry("scrapeTopPage", async () => {
      const res = await fetch(`${HJKS_BASE}/top`, {
        method: "GET",
        headers: {
          "User-Agent": "hjks-viewer/1.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) {
        throw new NetworkError(`Top page scrape failed with status ${res.status}`);
      }

      return res.text();
    });
  }
}
