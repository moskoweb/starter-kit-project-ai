import React from "react";
import { AuthEmailTemplate } from "../src/render";

export default function PreviewEmail() {
  return <AuthEmailTemplate type="delete-account" url="https://example.test/delete-user/callback?token=synthetic-preview" />;
}
