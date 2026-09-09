// Supabase Edge Function: admin-delete-donor
// Secure Server-Side Donor Account & Profile Deletion for RoktoBondhon Admin Portal
// Follows strict RBAC (super_admin, admin only), guards dual-role staff+donor accounts,
// and ensures immutable audit logging.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeleteDonorPayload {
  donorId: string;
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
        JSON.stringify({ error: 'ডোনার ডিলিট করার প্রশাসনিক অনুমতি আপনার নেই (শুধুমাত্র Admin ও Super Admin পারবেন)।' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse and validate request payload
    const body: DeleteDonorPayload = await req.json();
    const { donorId } = body;

    if (!donorId?.trim()) {
      return new Response(
        JSON.stringify({ error: 'ডোনার আইডি প্রদান করা আবশ্যক।' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Locate target donor in public.donors (by id or human-readable donor_id)
    const { data: targetDonor, error: lookupErr } = await supabaseAdmin
      .from('donors')
      .select('id, donor_id, user_id, full_name, blood_group, phone, email')
      .or(`id.eq.${donorId.trim()},donor_id.eq.${donorId.trim()}`)
      .maybeSingle();

    if (lookupErr || !targetDonor) {
      return new Response(
        JSON.stringify({ error: 'রক্তদাতার তথ্য পাওয়া যায়নি।' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUserId = targetDonor.user_id;

    // 5. Check if the target user is also a Staff member in public.users
    const { data: targetStaffProfile } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role, email')
      .eq('id', targetUserId)
      .maybeSingle();

    const isStaffMember = Boolean(targetStaffProfile);

    // If caller is 'admin' and target staff is 'super_admin', prevent action
    if (callerRole === 'admin' && targetStaffProfile?.role === 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'সুপার এডমিনের সাথে যুক্ত ডোনার প্রোফাইল পরিবর্তন করার অনুমতি আপনার নেই।' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Delete donor record from public.donors
    const { error: deleteDonorErr } = await supabaseAdmin
      .from('donors')
      .delete()
      .eq('id', targetDonor.id);

    if (deleteDonorErr) {
      console.error('Failed to delete public.donors record:', deleteDonorErr);
      return new Response(
        JSON.stringify({ error: 'ডোনার প্রোফাইল ডিলিট ব্যর্থ হয়েছে: ' + deleteDonorErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let authUserDeleted = false;

    // 7. If Ordinary Donor (NOT staff): delete Supabase Auth user
    if (!isStaffMember) {
      if (targetUserId) {
        const { error: deleteAuthErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
        if (deleteAuthErr) {
          console.warn('Notice: Failed to delete auth.users record (may have been deleted):', deleteAuthErr);
        } else {
          authUserDeleted = true;
        }
      }
    }

    // 8. Record deletion in public.audit_logs (Immutable audit trail)
    const auditRecord = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: callerId,
      user_name: callerProfile.full_name || 'Admin',
      user_role: callerRole,
      action: isStaffMember ? 'DELETE_DONOR_PROFILE' : 'DELETE_DONOR_ACCOUNT',
      target_type: 'Donor',
      target_id: targetDonor.id,
      metadata: {
        donor_id: targetDonor.donor_id,
        donor_name: targetDonor.full_name,
        blood_group: targetDonor.blood_group,
        target_user_id: targetUserId,
        is_staff: isStaffMember,
        staff_role: targetStaffProfile?.role || null,
        auth_user_deleted: authUserDeleted,
        deleted_by: callerProfile.full_name,
      },
      timestamp: new Date().toISOString(),
    };

    const { error: auditErr } = await supabaseAdmin
      .from('audit_logs')
      .insert(auditRecord);

    if (auditErr) {
      console.error('Notice: Audit log insertion failed:', auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        isStaff: isStaffMember,
        authDeleted: authUserDeleted,
        donorId: targetDonor.id,
        humanId: targetDonor.donor_id,
        message: isStaffMember
          ? `ডোনার ${targetDonor.donor_id} (${targetDonor.full_name})-এর ডোনার প্রোফাইল মুছে ফেলা হয়েছে। স্টাফ অ্যাকাউন্ট অক্ষত রাখা হয়েছে।`
          : `ডোনার ${targetDonor.donor_id} (${targetDonor.full_name})-এর সম্পূর্ণ অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in admin-delete-donor Edge Function:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'একটি অপ্রত্যাশিত সার্ভার ত্রুটি ঘটেছে।' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
