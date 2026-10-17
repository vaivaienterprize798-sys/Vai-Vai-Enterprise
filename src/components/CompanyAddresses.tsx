import React from 'react';
import { getCompanyAddressLines } from '../types';

/** Shows Corporate Office + Dokan addresses, one per line. Used in every print header. */
export const CompanyAddresses: React.FC<{ info: { address?: string; shopAddress?: string } | null | undefined }> = ({ info }) => (
  <>
    {getCompanyAddressLines(info).map((line, i) => (
      <span key={i} style={{ display: 'block' }}>{line}</span>
    ))}
  </>
);
