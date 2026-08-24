import { useRef, useState, type FormEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/Auth/AuthContext";
import { getInitials, prettifyUsername } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export function Parametres() {
  const { user, updateProfile, changePassword, updateAvatar } = useAuth();

  if (!user) return null;

  const displayName = user.name || prettifyUsername(user.username);
  const initials = getInitials(displayName);

  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [organisation, setOrganisation] = useState(user.organisation ?? "");
  const [zone, setZone] = useState(user.zone ?? "");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Le fichier doit être une image.");
    } else if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError("L'image ne doit pas dépasser 2 Mo.");
    } else {
      setUploadingAvatar(true);
      try {
        await updateAvatar(file);
      } catch (err) {
        setAvatarError(err instanceof Error ? err.message : "Impossible de mettre à jour l'avatar.");
      } finally {
        setUploadingAvatar(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!name.trim()) {
      setProfileError("Le nom affiché est requis.");
      return;
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setProfileError("Adresse email invalide.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        organisation: organisation.trim() || undefined,
        zone: zone.trim() || undefined,
      });
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Impossible d'enregistrer le profil.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Merci de remplir tous les champs.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Impossible de modifier le mot de passe.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <h1>Paramètres</h1>

      <div className="mt-6 grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
          </CardHeader>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="h-16 w-16 rounded-full object-cover ring-2 ring-white shadow-card"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-blue text-[18px] font-semibold text-white ring-2 ring-white shadow-card">
                    {initials}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  aria-label="Changer l'avatar"
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange text-white shadow-card transition-colors hover:bg-brand-orange-light disabled:opacity-60"
                >
                  {uploadingAvatar ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-[14px] font-semibold text-brand-blue-dark dark:text-white">
                  {displayName}
                </p>
                <p className="truncate text-[12px] text-brand-gray dark:text-white/60">{user.username}</p>
              </div>
            </div>

            {avatarError && <p className="text-[13px] font-medium text-brand-orange">⚠ {avatarError}</p>}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">Nom affiché</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mounira Diallo" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mounira.diallo@sonabel.bf"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">Organisation</label>
                <Input value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="SONABEL" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
                  Zone d'affectation
                </label>
                <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Zone A" />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">Rôle</label>
                <Input
                  value={user.role ?? "Non défini"}
                  disabled
                  className="bg-brand-off-white text-brand-gray dark:bg-white/5 dark:text-white/50"
                />
              </div>
            </div>

            {profileError && <p className="text-[13px] font-medium text-brand-orange">⚠ {profileError}</p>}
            {profileSuccess && <p className="text-[13px] font-medium text-emerald-600">✓ Profil mis à jour.</p>}

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={savingProfile}>
                {savingProfile ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
          </CardHeader>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
                Mot de passe actuel
              </label>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
                  Nouveau mot de passe
                </label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-brand-blue-dark dark:text-white">
                  Confirmer le mot de passe
                </label>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {passwordError && <p className="text-[13px] font-medium text-brand-orange">⚠ {passwordError}</p>}
            {passwordSuccess && (
              <p className="text-[13px] font-medium text-emerald-600">✓ Mot de passe modifié.</p>
            )}

            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={savingPassword}>
                {savingPassword ? "Modification…" : "Modifier le mot de passe"}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
