import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowRight, LogOut, User, Lock } from "lucide-react";
import { FieldHeading } from "@/components/field/GameShell";

export function ProfileSettings() {
  const { user, logout } = useAuthContext();

  // Profile State
  const [name, setName] = useState(user?.name || "");
  const [grade, setGrade] = useState(user?.grade || "");
  const [schoolClass, setSchoolClass] = useState(user?.schoolClass || "");

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const utils = trpc.useContext();

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      utils.auth.me.invalidate();
    },
    onError: error => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const updatePasswordMutation = trpc.auth.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: error => {
      toast.error(`Password update failed: ${error.message}`);
    },
  });

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfileMutation.mutate({ name, grade, schoolClass });
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    updatePasswordMutation.mutate({ currentPassword, newPassword });
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!user) return null;

  return (
    <div className="field-profile">
      <FieldHeading
        eyebrow="YOUR STUDENT ACCOUNT"
        title="Make this field station yours."
        description="Keep your details up to date, and your account ready for the next discovery."
      >
        <button className="field-text-link" onClick={handleLogout}>
          Sign Out <LogOut size={16} />
        </button>
      </FieldHeading>
      <div className="field-profile-grid">
        <aside className="field-profile-summary">
          <span className="field-profile-avatar">
            {(user.name || "Explorer").charAt(0).toUpperCase()}
          </span>
          <span className="field-kicker">YOUR EXPLORER PROFILE</span>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="field-pill">Student</span>
          <p>
            Your account keeps your journey, school projects, and verified
            achievements together.
          </p>
        </aside>
        <div>
          <section className="field-panel">
            <span className="field-kicker">A LITTLE ABOUT YOU</span>
            <h2>Personal details.</h2>
            <form
              className="field-form"
              onSubmit={handleProfileUpdate}
              aria-busy={updateProfileMutation.isPending}
            >
              <label htmlFor="profile-name">Your name</label>
              <input
                id="profile-name"
                autoComplete="name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={updateProfileMutation.isPending}
              />
              <label htmlFor="profile-grade">Grade</label>
              <input
                id="profile-grade"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                placeholder="Your grade"
                disabled={updateProfileMutation.isPending}
              />
              <label htmlFor="profile-class">Class</label>
              <input
                id="profile-class"
                value={schoolClass}
                onChange={e => setSchoolClass(e.target.value)}
                placeholder="Your class"
                disabled={updateProfileMutation.isPending}
              />
              <button
                className="field-button"
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Saving…" : "Save profile"}
                <ArrowRight size={16} />
              </button>
            </form>
          </section>
          <section className="field-panel">
            <span className="field-kicker">KEEP YOUR ACCOUNT SAFE</span>
            <h2>Password & security.</h2>
            <p className="field-muted">
              Use at least eight characters for your new password.
            </p>
            <form
              className="field-form"
              onSubmit={handlePasswordUpdate}
              aria-busy={updatePasswordMutation.isPending}
            >
              <label htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                disabled={updatePasswordMutation.isPending}
              />
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={updatePasswordMutation.isPending}
              />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={updatePasswordMutation.isPending}
              />
              <button
                className="field-button"
                type="submit"
                disabled={updatePasswordMutation.isPending}
              >
                {updatePasswordMutation.isPending
                  ? "Updating…"
                  : "Update password"}
                <Lock size={16} />
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
