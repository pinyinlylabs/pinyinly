import { router } from "expo-router";
import { useEffect } from "react";

export default function NativeHomeRedirect() {
  useEffect(() => {
    const x = setTimeout(() => {
      router.replace(`/learn`);
    }, 0);
    return () => {
      clearTimeout(x);
    };
  }, []);
  return null;
}
