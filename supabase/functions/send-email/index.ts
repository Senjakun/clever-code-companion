import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: 'none' | 'tls' | 'starttls';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get SMTP configuration from database
    const { data: smtpData, error: smtpError } = await supabase
      .from("api_keys")
      .select("key_value")
      .eq("key_name", "smtp_config")
      .single();

    if (smtpError || !smtpData) {
      console.error("SMTP config error:", smtpError);
      return new Response(
        JSON.stringify({ error: "SMTP configuration not found" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const smtpConfig: SmtpConfig = JSON.parse(smtpData.key_value);

    if (!smtpConfig.enabled) {
      return new Response(
        JSON.stringify({ error: "SMTP is not enabled" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate SMTP config
    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.from_email) {
      return new Response(
        JSON.stringify({ error: "SMTP configuration is incomplete" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, subject, html, text }: EmailRequest = await req.json();

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending email to: ${to}, subject: ${subject}`);
    console.log(`SMTP Host: ${smtpConfig.host}:${smtpConfig.port}`);

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: smtpConfig.host,
        port: smtpConfig.port,
        tls: smtpConfig.encryption === 'tls',
        auth: smtpConfig.username ? {
          username: smtpConfig.username,
          password: smtpConfig.password,
        } : undefined,
      },
    });

    // Prepare recipients
    const recipients = Array.isArray(to) ? to : [to];

    // Send email
    await client.send({
      from: smtpConfig.from_name 
        ? `${smtpConfig.from_name} <${smtpConfig.from_email}>`
        : smtpConfig.from_email,
      to: recipients,
      subject: subject,
      content: text || "",
      html: html || undefined,
    });

    await client.close();

    console.log("Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send email" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
