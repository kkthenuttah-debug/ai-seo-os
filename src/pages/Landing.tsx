import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  "Automated market research and niche discovery",
  "AI-powered site architecture and content generation",
  "WordPress publishing with Elementor layouts",
  "Continuous monitoring and self-healing optimizations",
];

const steps = [
  {
    title: "Connect your stack",
    description: "Link WordPress and Google Search Console in minutes.",
  },
  {
    title: "Launch automation",
    description: "AI agents design, build, and publish high-performing pages.",
  },
  {
    title: "Monitor growth",
    description: "Track rankings, leads, and health scores from one dashboard.",
  },
];

const testimonials = [
  {
    name: "Ava Tran",
    role: "Growth Lead",
    quote: "We cut content production time by 70% and doubled organic leads.",
  },
  {
    name: "James Park",
    role: "Agency Owner",
    quote: "The agent monitor keeps our client sites healthy without manual work.",
  },
];

export default function Landing() {
  return (
    <div className="bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="h-8 w-8 rounded-full bg-primary" />
          SEO Autopilot
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/auth/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              AI SEO Automation Platform
            </span>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Run your SEO program on autopilot.
            </h1>
            <p className="text-lg text-muted-foreground">
              Orchestrate research, content, publishing, and monitoring with a single AI-driven
              workflow. Launch new projects faster and scale organic growth effortlessly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/auth/signup">Start free trial</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth/login">View dashboard</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl border bg-card p-6 shadow-lg">
            <div className="space-y-4">
              <div className="rounded-2xl bg-muted/50 p-4">
                <p className="text-sm font-medium">Live automation feed</p>
                <p className="text-xs text-muted-foreground">Agent runs, publishing, and alerts.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {features.map((feature) => (
                  <div key={feature} className="rounded-xl border bg-background p-4 text-sm">
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
            {steps.map((step) => (
              <Card key={step.title}>
                <CardHeader>
                  <CardTitle>{step.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {step.description}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name}>
                <CardHeader>
                  <CardTitle>{testimonial.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  “{testimonial.quote}”
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} SEO Autopilot. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="/" className="hover:text-foreground">
              Privacy
            </a>
            <a href="/" className="hover:text-foreground">
              Terms
            </a>
            <a href="/" className="hover:text-foreground">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
