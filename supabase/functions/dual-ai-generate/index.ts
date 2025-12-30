import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Step 1: Gemini ANALYZES all code (context window besar untuk membaca semua file)
const GEMINI_ANALYZER_PROMPT = `Kamu adalah AI Code Analyzer dengan kemampuan membaca konteks yang sangat besar.

TUGAS UTAMA:
1. Baca dan pahami SELURUH kode yang diberikan
2. Identifikasi masalah logika, bug, error, dan potensi perbaikan
3. Analisis mendalam tentang apa yang salah dan mengapa
4. Jelaskan lokasi exact dari masalah (file, line, function)

FORMAT OUTPUT:
## 🔍 Masalah Ditemukan
- [Daftar masalah dengan lokasi spesifik]

## 🎯 Root Cause
- [Analisis penyebab utama]

## 💡 Rekomendasi
- [Langkah-langkah perbaikan yang diperlukan]

Gunakan bahasa Indonesia yang jelas dan teknis.`;

// Step 2: GPT-5 WRITES refined, efficient code fixes
const GPT_REFINER_PROMPT = `Kamu adalah AI Code Refiner yang ahli menulis kode yang bersih dan efisien.

TUGAS: Berdasarkan analisis yang diberikan, tulis kode perbaikan yang:
1. Memperbaiki SEMUA masalah yang teridentifikasi
2. Mengikuti best practices TypeScript/React
3. Bersih, readable, dan well-documented
4. Efficient dan maintainable

FORMAT OUTPUT - WAJIB:
Untuk setiap file yang perlu diubah, gunakan format EXACT ini:

===FILE: path/to/file.tsx===
\`\`\`tsx
// Kode lengkap yang diperbaiki
\`\`\`
===END_FILE===

PENTING:
- Tulis kode LENGKAP, bukan snippet/potongan
- Sertakan SEMUA import yang diperlukan
- Pastikan kode langsung bisa dijalankan
- Gunakan TypeScript strict mode
- Gunakan Tailwind CSS untuk styling`;

interface Message {
  role: string;
  content: string;
}

async function callLovableAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: Message[]
): Promise<string> {
  console.log(`Calling Lovable AI: ${model}`);
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`AI API error (${response.status}):`, error);
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, currentCode, errorMessage, mode = "dual" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Lovable AI not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Models sesuai alur: Gemini analyze → GPT refine
    const analyzerModel = "google/gemini-2.5-flash"; // Context window besar untuk analisis
    const refinerModel = "openai/gpt-5"; // Menulis kode perbaikan

    const encoder = new TextEncoder();

    // Build context: Kode Saat Ini + Pesan Error + Instruksi User
    const userInstruction = messages[messages.length - 1]?.content || "Perbaiki kode ini";
    const contextForAnalysis = `
## 📝 Instruksi User
${userInstruction}

${errorMessage ? `## ❌ Pesan Error\n\`\`\`\n${errorMessage}\n\`\`\`` : ""}

## 📁 Kode Saat Ini
${currentCode || "Tidak ada kode yang diberikan"}
`;

    // Single modes
    if (mode === "analyze-only") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: analyzerModel,
          messages: [
            { role: "system", content: GEMINI_ANALYZER_PROMPT },
            { role: "user", content: contextForAnalysis },
          ],
          stream: true,
        }),
      });

      if (!response.ok) throw new Error("Analyzer AI failed");
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    if (mode === "refine-only") {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: refinerModel,
          messages: [
            { role: "system", content: GPT_REFINER_PROMPT },
            { role: "user", content: contextForAnalysis },
          ],
          stream: true,
        }),
      });

      if (!response.ok) throw new Error("Refiner AI failed");
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ========================================
    // DUAL MODE: Gemini Analyzes → GPT Refines
    // ========================================
    console.log("=== DUAL AI PIPELINE ===");
    console.log("Step 1: Gemini 2.5 Flash (Analyzer)");
    console.log("Step 2: GPT-5 (Refiner)");

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // === PHASE 1: GEMINI ANALYSIS ===
          const phase1Header = "## 🔍 Fase 1: Analisis (Gemini)\n\n*Gemini membaca seluruh file dan mencari kesalahan logika...*\n\n";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: phase1Header } }] })}\n\n`));

          console.log("Calling Gemini for analysis...");
          const analysis = await callLovableAI(
            LOVABLE_API_KEY,
            analyzerModel,
            GEMINI_ANALYZER_PROMPT,
            [{ role: "user", content: contextForAnalysis }]
          );
          console.log("Analysis complete, length:", analysis.length);

          // Stream analysis dengan efek typing
          const chunkSize = 30;
          for (let i = 0; i < analysis.length; i += chunkSize) {
            const chunk = analysis.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
            await new Promise(r => setTimeout(r, 5));
          }

          // === PHASE 2: GPT REFINEMENT ===
          const phase2Header = "\n\n---\n\n## ✨ Fase 2: Perbaikan Kode (GPT-5)\n\n*GPT-5 menulis potongan kode perbaikan yang lebih efisien...*\n\n";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: phase2Header } }] })}\n\n`));

          // Build context untuk GPT dengan hasil analisis
          const refineContext = `
Berdasarkan analisis berikut, tulis kode perbaikan LENGKAP:

## Hasil Analisis
${analysis}

## Kode Asli
${currentCode || "Tidak ada kode"}

## Instruksi User
${userInstruction}

Tulis kode perbaikan dengan format yang benar (===FILE: path===).
`;

          console.log("Calling GPT-5 for refinement...");
          const refinedCode = await callLovableAI(
            LOVABLE_API_KEY,
            refinerModel,
            GPT_REFINER_PROMPT,
            [{ role: "user", content: refineContext }]
          );
          console.log("Refinement complete, length:", refinedCode.length);

          // Stream refined code
          for (let i = 0; i < refinedCode.length; i += chunkSize) {
            const chunk = refinedCode.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
            await new Promise(r => setTimeout(r, 5));
          }

          // === COMPLETE ===
          const completeMsg = "\n\n---\n\n✅ **Dual AI Pipeline Selesai!** Kode telah dianalisis oleh Gemini dan diperbaiki oleh GPT-5.";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: completeMsg } }] })}\n\n`));

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Dual AI Pipeline error:", error);
          const errorMsg = `\n\n❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: errorMsg } }] })}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Request error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
