export function generateBloodRequestId(sequenceNumber?: number): string {
  const year = new Date().getFullYear();
  const randomSuffix = sequenceNumber
    ? sequenceNumber.toString().padStart(6, '0')
    : Math.floor(100000 + Math.random() * 900000).toString();
  return `BD-${year}-${randomSuffix}`;
}

export function generateDonorId(locationCode: string = 'DHM', sequenceNumber?: number): string {
  const code = (locationCode || 'GEN').toUpperCase().slice(0, 3);
  const randomSuffix = sequenceNumber
    ? sequenceNumber.toString().padStart(6, '0')
    : Math.floor(100000 + Math.random() * 900000).toString();
  return `DNR-${code}-${randomSuffix}`;
}

export function getLocationCode(upazila?: string, district?: string): string {
  if (!upazila && !district) return 'DHM';
  const name = (upazila || district || '').toLowerCase();
  if (name.includes('dhamrai') || name.includes('ধামরাই')) return 'DHM';
  if (name.includes('savar') || name.includes('সাভার')) return 'SVR';
  if (name.includes('manikganj') || name.includes('মানিকগঞ্জ')) return 'MNK';
  if (name.includes('singair') || name.includes('সিংগাইর')) return 'SNG';
  if (name.includes('saturia') || name.includes('সাটুরিয়া')) return 'SAT';
  if (name.includes('dhaka') || name.includes('ঢাকা')) return 'DHK';
  return 'BD';
}

/**
 * Extracts the highest numeric sequence from a list of donors to prevent ID collisions.
 */
export function getNextSequenceFromDonors(donors: Array<{ donorId?: string }>): number {
  let maxSeq = 100;
  for (const d of donors) {
    if (!d.donorId) continue;
    const match = d.donorId.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  return maxSeq + 1;
}

