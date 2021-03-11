// @ts-check

/**
 * This is our ApiError base class.
 *
 * Inherit from this to build more specific errors, that generate different status codes.
 */
export class ApiError extends Error {
  status: number;
  error: any;

  /**
   * @param {string} message
   * @param {number} [status=500]
   * @param {any} [error]
   */
  constructor(message: any, status = 500, error?: any) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.error = error;
    console.warn(`${message}. May generate a ${status}`);
  }
}
