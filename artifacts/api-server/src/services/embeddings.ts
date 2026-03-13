export function buildSearchText(parts: {
  domain?: string;
  subdomain?: string;
  title?: string;
  symptoms?: string[];
  resolutionSteps?: string[];
  tags?: string[];
}): string {
  const sections = [
    parts.domain || "",
    parts.subdomain || "",
    parts.title || "",
    (parts.symptoms || []).join(" "),
    (parts.resolutionSteps || []).join(" "),
    (parts.tags || []).join(" "),
  ];
  return sections.filter(Boolean).join(" ").toLowerCase();
}
