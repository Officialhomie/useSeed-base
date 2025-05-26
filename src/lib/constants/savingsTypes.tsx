export const SAVINGS_TOKEN_TYPES = {
    OUTPUT: 0,   
    INPUT: 1,    
    SPECIFIC: 2 
  } as const;
  
  export type SavingsTokenType = typeof SAVINGS_TOKEN_TYPES[keyof typeof SAVINGS_TOKEN_TYPES];
  