import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage } from "@/components/ErrorMessage";
import { projectSettingsSchema } from "@/types/forms";
import type { z } from "zod";

type ProjectSettingsValues = z.infer<typeof projectSettingsSchema>;

export default function Settings() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectSettingsValues>({
    resolver: zodResolver(projectSettingsSchema),
    defaultValues: { name: "Urban Garden Co", domain: "urbangarden.co", status: "active" },
  });

  const onSubmit = () => undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" {...register("name")} />
            {errors.name ? <ErrorMessage message={errors.name.message ?? ""} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" {...register("domain")} />
            {errors.domain ? <ErrorMessage message={errors.domain.message ?? ""} /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Input id="status" {...register("status")} />
            {errors.status ? <ErrorMessage message={errors.status.message ?? ""} /> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Automation runs daily at 8:00 AM with adaptive monitoring.</p>
          <Button variant="outline" type="button">
            Edit schedule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Model: Gemini 2.0 Flash · Temperature: 0.6</p>
          <Button variant="outline" type="button">
            Adjust model
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting a project will remove pages, rankings, and automation history.
          </p>
          <Button variant="destructive" type="button">
            Delete project
          </Button>
        </CardContent>
      </Card>

      <Button type="submit">Save changes</Button>
    </form>
  );
}
