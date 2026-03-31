import bankOfAmericaLogo from '../../../account logos/bank-of-america-4-logo-png-transparent.png';
import cashAppLogo from '../../../account logos/Cash_App_Logo.png';
import paypalLogo from '../../../account logos/Paypal_Logo.png';
import venmoLogo from '../../../account logos/Venmo_logo.png';

export type PresetLogoOption = {
  id: string;
  label: string;
  src: string;
};

export const ACCOUNT_LOGO_OPTIONS: PresetLogoOption[] = [
  {
    id: 'bank-of-america',
    label: 'Bank of America',
    src: bankOfAmericaLogo
  },
  {
    id: 'cash-app',
    label: 'Cash App',
    src: cashAppLogo
  },
  {
    id: 'paypal',
    label: 'PayPal',
    src: paypalLogo
  },
  {
    id: 'venmo',
    label: 'Venmo',
    src: venmoLogo
  }
];
