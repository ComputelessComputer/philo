export const siteConfig = {
  name: "Philo",
  siteUrl: "https://philo.so",
  defaultTitle: "Philo: Experimental daily notes for personal context",
  defaultDescription:
    "Philo is an experimental proof of concept focused on daily notes and shaping native personal context inside fastrepl/char.",
  defaultImagePath: "/philo-hero-screenshot.svg",
  email: "john@hyprnote.com",
  repoUrl: "https://github.com/ComputelessComputer/philo",
} as const;

export function absoluteUrl(path: string,): string {
  return new URL(path, siteConfig.siteUrl,).toString();
}

export function withSiteName(title: string,): string {
  return title.includes(siteConfig.name,) ? title : `${title} | ${siteConfig.name}`;
}

export function buildHomeSchemas() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.siteUrl,
      description: siteConfig.defaultDescription,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      description: siteConfig.defaultDescription,
      url: siteConfig.siteUrl,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "macOS, Windows, Linux",
      image: absoluteUrl(siteConfig.defaultImagePath,),
      softwareHelp: absoluteUrl("/guides",),
      sameAs: [siteConfig.repoUrl,],
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];
}
