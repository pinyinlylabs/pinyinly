import { Button, Html } from "@react-email/components";
import * as React from "react";

export const MyEmail = () => (
  <Html>
    <Button
      href="https://pinyin.ly"
      style={{ background: "#000", color: "#fff", padding: "12px 20px" }}
    >
      Goto pinyin.ly
    </Button>
  </Html>
);

export default MyEmail;
