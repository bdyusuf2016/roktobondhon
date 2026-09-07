import { supabase, isSupabaseConfigured } from '../supabase/config';
import type {
  FundDonation,
  FundDisbursement,
  PaymentMethodConfig,
} from '../types';

function mapFundDonationRow(row: any): FundDonation {
  return {
    id: row.id,
    donorName: row.donor_name,
    donorPhone: row.donor_phone,
    donorEmail: row.donor_email || undefined,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    transactionId: row.transaction_id,
    accountNumber: row.account_number || undefined,
    fundCause: row.fund_cause || 'সাধারণ তহবিল',
    area: row.area || undefined,
    message: row.message || undefined,
    isAnonymous: Boolean(row.is_anonymous),
    status: row.status || 'pending',
    verifiedBy: row.verified_by || undefined,
    verifiedAt: row.verified_at || undefined,
    organizationId: row.organization_id || 'org-roktobondon',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapDisbursementRow(row: any): FundDisbursement {
  return {
    id: row.id,
    title: row.title,
    cause: row.cause,
    amount: Number(row.amount),
    recipient: row.recipient,
    area: row.area,
    approvedBy: row.approved_by,
    voucherNo: row.voucher_no || undefined,
    date: row.date,
    notes: row.notes || undefined,
  };
}

function mapPaymentMethodRow(row: any): PaymentMethodConfig {
  return {
    id: row.id,
    name: row.name,
    nameBn: row.name_bn,
    type: row.type,
    accountNumber: row.account_number,
    accountType: row.account_type || 'personal',
    instructionsBn: row.instructions_bn || '',
    qrCodeUrl: row.qr_code_url || undefined,
    isActive: Boolean(row.is_active),
  };
}

/**
 * Fetch all Fund Donations
 */
export async function getFundDonationsFromSupabase(): Promise<FundDonation[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('fund_donations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching fund donations from Supabase:', error);
      return [];
    }

    return (data || []).map(mapFundDonationRow);
  } catch (err) {
    console.error('Exception fetching fund donations:', err);
    return [];
  }
}

/**
 * Add a new fund donation record
 */
export async function addFundDonationToSupabase(
  donation: Omit<FundDonation, 'id' | 'createdAt' | 'status'>
): Promise<FundDonation> {
  const id = `fnd-${Date.now()}`;
  const item: FundDonation = {
    ...donation,
    id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fund_donations').insert({
        id: item.id,
        donor_name: item.donorName,
        donor_phone: item.donorPhone,
        donor_email: item.donorEmail || null,
        amount: item.amount,
        payment_method: item.paymentMethod,
        transaction_id: item.transactionId,
        account_number: item.accountNumber || null,
        fund_cause: item.fundCause,
        area: item.area || null,
        message: item.message || null,
        is_anonymous: item.isAnonymous,
        status: item.status,
        organization_id: item.organizationId || 'org-roktobondon',
        created_at: item.createdAt,
      });
    } catch (err) {
      console.error('Error inserting fund donation in Supabase:', err);
    }
  }

  return item;
}

/**
 * Verify fund donation
 */
export async function verifyFundDonationInSupabase(
  id: string,
  verifierName: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('fund_donations')
    .update({
      status: 'verified',
      verified_by: verifierName,
      verified_at: now,
    })
    .eq('id', id);

  if (error) {
    console.error('Error verifying fund donation in Supabase:', error);
  }
}

/**
 * Fetch all Fund Disbursements
 */
export async function getFundDisbursementsFromSupabase(): Promise<FundDisbursement[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('fund_disbursements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching disbursements from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDisbursementRow);
  } catch (err) {
    console.error('Exception fetching disbursements:', err);
    return [];
  }
}

/**
 * Add a new disbursement voucher
 */
export async function addFundDisbursementToSupabase(
  disbursement: Omit<FundDisbursement, 'id'>
): Promise<FundDisbursement> {
  const id = `disb-${Date.now()}`;
  const item: FundDisbursement = { ...disbursement, id };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('fund_disbursements').insert({
        id: item.id,
        title: item.title,
        cause: item.cause,
        amount: item.amount,
        recipient: item.recipient,
        area: item.area,
        approved_by: item.approvedBy,
        voucher_no: item.voucherNo || null,
        date: item.date,
        notes: item.notes || null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error inserting fund disbursement in Supabase:', err);
    }
  }

  return item;
}

/**
 * Delete a disbursement voucher
 */
export async function deleteFundDisbursementFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('fund_disbursements').delete().eq('id', id);
  if (error) {
    console.error('Error deleting disbursement from Supabase:', error);
  }
}

/**
 * Fetch Payment Methods Config
 */
export async function getPaymentMethodsFromSupabase(): Promise<PaymentMethodConfig[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase.from('payment_methods').select('*');
    if (error) {
      console.error('Error fetching payment methods from Supabase:', error);
      return [];
    }

    return (data || []).map(mapPaymentMethodRow);
  } catch (err) {
    console.error('Exception fetching payment methods:', err);
    return [];
  }
}

/**
 * Save / Update Payment Method
 */
export async function savePaymentMethodToSupabase(
  method: PaymentMethodConfig
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('payment_methods').upsert({
    id: method.id,
    name: method.name,
    name_bn: method.nameBn,
    type: method.type,
    account_number: method.accountNumber,
    account_type: method.accountType,
    instructions_bn: method.instructionsBn,
    qr_code_url: method.qrCodeUrl || null,
    is_active: method.isActive,
  });

  if (error) {
    console.error('Error saving payment method in Supabase:', error);
  }
}

/**
 * Delete Payment Method
 */
export async function deletePaymentMethodFromSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  if (error) {
    console.error('Error deleting payment method from Supabase:', error);
  }
}

// Backward-compatible aliases
export const getFundDonationsFromFirestore = getFundDonationsFromSupabase;
export const addFundDonationToFirestore = addFundDonationToSupabase;
export const verifyFundDonationInFirestore = verifyFundDonationInSupabase;
export const getFundDisbursementsFromFirestore = getFundDisbursementsFromSupabase;
export const addFundDisbursementToFirestore = addFundDisbursementToSupabase;
export const deleteFundDisbursementFromFirestore = deleteFundDisbursementFromSupabase;
export const getPaymentMethodsFromFirestore = getPaymentMethodsFromSupabase;
export const savePaymentMethodToFirestore = savePaymentMethodToSupabase;
export const deletePaymentMethodFromFirestore = deletePaymentMethodFromSupabase;
