// Supabase Edge Function: admin-create-user
// Secure Server-Side User Creation for RoktoBondhon Admin Portal
// Follows strict RBAC and executes auth.admin.createUser with service_role privileges.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'volunteer' | 'donor' | 'recipient';
  branchId?: string;
  organizationId?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: missing credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Authenticate caller via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'অননুমোদিত অনুরোধ। অনুগ্রহ করে পুনরায় লগইন করুন।' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: callerAuth, error: authErr } = await supabaseAdmin.auth.getUser(token);

    if (authErr || !callerAuth.user) {
      return new Response(
        JSON.stringify({ error: 'সেশন মেয়াদোত্তীর্ণ হয়েছে। পুনরায় লগইন করুন।' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerId = callerAuth.user.id;

    // 2. Fetch caller profile from public.users to verify staff/admin privileges
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, status')
      .eq('id', callerId)
      .maybeSingle();

    if (profileErr || !callerProfile || callerProfile.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'সক্রিয় প্রশাসনিক অ্যাকাউন্ট পাওয়া যায়নি।' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerRole = callerProfile.role;
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'ব্যবহারকারী তৈরি করার প্রশাসনিক অনুমতি আপনার নেই।' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate request payload
    const body: CreateUserPayload = await req.json();
    const { fullName, email, phone, password, role, branchId, organizationId } = body;

    if (!fullName?.trim() || !email?.trim() || !phone?.trim() || !password) {
      return new Response(
        JSON.stringify({ error: 'নাম, ইমেইল, মোবাইল নম্বর এবং পাসওয়ার্ড আবশ্যক।' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'পাসওয়ার্ডটি যথেষ্ট শক্তিশালী নয় (কমপক্ষে ৬ অক্ষর প্রয়োজন)।' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Role Hierarchy & Privilege Escalation Guard
    // super_admin -> can assign: admin, moderator, volunteer, donor, recipient
    // admin       -> can assign: moderator, volunteer, donor, recipient
    // admin CANNOT assign super_admin or peer admin
    if (callerRole === 'admin') {
      if (role === 'super_admin' || role === 'admin') {
        return new Response(
          JSON.stringify({ error: 'আপনার এই ভূমিকার User তৈরি করার অনুমতি নেই (শুধুমাত্র সুপার এডমিন পারবেন)।' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // 5. Check if user with same email or phone already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, phone')
      .or(`email.ilike.${cleanEmail},phone.eq.${cleanPhone}`)
      .maybeSingle();

    if (existingUser) {
      if (existingUser.email?.toLowerCase() === cleanEmail) {
        return new Response(
          JSON.stringify({ error: 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট আছে।' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'এই মোবাইল নম্বর দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট আছে।' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Create User in Supabase Auth via auth.admin API with confirmed email
    const { data: authCreated, error: createAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        phone: cleanPhone,
      },
    });

    if (createAuthErr || !authCreated.user) {
      const errMsg = createAuthErr?.message || '';
      if (errMsg.toLowerCase().includes('already') || errMsg.toLowerCase().includes('exists')) {
        return new Response(
          JSON.stringify({ error: 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট আছে।' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Authentication account তৈরি করা যায়নি: ' + errMsg }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authCreated.user.id;

    // 7. Insert synchronized profile into public.users using exact auth.users.id
    const newUserRecord = {
      id: newUserId,
      full_name: fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role: role || 'volunteer',
      organization_id: organizationId || 'org-roktobondon',
      branch_id: branchId || 'br-dhm',
      status: 'active',
      phone_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: insertErr } = await supabaseAdmin
      .from('users')
      .insert(newUserRecord);

    // 8. Rollback / Atomicity: If public.users insert fails, delete created auth account
    if (insertErr) {
      console.error('Failed to create public.users profile, rolling back auth account:', insertErr);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: 'Authentication account তৈরি হয়েছে, কিন্তু User Profile তৈরি সম্পন্ন হয়নি।' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return the created user profile (sanitized, password never returned)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUserId,
          fullName: newUserRecord.full_name,
          email: newUserRecord.email,
          phone: newUserRecord.phone,
          role: newUserRecord.role,
          organizationId: newUserRecord.organization_id,
          branchId: newUserRecord.branch_id,
          status: newUserRecord.status,
          createdAt: newUserRecord.created_at,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in admin-create-user Edge Function:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'একটি অপ্রত্যাশিত সার্ভার ত্রুটি ঘটেছে।' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
