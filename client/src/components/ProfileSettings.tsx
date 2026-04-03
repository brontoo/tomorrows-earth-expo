import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Lock, LogOut, Camera, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export function ProfileSettings() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  
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
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    }
  });

  const updatePasswordMutation = trpc.auth.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(`Password update failed: ${error.message}`);
    }
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground font-medium">
            Manage your personal information and security preferences.
          </p>
        </div>
        <Button 
          variant="destructive" 
          className="gap-2 font-bold shadow-lg"
          onClick={handleLogout}
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Profile Details Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <Card className="glass-card border-white/20 rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5 blur-xl bg-primary w-32 h-32 rounded-full pointer-events-none"></div>
            <CardContent className="p-6 text-center space-y-4">
              <div className="relative inline-block group">
                <div className="w-28 h-28 mx-auto rounded-full premium-gradient shadow-xl flex items-center justify-center text-white font-bold text-4xl border-4 border-white">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm">
                  <Camera className="text-white" size={24} />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-xl">{name}</h3>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{user.role}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Forms Container */}
        <div className="md:col-span-2 space-y-8">
          
          {/* General Information Form */}
          <Card className="glass-card border-white/20 rounded-2xl">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <User size={20} className="text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>Update your display name and academic details.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-bold">Full Name</Label>
                    <Input 
                      id="name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="bg-white/5 border-white/20 h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold">Email Address</Label>
                    <Input 
                      id="email" 
                      value={user.email} 
                      disabled 
                      className="bg-black/5 border-white/10 text-muted-foreground h-11"
                    />
                  </div>
                  {user.role === "student" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="grade" className="font-bold">Grade Level</Label>
                        <Input 
                          id="grade" 
                          value={grade} 
                          onChange={(e) => setGrade(e.target.value)} 
                          className="bg-white/5 border-white/20 h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="schoolClass" className="font-bold">School Class</Label>
                        <Input 
                          id="schoolClass" 
                          value={schoolClass} 
                          onChange={(e) => setSchoolClass(e.target.value)} 
                          className="bg-white/5 border-white/20 h-11"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end pt-4">
                  <Button 
                    type="submit" 
                    className="font-bold px-8 premium-gradient"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Form */}
          {user.loginMethod !== 'google' && (
            <Card className="glass-card border-white/20 rounded-2xl">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Lock size={20} className="text-primary" />
                  Security
                </CardTitle>
                <CardDescription>Update your password to keep your account secure.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="currentPassword" className="font-bold">Current Password</Label>
                    <Input 
                      id="currentPassword" 
                      type="password" 
                      value={currentPassword} 
                      onChange={(e) => setCurrentPassword(e.target.value)} 
                      className="bg-white/5 border-white/20 h-11"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="font-bold">New Password</Label>
                      <Input 
                        id="newPassword" 
                        type="password" 
                        value={newPassword} 
                        onChange={(e) => setNewPassword(e.target.value)} 
                        className="bg-white/5 border-white/20 h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="font-bold">Confirm New Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        className="bg-white/5 border-white/20 h-11"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button 
                      type="submit" 
                      variant="outline"
                      className="font-bold px-8 glass-card border-white/20 hover:bg-white/10"
                      disabled={updatePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                    >
                      {updatePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
