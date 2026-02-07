import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useAuth } from "@/hooks/useAuth";
import { loginSchema } from "@/types/forms";
import type { z } from "zod";

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: true },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      await login(values.email, values.password);
      navigate("/app/dashboard");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" placeholder="you@company.com" type="email" {...register("email")} />
        {errors.email ? <ErrorMessage message={errors.email.message ?? ""} /> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...register("password")} />
        {errors.password ? <ErrorMessage message={errors.password.message ?? ""} /> : null}
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Controller
            name="remember"
            control={control}
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={(value) => field.onChange(value === true)}
              />
            )}
          />
          Remember me
        </label>
        <Link className="text-sm text-primary hover:underline" to="/auth/forgot-password">
          Forgot password?
        </Link>
      </div>
      {apiError ? <ErrorMessage message={apiError} /> : null}
      <Button type="submit" className="w-full" disabled={isLoading}>
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link className="text-primary hover:underline" to="/auth/signup">
          Create an account
        </Link>
      </p>
    </form>
  );
}
