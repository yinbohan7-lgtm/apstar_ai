import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

let templateBase64Cache: string | null = null;

function getTemplateBuffer(): Buffer {
  const filePath = join(process.cwd(), "public", "unnamed.jpg");
  return readFileSync(filePath);
}

function getTemplateBase64(): string {
  if (templateBase64Cache) return templateBase64Cache;
  const buffer = getTemplateBuffer();
  templateBase64Cache = buffer.toString("base64");
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

    const stabilityKey = process.env.STABILITY_API_KEY;
    if (!stabilityKey) {
      return NextResponse.json(
        { error: "Stability AI API not configured" },
        { status: 503 }
      );
    }

    const rawBase64 = imageBase64.startsWith("data:")
      ? imageBase64.split(",")[1]
      : imageBase64;

    const userImageBuffer = Buffer.from(rawBase64, "base64");

    const prompt =
      "A photorealistic portrait of the exact same person from the reference photo, " +
      "wearing a white NASA spacesuit with helmet off, inside a spacecraft cockpit, " +
      "preserving the person's precise facial features: exact eye shape, eye color, " +
      "eyebrow shape, nose bridge, nose tip, lip shape, jawline, cheekbones, skin tone, " +
      "skin texture, facial hair, and any distinctive facial marks. " +
      "The face must be identical to the reference image. " +
      "Cinematic lighting, highly detailed, 8k resolution, professional photography.";

    const negativePrompt =
      "different face, altered features, changed identity, blurry face, deformed face, " +
      "ugly, distorted, low quality, cartoon, anime, painting, illustration, " +
      "different person, face change, morphed";

    const formData = new FormData();
    formData.append(
      "init_image",
      new Blob([userImageBuffer], { type: "image/jpeg" }),
      "face.jpg"
    );
    formData.append("init_image_mode", "IMAGE_STRENGTH");
    formData.append("image_strength", "0.3");
    formData.append("text_prompts[0][text]", prompt);
    formData.append("text_prompts[0][weight]", "1");
    formData.append("text_prompts[1][text]", negativePrompt);
    formData.append("text_prompts[1][weight]", "-1");
    formData.append("cfg_scale", "10");
    formData.append("samples", "1");
    formData.append("steps", "40");
    formData.append("style_preset", "photographic");

    const stabilityResponse = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stabilityKey}`,
          Accept: "application/json",
        },
        body: formData,
      }
    );

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text();
      console.error("Stability AI error:", stabilityResponse.status, errorText);

      let friendlyError = `Image generation failed (${stabilityResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) friendlyError = errorJson.message;
        else if (errorJson.errors) friendlyError = errorJson.errors.join(", ");
      } catch {}

      return NextResponse.json({ error: friendlyError }, { status: 500 });
    }

    const result = await stabilityResponse.json();
    const artifact = result?.artifacts?.[0];

    if (!artifact?.base64) {
      return NextResponse.json(
        { error: "No image returned from Stability AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageBase64: `data:image/png;base64,${artifact.base64}`,
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
