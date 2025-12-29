import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthNotificationRequest {
  type: 'signup' | 'login';
  user_email: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, user_email, user_id }: AuthNotificationRequest = await req.json();

    if (!type || !user_email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, user_email" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get app name from settings (or use default)
    const { data: appNameData } = await supabase
      .from("api_keys")
      .select("key_value")
      .eq("key_name", "app_name")
      .single();

    const appName = appNameData?.key_value || "Our App";

    // Get user name from profile if available
    let userName = user_email.split('@')[0];
    if (user_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", user_id)
        .single();
      
      if (profileData?.email) {
        userName = profileData.email.split('@')[0];
      }
    }

    // Determine template and variables based on type
    let template: string;
    let variables: Record<string, string>;

    if (type === 'signup') {
      template = 'welcome';
      variables = {
        app_name: appName,
        user_name: userName,
        user_email: user_email,
      };
    } else if (type === 'login') {
      template = 'login_notification';
      variables = {
        app_name: appName,
        user_name: userName,
        user_email: user_email,
        login_time: new Date().toLocaleString('id-ID', { 
          timeZone: 'Asia/Jakarta',
          dateStyle: 'full',
          timeStyle: 'short'
        }),
      };
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid notification type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending ${type} notification to: ${user_email}`);

    // Call send-email function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: user_email,
        template: template,
        variables: variables,
      },
    });

    if (error) {
      console.error("Error calling send-email:", error);
      // Don't fail the auth flow if email fails
      return new Response(
        JSON.stringify({ success: false, message: "Email notification failed but auth succeeded", error: error.message }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`${type} notification sent successfully`);

    return new Response(
      JSON.stringify({ success: true, message: `${type} notification sent` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in auth-notification:", error);
    // Don't fail - auth notifications are non-critical
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
