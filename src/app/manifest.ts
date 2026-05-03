import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DailyQuest — plan, complete, earn",
    short_name: "DailyQuest",
    description:
      "Plan your day, build streaks, and earn redeemable rewards for completing tasks.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b10",
    theme_color: "#7c5cff",
    categories: ["productivity", "lifestyle", "health"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
