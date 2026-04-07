import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Navigation from "@/components/Navigation";
import { AlertCircle, CheckCircle, Eye, EyeOff, User, Loader } from "lucide-react";
import { useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain uppercase, lowercase, and numbers";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrors({});

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      });

      if (error) throw error;

      const user = data.user;
      if (user) {
        localStorage.setItem("mock-user", JSON.stringify({
          id: user.id,
          openId: user.id,
          email: user.email ?? "",
          name: formData.fullName,
          role: "visitor",
        }));
      }

      setSuccessMessage("Account created! Redirecting you to choose your portal...");
      setTimeout(() => setLocation("/choose-role"), 1500);
    } catch (err: any) {
      setErrors({
        general: err.message || "Registration failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-leaf-green/20 via-background to-background flex flex-col">
      <Navigation />

      <div className="flex-1 container flex items-center justify-center py-12">
        <div className="w-full max-w-lg animate-scaleIn">
          <Card className="glass-card border-white/20 shadow-2xl overflow-hidden">
            <CardHeader className="text-center pt-10 pb-6">
              <div className="flex justify-center mb-6">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-leaf-green to-digital-cyan rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500" />
                  <div className="relative glass-card p-4 rounded-full border-white/40">
                    <User className="h-10 w-10 text-primary" />
                  </div>
                </div>
              </div>
              <CardTitle className="text-3xl font-extrabold tracking-tight hero-text-glow text-foreground">
                Join the Movement
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2 font-medium">
                Create your account for Tomorrow's Earth Expo 2026
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-10 space-y-8">
              {successMessage && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-start gap-3 animate-fadeIn">
                  <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-primary font-semibold text-sm">{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="bg-white/50 border-border h-12"
                    />
                    {errors.fullName && <p className="text-destructive text-[10px] ml-1 font-bold">{errors.fullName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Email Address"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-white/50 border-border h-12"
                    />
                    {errors.email && <p className="text-destructive text-[10px] ml-1 font-bold">{errors.email}</p>}
                  </div>

                  {formData.role === "teacher" && (
                    <div className="space-y-2 animate-fadeIn">
                      <Input
                        id="subject"
                        name="subject"
                        placeholder="Subject (e.g. Science, Technology)"
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="bg-white/50 border-border h-12"
                      />
                      {errors.subject && <p className="text-destructive text-[10px] ml-1 font-bold">{errors.subject}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="bg-white/50 border-border h-12"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <div className="space-y-2 relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="bg-white/50 border-border h-12"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {errors.password && <p className="text-destructive text-[10px] ml-1 font-bold">{errors.password}</p>}
                  {errors.confirmPassword && <p className="text-destructive text-[10px] ml-1 font-bold">{errors.confirmPassword}</p>}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 premium-gradient text-white font-bold rounded-xl shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                </Button>
              </form>

              {errors.general && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-destructive text-[11px] font-bold">{errors.general}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground font-medium">
              Already a member?{" "}
              <Link href="/choose-role">
                <span className="text-primary hover:underline cursor-pointer font-bold">Sign in here</span>
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
