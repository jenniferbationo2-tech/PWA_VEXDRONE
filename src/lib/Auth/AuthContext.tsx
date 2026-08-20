import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, login as apiLogin, logout as apiLogout, onAuthExpired } from "@/lib/api/auth";

// Le backend ne renvoie que "username" de façon garantie sur /users/me.
// name/organisation/zone sont optionnels : s'il les fournit déjà, l'UI les
// affichera automatiquement (voir Sidebar) ; sinon ces champs restent undefined
// et l'UI se rabat proprement sur username.
export interface User {
  username: string;
  name?: string;
  organisation?: string;
  zone?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  // Une requete protegee par CSRF a echoue en 403 (token perdu/perime) :
  // on vide l'utilisateur courant, ce qui fait rediriger ProtectedRoute vers /connexion.
  useEffect(() => onAuthExpired(() => setUser(null)), []);

  async function login(username: string, password: string) {
    await apiLogin(username, password);
    const me = await getMe();
    setUser(me);
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}