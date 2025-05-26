export const SAVINGS_TOKEN_TYPES = {
    INPUT: 0,    // Save from input token (before swap)
    OUTPUT: 1,   // Save from output token (after swap) 
    SPECIFIC: 2  // Save specific token
  } as const;
  
  export type SavingsTokenType = typeof SAVINGS_TOKEN_TYPES[keyof typeof SAVINGS_TOKEN_TYPES];
  