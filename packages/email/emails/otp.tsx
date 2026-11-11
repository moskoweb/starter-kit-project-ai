import React from "react";
import { AuthEmailTemplate } from "../src/render";

export default function PreviewEmail() {
  return <AuthEmailTemplate type="otp" code="123456" />;
}
