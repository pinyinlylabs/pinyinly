import { router } from "expo-router";
import { useEffect } from "react";

export default () => {
  useEffect(() => {
    const x = setTimeout(() => {
      router.replace(`/dashboard`);
    }, 0);
    return () => {
      clearTimeout(x);
    };
  }, []);
  return null;
};
