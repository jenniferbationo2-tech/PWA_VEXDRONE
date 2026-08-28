import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  changePassword as apiChangePassword,
  getMe,
  login as apiLogin,
  logout as apiLogout,
  onAuthExpired,
  refreshCsrfToken,
  updateAvatar as apiUpdateAvatar,
  updateProfile as apiUpdateProfile,
  type ProfileUpdateInput,
} from "@/lib/api/auth";

// name/email/role viennent de /users/me (confirmé : schéma UserMeRead).
// organisation/zone/avatarUrl n'existent pas côté API — stockés en local par
// lib/api/auth.ts et fusionnés dans le User renvoyé par getMe/updateProfile,
// donc restent undefined tant que l'utilisateur ne les a jamais renseignés.
export interface User {
  username: string;
  name?: string;
  organisation?: string;
  zone?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateAvatar: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMe()
      // Le cookie de session survit a un reload, pas le jeton CSRF (garde en
      // memoire JS) : on le regenere ici, avant qu'une premiere action ne
      // declenche un faux 403 "session expiree".
      .then(async (me) => {
        await refreshCsrfToken();
        return me;
      })
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
    return me;
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  async function updateProfile(input: ProfileUpdateInput) {
    if (!user) return;
    const updated = await apiUpdateProfile(user.username, input);
    setUser((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await apiChangePassword(currentPassword, newPassword);
  }

  async function updateAvatar(file: File) {
    if (!user) return;
    const { avatarUrl } = await apiUpdateAvatar(user.username, file);
    setUser((prev) => (prev ? { ...prev, avatarUrl } : prev));
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, updateProfile, changePassword, updateAvatar }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans un AuthProvider");
  return ctx;
}