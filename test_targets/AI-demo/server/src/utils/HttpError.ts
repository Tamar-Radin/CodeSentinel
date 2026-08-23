/**
 * HttpError - מחלקת שגיאה מותאמת עם status code ו-error code
 * משמשת לזריקת שגיאות מטופלות מקונטרולרים ו-middleware.
 */
export class HttpError extends Error {
  status: number;
  code?: string;

  constructor(status: number, codeOrMessage: string, message?: string) {
    super(message ?? codeOrMessage);
    this.status = status;
    this.code = message ? codeOrMessage : undefined;
    this.name = "HttpError";
  }
}
