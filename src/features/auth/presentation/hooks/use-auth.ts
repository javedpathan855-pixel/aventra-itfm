import { useState } from "react";

type AuthMode = "login" | "forgot" | "register";

const useAuth = () => {
  const [mode, setMode] = useState<AuthMode>("login");

  const setLogin = () => setMode("login");
  const setForgot = () => setMode("forgot");
  const setRegister = () => setMode("register");

  return {
    mode,
    setLogin,
    setForgot,
    setRegister,
  };
};

export default useAuth;
export type { AuthMode };
