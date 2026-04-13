import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

let templateBase64Cache: string | null = null;

function getTemplateBase64(): string {
  if (templateBase64Cache) return templateBase64Cache;
  const filePath = join(process.cwd(), "public", "unnamed.jpg");
  const buffer = readFileSync(filePath);
  templateBase64Cache = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  return templateBase64Cache;
}

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, userName } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
    }

    if (!userName || typeof userName !== "string") {
      return NextResponse.json({ error: "Missing userName" }, { status: 400 });
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: "Fal.ai API not configured" },
        { status: 503 }
      );
    }

    const templateDataUri = getTemplateBase64();

    const userImageDataUri = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    const falResponse = await fetch("https://fal.run/fal-ai/face-swap", {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base_image_url: templateDataUri,
        swap_image_url: userImageDataUri,
      }),
    });

    if (!falResponse.ok) {
      const errorText = await falResponse.text();
      console.error("Fal.ai API error:", falResponse.status, errorText);

      let friendlyError = `Face swap failed (${falResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.detail) friendlyError = typeof errorJson.detail === "string"
          ? errorJson.detail
          : JSON.stringify(errorJson.detail);
      } catch {}

      return NextResponse.json({ error: friendlyError }, { status: 500 });
    }

    const result = await falResponse.json();
    const imageUrl = result?.image?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image returned from face swap" },
        { status: 500 }
      );
    }

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to download generated image" },
        { status: 500 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/png";
    const mimeType = contentType.includes("image/") ? contentType.split(";")[0] : "image/png";
    const resultBase64 = Buffer.from(imageBuffer).toString("base64");

    return NextResponse.json({
      imageBase64: `data:${mimeType};base64,${resultBase64}`,
      userName,
    });
  } catch (err) {
    console.error("API route error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
