import { Button, Html } from "@react-email/components";
import * as React from "react";

export const MyEmail = () => (
  <Html>
    <Button
      href="https://pinyinly.com"
      style={{ background: "#000", color: "#fff", padding: "12px 20px" }}
    >
      Goto pinyinly.com
    </Button>
  </Html>
);

export default MyEmail;
