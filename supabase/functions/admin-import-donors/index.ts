import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing Supabase environment variables.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Verify caller identity
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Strict UUID-only caller authorization check against public.users
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, status')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Caller is not a registered staff member.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (callerProfile.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Your staff account is suspended or inactive.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only super_admin, admin, moderator are allowed
    if (!['super_admin', 'admin', 'moderator'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only Super Admin, Admin, and Moderator can import donors.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { filename, donors, skippedDetails } = await req.json();

    if (!filename || !Array.isArray(donors)) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: Invalid payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute import batch logic via RPC or service-role insert
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('admin_import_donors_batch', {
      p_filename: filename,
      p_donors: donors,
      p_skipped_details: skippedDetails || [],
    });

    if (rpcError) {
      return new Response(
        JSON.stringify({ error: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
