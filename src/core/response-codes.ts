/**
 * TerraPay validation response codes (RC100–RC161) and their status messages.
 * Use {@link getResponseMessage} to resolve a code to a human-readable message.
 */
export const RESPONSE_CODES: Readonly<Record<string, string>> = {
  RC100: 'A mandatory parameter is missing. Please ensure all required fields are provided.',
  RC101: 'One or more fields do not meet the expected length. Please verify and correct them.',
  RC102: 'The input provided is invalid. Please check the field values and try again.',
  RC103: 'The subscription is inactive. Validation cannot proceed until it is activated.',
  RC104: 'No routing found for the request. Please retry later.',
  RC105: 'The selected bank is not supported for validation. Please choose a valid bank.',
  RC106: 'Directory configuration issue detected. Please contact support for resolution.',
  RC107: 'The provided mobile number could not be found. Please check and re-enter.',
  RC108: 'The request format is invalid. Please check the structure and required parameters.',
  RC109: 'Authentication failed. Please verify credentials and try again.',
  RC110: 'The destination country is currently inactive for validation.',
  RC111: 'The destination country is under sanctions. Validation is not permitted.',
  RC112: 'The specified corridor does not exist.',
  RC113: "The beneficiary's mobile number is blacklisted and cannot be validated.",
  RC114: 'The mobile number provided for the beneficiary failed validation.',
  RC115: 'Beneficiary KYC not verified at the destination partner hence cannot be validated.',
  RC116: "The beneficiary's mobile number is suspended and cannot be validated.",
  RC117: "The beneficiary's name does not match the records.",
  RC118:
    'Validation could not be completed due to a timeout at the destination partner. Please retry later.',
  RC119: 'Mandatory KYC parameters are missing. Please provide all required details.',
  RC120: "The beneficiary's KYC level is insufficient for validation.",
  RC121:
    "The beneficiary's KYC verification is pending. Please wait until verification is complete.",
  RC122: "The beneficiary's name is missing. Please provide the full name to proceed.",
  RC123: 'The beneficiary is not registered. Please complete registration to proceed.',
  RC124: 'Validation is pending. Awaiting callback response from the destination system.',
  RC125: "The beneficiary's account is locked and cannot be validated.",
  RC126: 'The beneficiary is not responding to validation requests. Please retry later.',
  RC127: 'Validation request timed out at the destination partner. Please try again later.',
  RC128: 'The mobile number provided is invalid. Please check and re-enter.',
  RC129: 'The beneficiary is barred from receiving transactions. Validation cannot proceed.',
  RC130: "The beneficiary's account is inactive and cannot be validated.",
  RC131: 'Provider code is missing. Please provide the required information.',
  RC132:
    'The provider code does not match the expected operator network. Please verify and try again.',
  RC133: 'The UPI ID format is invalid. Please enter a valid UPI ID.',
  RC134: 'The IFSC code provided is incorrect. Please verify and try again.',
  RC135: 'This is Non-Resident External account, not eligible for validation.',
  RC136: 'The account could not be validated.',
  RC137: 'Validation failed due to IMPS node failure. Please retry later.',
  RC138: 'Unable to process the validation request at this time. Please try again later.',
  RC139: 'Received an invalid response code during validation. Please retry.',
  RC140: 'The sort code provided is invalid. Please verify and try again.',
  RC141: 'Account type is missing or not specified. Please provide the required information.',
  RC142: 'The document type provided for the beneficiary is invalid or unsupported.',
  RC143: 'The beneficiary does not meet the minimum age requirement for validation.',
  RC144: 'The beneficiary has exceeded the allowed amount limit for validation.',
  RC145: "The sender does not comply with the partner's policies. Validation cannot proceed.",
  RC146: "The receiver does not comply with the partner's policies. Validation cannot proceed.",
  RC147: "The sender's country is not supported under the partner's policies.",
  RC148: 'The beneficiary has not accepted automatic payments.',
  RC149: 'The destination bank is not configured for validation.',
  RC150: 'The bank account number is invalid. Please recheck the details.',
  RC151: 'Validation timed out at the bank. Please retry later.',
  RC152: 'Validation failed at the destination partner. Please verify the partner details.',
  RC153: 'The bank sub-code provided is invalid or not recognized.',
  RC154: "The beneficiary's name could not be verified. Please check and try again.",
  RC155: 'The PAN provided for the beneficiary is invalid or not found.',
  RC156: 'The source partner is inactive. Validation cannot proceed.',
  RC157: "The source partner's validity check failed. Please verify partner credentials.",
  RC158: 'The source partner is suspended. Validation is temporarily disabled.',
  RC159: 'The source partner is invalid. Please verify the partner details.',
  RC160: 'Unable to connect to the destination network.',
  RC161: 'Network read timed out. Please retry the request.',
};

/** A known TerraPay validation response code, e.g. 'RC117'. */
export type ResponseCode = keyof typeof RESPONSE_CODES;

/**
 * Resolves a TerraPay response code to its status message.
 * Returns `undefined` if the code is unknown.
 */
export function getResponseMessage(code: string): string | undefined {
  return RESPONSE_CODES[code];
}
