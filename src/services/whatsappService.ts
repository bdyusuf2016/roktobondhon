/**
 * WhatsApp Messaging Integration Service
 * Generates direct chat links with formatted Bangladeshi numbers and contextual messages.
 */

/**
 * Format a Bangladeshi or international phone number into standard international format for WhatsApp wa.me URLs.
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';

  if (digits.startsWith('880')) {
    return digits;
  }
  if (digits.startsWith('0')) {
    return `88${digits}`;
  }
  if (digits.startsWith('1') && digits.length === 10) {
    return `880${digits}`;
  }
  return digits;
}

export interface DonorWhatsAppParams {
  name?: string;
  phone: string;
  bloodGroup?: string;
  upazila?: string;
  district?: string;
}

/**
 * Generate a WhatsApp chat URL to contact a donor with a respectful, pre-filled blood request message.
 */
export function getDonorWhatsAppLink(donor: DonorWhatsAppParams): string {
  const formattedPhone = formatWhatsAppNumber(donor.phone);
  if (!formattedPhone) return '#';

  const donorName = donor.name ? `${donor.name} ভাই` : 'ভাই';
  const groupText = donor.bloodGroup ? `${donor.bloodGroup} ` : '';
  const locationText = donor.upazila ? ` (${donor.upazila})` : '';

  const message = `আসসালামু আলাইকুম ${donorName},\nরক্ত দান পরিবার কালামপুর প্ল্যাটফর্ম থেকে যোগাযোগ করছি। একজন মুমূর্ষু রোগীর জন্য জরুরি ${groupText}রক্ত প্রয়োজন${locationText}।\n\nআপনি কি এই মুহূর্তে রক্তদানে সহায়তা করতে পারবেন? অনুগ্রহ করে জানালে চিরকৃতজ্ঞ থাকব।`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

export interface RequestWhatsAppParams {
  patientName?: string;
  bloodGroup: string;
  hospital?: string;
  contactNumber: string;
  requiredUnits?: number;
  area?: string;
  upazila?: string;
}

/**
 * Generate a WhatsApp chat URL for a potential donor/volunteer to contact a blood requester.
 */
export function getRequestWhatsAppLink(req: RequestWhatsAppParams): string {
  const formattedPhone = formatWhatsAppNumber(req.contactNumber);
  if (!formattedPhone) return '#';

  const patientText = req.patientName ? ` (রোগী: ${req.patientName})` : '';
  const hospitalText = req.hospital ? ` (${req.hospital})` : '';

  const message = `আসসালামু আলাইকুম,\nরক্ত দান পরিবার কালামপুর প্ল্যাটফর্মে আপনার জরুরি ${req.bloodGroup} রক্তের আবেদনটি${patientText}${hospitalText} দেখেছি।\n\nআমি রক্তদানে সহায়তা করতে আগ্রহী। অনুগ্রহ করে রোগীর বর্তমান অবস্থা ও করণীয় জানালে দ্রুত উপস্থিত হতে পারি।`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
