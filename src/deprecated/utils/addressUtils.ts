/**
 * Truncates a blockchain address to a shorter form
 * @param address The full address to truncate
 * @param prefixLength Number of characters to show at the start
 * @param suffixLength Number of characters to show at the end
 * @returns Truncated address
 */
export const truncateAddress = (address: string, prefixLength: number = 6, suffixLength: number = 4): string => {
  if (!address) return '';
  if (address.length <= prefixLength + suffixLength) return address;
  
  const prefix = address.substring(0, prefixLength);
  const suffix = address.substring(address.length - suffixLength);
  
  return `${prefix}...${suffix}`;
}; 