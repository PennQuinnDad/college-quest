import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("colleges")
      .select("name, city, state, type, description")
      .eq("id", id)
      .single();

    if (!data) {
      return { title: "College Not Found | College Quest" };
    }

    const title = `${data.name} | College Quest`;
    const description =
      data.description ||
      `Learn about ${data.name} in ${data.city}, ${data.state}. View tuition, acceptance rate, programs, and more.`;

    return {
      title,
      description,
      openGraph: {
        title: data.name,
        description,
        type: "website",
      },
    };
  } catch {
    return { title: "College Quest" };
  }
}

export default function CollegeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
