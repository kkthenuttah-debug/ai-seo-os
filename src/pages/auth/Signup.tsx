import { Link, useNavigate } from "react-router-dom";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage } from "@/components/ErrorMessage";
import { useAuth } from "@/hooks/useAuth";
import { signupSchema } from "@/types/forms";
import type { z } from "zod";

type SignupFormValues = z.infer<typeof signupSchema>;

export default function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { terms: false },
  });

  const onSubmit = async (values: SignupFormValues) => {
    await signup(values.email, values.password, values.company);
    navigate("/app/dashboard");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="company">Company name</Label>
        <Input id="company" placeholder="Growth Ops Inc." {...register("company")} />
        {errors.company ? <ErrorMessage message={errors.company.message ?? ""} /> : null}
      </div>
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
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" {...register("confirmPassword")} />
        {errors.confirmPassword ? (
          <ErrorMessage message={errors.confirmPassword.message ?? ""} />
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Controller
          name="terms"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onCheckedChange={(value) => field.onChange(value === true)}
            />
          )}
        />
        <span className="text-sm text-muted-foreground">
          I agree to the{" "}
          <Link to="/" className="text-primary hover:underline">
            terms of service
          </Link>
        </span>
      </div>
      {errors.terms ? <ErrorMessage message={errors.terms.message ?? ""} /> : null}
      <Button type="submit" className="w-full" disabled={isLoading}>
        Create account
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="text-primary hover:underline" to="/auth/login">
          Sign in
        </Link>
      </p>
    </form>
  );
}
