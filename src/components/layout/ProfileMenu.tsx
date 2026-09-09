import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Mail, Settings, ShieldCheck } from "lucide-react";
import { NavLink } from "react-router-dom";
import { getInitials } from "@/lib/utils";
import { normalizeRole, roleLabel, type Role } from "@/lib/Auth/roles";
import type { User } from "@/lib/Auth/AuthContext";

interface Props {
  user: User;
  displayName: string;
  subtitle?: string;
}

// Couleurs badge rôle imposées par la maquette — pas de token brand existant pour ce triptyque.
const ROLE_BADGE_STYLE: Record<Role, { bg: string; color: string }> = {
  technicien: { bg: "#4CAF50", color: "#FFFFFF" },
  admin: { bg: "#FF9800", color: "#FFFFFF" },
  super_admin: { bg: "#B0BEC5", color: "#12253F" },
};

export function ProfileMenu({ user, displayName, subtitle }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const initials = getInitials(displayName);
  const role = normalizeRole(user.role);
  const roleBadgeStyle = ROLE_BADGE_STYLE[role];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-sm py-1.5 pl-1.5 pr-2 transition-colors hover:bg-brand-off-white dark:hover:bg-white/5"
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-2 ring-white shadow-card"
          />
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-[13px] font-semibold text-white ring-2 ring-white shadow-card">
            {initials}
          </div>
        )}
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate font-display text-[13px] font-semibold leading-tight text-brand-blue-dark dark:text-white">
            {displayName}
          </span>
          <span
            className="mt-0.5 inline-block truncate rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight"
            style={{ backgroundColor: roleBadgeStyle.bg, color: roleBadgeStyle.color }}
          >
            {roleLabel(user.role)}
          </span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className={`hidden flex-shrink-0 text-brand-gray transition-transform duration-150 dark:text-white/60 sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="dark absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-white/10 bg-brand-blue-dark/85 shadow-card-hover backdrop-blur-md"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top right" }}
          >
          <div className="flex items-center gap-3 bg-white/5 px-4 py-4">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={displayName} className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-blue text-[15px] font-semibold text-white">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate font-display text-[14px] font-semibold text-brand-blue-dark dark:text-white">
                {displayName}
              </div>
              {subtitle && <div className="truncate text-[12px] text-brand-gray dark:text-white/60">{subtitle}</div>}
            </div>
          </div>

          <div className="space-y-0.5 px-2 py-2">
            {(user.email ?? user.username) && (
              <div className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-brand-blue-dark dark:text-white">
                <Mail size={16} strokeWidth={1.75} className="flex-shrink-0 text-brand-gray dark:text-white/60" />
                <span className="truncate">{user.email ?? user.username}</span>
              </div>
            )}
            {user.role && (
              <div className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] text-brand-blue-dark dark:text-white">
                <ShieldCheck size={16} strokeWidth={1.75} className="flex-shrink-0 text-brand-gray dark:text-white/60" />
                <span className="truncate">{user.role}</span>
              </div>
            )}
          </div>

          <div className="border-t border-brand-blue/[0.06] px-2 py-2 dark:border-white/10">
            <NavLink
              to="/parametres"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] font-medium text-brand-blue-dark transition-colors hover:bg-brand-off-white dark:text-white dark:hover:bg-white/5"
            >
              <Settings size={16} strokeWidth={1.75} className="flex-shrink-0 text-brand-gray dark:text-white/60" />
              Paramètres
            </NavLink>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
