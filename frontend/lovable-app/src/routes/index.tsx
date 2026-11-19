import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "@/features/sutrai/overview";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SutrAI — Commerce overview" },
      {
        name: "description",
        content:
          "A clearer view of e-commerce operations with SutrAI. Explore labeled sample analytics and ask business questions.",
      },
      { property: "og:title", content: "SutrAI — Commerce overview" },
      {
        property: "og:description",
        content: "Your commerce, in focus. An AI analysis workspace for e-commerce operations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});