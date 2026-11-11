import "server-only";

export { sendEmail } from "./transport";
export { renderAuthEmail } from "./render";
export type { AuthEmail, RenderedEmail } from "./render";
export type { SendEmailOptions } from "./transport";