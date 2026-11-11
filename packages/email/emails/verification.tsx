import React from "react";
import { AuthEmailTemplate } from "../src/render";

export default function PreviewEmail() {
  return <AuthEmailTemplate type="verification" url="https://example.test/verify?token=synthetic-preview" />;
}
