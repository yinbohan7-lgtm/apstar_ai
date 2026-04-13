import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { imageBase64, userName, targetImageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Missing imageBase64 parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userName) {
      return new Response(
        JSON.stringify({ error: "Missing userName parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const segmindApiKey = Deno.env.get("SEGMIND_API_KEY");
    if (!segmindApiKey) {
      return new Response(
        JSON.stringify({ error: "Face swap service not configured (SEGMIND_API_KEY)" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetImageBase64) {
      return new Response(
        JSON.stringify({ error: "Missing targetImageBase64 (template image)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const targetBase64 = targetImageBase64.includes(",") ? targetImageBase64.split(",")[1] : targetImageBase64;

    const segmindResponse = await fetch("https://api.segmind.com/v1/faceswap-v2", {
      method: "POST",
      headers: {
        "x-api-key": segmindApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_img: `data:image/jpeg;base64,${sourceBase64}`,
        target_img: `data:image/jpeg;base64,${targetBase64}`,
        input_faces_index: "0",
        source_faces_index: "0",
        face_restore: "codeformer-v0.1.0.pth",
        base64: true,
      }),
    });

    if (!segmindResponse.ok) {
      const errorText = await segmindResponse.text();
      console.error("Segmind API error:", segmindResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `Face swap failed: ${segmindResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = segmindResponse.headers.get("content-type") || "";
    let resultBase64: string;

    if (contentType.includes("application/json")) {
      const json = await segmindResponse.json();
      if (json.image) {
        resultBase64 = json.image;
      } else if (json.output) {
        resultBase64 = json.output;
      } else {
        return new Response(
          JSON.stringify({ error: "No image in face swap response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const arrayBuffer = await segmindResponse.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      resultBase64 = btoa(binary);
    }

    const prefix = resultBase64.startsWith("data:") ? "" : "data:image/png;base64,";

    return new Response(
      JSON.stringify({
        imageBase64: `${prefix}${resultBase64}`,
        userName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
