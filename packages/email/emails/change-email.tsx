import React from "react";
import { AuthEmailTemplate } from "../src/render";

export default function PreviewEmail() {
  return <AuthEmailTemplate type="change-email" newEmail="novo@example.test" url="https://example.test/verify-email?token=synthetic-preview" />;
}
