import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/Auth/AuthContext";


export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("vexdrone_session_expired")) {
      sessionStorage.removeItem("vexdrone_session_expired");
      setError("Ta session a expiré. Merci de te reconnecter.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError("Merci de renseigner l'identifiant et le mot de passe.");
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Identifiants incorrects.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-blue-dark px-4">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/video/vexdrone-home-video.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div
        className="pointer-events-none absolute inset-0 bg-brand-blue-dark/70"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 30% 20%, rgba(39,74,122,0.7) 0%, rgba(27,54,93,0.5) 45%, rgba(13,27,48,0.85) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute h-[420px] w-[420px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "#E37222" }}
      />

      <div className="relative w-full max-w-[380px] rounded-lg border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-15 w-15 items-center justify-center rounded-full ring-2 ring-brand-orange/40">
            <img src="/logo/vexdrone-icon.png" alt="VEXDRON" className="h-full w-full rounded-full" />
          </div>
          <p className="mt-1 text-[14px] text-white/50">Inspection intelligente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1.5 block text-[13px] font-medium text-white/80">
              Utilisateur(email)
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              placeholder="votre.organisation@.bf"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 w-full rounded-sm border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-white/80">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-sm border border-white/10 bg-white/[0.06] px-3 text-[14px] text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
            />
          </div>

          {error && <p className="text-[13px] font-medium text-brand-orange">⚠ {error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-brand-orange text-[15px] font-semibold text-white transition-colors hover:bg-brand-orange-light disabled:opacity-70"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Connexion
          </button>
        </form>

        <p className="mt-6 text-center text-[12px] text-white/30">POC Orange Summer Challenge 2026</p>
      </div>
    </div>
  );
}