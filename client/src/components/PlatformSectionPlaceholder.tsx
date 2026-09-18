import Navigation from "./Navigation";

interface PlatformSectionPlaceholderProps {
  title: string;
  description: string;
}

export default function PlatformSectionPlaceholder({
  title,
  description,
}: PlatformSectionPlaceholderProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container flex min-h-[70vh] items-center justify-center px-6 py-24 text-center">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Tomorrow&apos;s Earth
          </p>
          <h1 className="text-4xl font-black tracking-tight text-foreground md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">{description}</p>
        </div>
      </main>
    </div>
  );
}