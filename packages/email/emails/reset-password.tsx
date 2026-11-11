import React from "react";
import { AuthEmailTemplate } from "../src/render";

export default function PreviewEmail() {
  return <AuthEmailTemplate type="reset-password" url="https://example.test/reset-password?token=synthetic-preview" />;
}
