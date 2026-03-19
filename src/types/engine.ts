export type ProvenanceStatus = 
  | 'matched_from_verified_program' 
  | 'extracted_from_document' 
  | 'estimated_from_rule' 
  | 'unresolved';

export interface ProvenanceField<T> {
  value: T | null;
  provenance_status: ProvenanceStatus;
  disclosure_required: boolean;
  isGlobal?: boolean;
}

export interface FinancialData {
  make: string;
  model: string;
  trim: string;
  msrp: ProvenanceField<number>;
  salePrice: ProvenanceField<number>;
  residualValue: ProvenanceField<number>;
  moneyFactor: ProvenanceField<number>;
  term: ProvenanceField<number>;
  docFee: ProvenanceField<number>;
  dmvFee: ProvenanceField<number>;
  taxMonthly: ProvenanceField<number>;
  monthlyPayment: ProvenanceField<number>;
  acquisitionFee: ProvenanceField<number>;
  rebates: ProvenanceField<number>;
  hunterDiscount: ProvenanceField<number>;
  manufacturerRebate: ProvenanceField<number>;
  msdCount?: number;
}

export type CalcMode = 'EXACT_CONTRACT' | 'ADVERTISED' | 'ESTIMATE';
export type PublishMode = 'EXACT_MATCH' | 'ADVERTISED_WITH_ASSUMPTIONS' | 'NOT_ELIGIBLE';

export interface PublishEligibility {
  is_publishable: boolean;
  publish_mode: PublishMode;
  mandatory_disclaimers: string[];
  calculator_reuse_eligible: boolean;
  blocking_reasons: string[];
  markups?: {
    mf_markup?: number;
    rv_markup?: number;
    apr_markup?: number;
    hidden_fees?: number;
  };
}
