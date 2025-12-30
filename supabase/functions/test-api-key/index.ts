import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { provider, apiKey } = await req.json();

    if (!apiKey || !provider) {
      return new Response(
        JSON.stringify({ success: false, error: "API key and provider are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing ${provider} API key...`);

    if (provider === "gemini") {
      // Test Gemini API with a simple request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: "Say 'API key is valid' in exactly those words." }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 20,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Gemini API error:", errorData);
        
        let errorMessage = "Invalid API key or API error";
        if (errorData.includes("API_KEY_INVALID")) {
          errorMessage = "Invalid API key. Please check your Gemini API key.";
        } else if (errorData.includes("PERMISSION_DENIED")) {
          errorMessage = "Permission denied. Please enable the Generative Language API.";
        } else if (errorData.includes("QUOTA_EXCEEDED")) {
          errorMessage = "API quota exceeded. Please check your usage limits.";
        }
        
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      console.log("Gemini response:", responseText);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Gemini API key is valid!",
          model: "gemini-1.5-flash",
          response: responseText.substring(0, 100)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (provider === "openai") {
      // Test OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: "Say 'API key is valid' in exactly those words." }
          ],
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("OpenAI API error:", errorData);
        
        let errorMessage = "Invalid API key or API error";
        try {
          const parsed = JSON.parse(errorData);
          if (parsed.error?.code === "invalid_api_key") {
            errorMessage = "Invalid API key. Please check your OpenAI API key.";
          } else if (parsed.error?.code === "insufficient_quota") {
            errorMessage = "Insufficient quota. Please check your OpenAI billing.";
          } else if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // Use default error message
        }
        
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";
      
      console.log("OpenAI response:", responseText);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OpenAI API key is valid!",
          model: data.model || "gpt-4o-mini",
          response: responseText.substring(0, 100)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (provider === "deepseek") {
      // Test DeepSeek API (OpenAI-compatible)
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "user", content: "Say 'API key is valid' in exactly those words." }
          ],
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("DeepSeek API error:", errorData);
        
        let errorMessage = "Invalid API key or API error";
        try {
          const parsed = JSON.parse(errorData);
          if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // Use default error message
        }
        
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";
      
      console.log("DeepSeek response:", responseText);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "DeepSeek API key is valid!",
          model: data.model || "deepseek-chat",
          response: responseText.substring(0, 100)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (provider === "groq") {
      // Test Groq API (OpenAI-compatible)
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "user", content: "Say 'API key is valid' in exactly those words." }
          ],
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Groq API error:", errorData);
        
        let errorMessage = "Invalid API key or API error";
        try {
          const parsed = JSON.parse(errorData);
          if (parsed.error?.message) {
            errorMessage = parsed.error.message;
          }
        } catch (e) {
          // Use default error message
        }
        
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || "";
      
      console.log("Groq response:", responseText);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Groq API key is valid!",
          model: data.model || "llama-3.3-70b-versatile",
          response: responseText.substring(0, 100)
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Unknown provider. Use 'gemini', 'openai', 'deepseek', or 'groq'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Test API key error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
