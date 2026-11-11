import React from "react";
import { AuthEmailTemplate } from "../src/render";

export default function PreviewEmail() {
  return <AuthEmailTemplate type="invitation" organizationName="Organização de exemplo" url="https://example.test/invitations/synthetic-preview" />;
}
