export interface CountryItem {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
}

export const COUNTRIES: CountryItem[] = [
  { code: 'IN', name: 'India', dial_code: '+91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dial_code: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dial_code: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dial_code: '+1', flag: '🇨🇦' },
  { code: 'AE', name: 'United Arab Emirates', dial_code: '+971', flag: '🇦🇪' },
  { code: 'AU', name: 'Australia', dial_code: '+61', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', dial_code: '+64', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', dial_code: '+65', flag: '🇸🇬' },
  { code: 'SA', name: 'Saudi Arabia', dial_code: '+966', flag: '🇸🇦' },
  { code: 'QA', name: 'Qatar', dial_code: '+974', flag: '🇶🇦' },
  { code: 'KW', name: 'Kuwait', dial_code: '+965', flag: '🇰🇼' },
  { code: 'BH', name: 'Bahrain', dial_code: '+973', flag: '🇧🇭' },
  { code: 'OM', name: 'Oman', dial_code: '+968', flag: '🇴🇲' },
  { code: 'DE', name: 'Germany', dial_code: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial_code: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dial_code: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dial_code: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dial_code: '+31', flag: '🇳🇱' },
  { code: 'CH', name: 'Switzerland', dial_code: '+41', flag: '🇨🇭' },
  { code: 'SE', name: 'Sweden', dial_code: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dial_code: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dial_code: '+45', flag: '🇩🇰' },
  { code: 'BE', name: 'Belgium', dial_code: '+32', flag: '🇧🇪' },
  { code: 'AT', name: 'Austria', dial_code: '+43', flag: '🇦🇹' },
  { code: 'IE', name: 'Ireland', dial_code: '+353', flag: '🇮🇪' },
  { code: 'MY', name: 'Malaysia', dial_code: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', dial_code: '+66', flag: '🇹🇭' },
  { code: 'ID', name: 'Indonesia', dial_code: '+62', flag: '🇮🇩' },
  { code: 'PH', name: 'Philippines', dial_code: '+63', flag: '🇵🇭' },
  { code: 'ZA', name: 'South Africa', dial_code: '+27', flag: '🇿🇦' },
  { code: 'KE', name: 'Kenya', dial_code: '+254', flag: '🇰🇪' },
  { code: 'MU', name: 'Mauritius', dial_code: '+230', flag: '🇲🇺' },
  { code: 'JP', name: 'Japan', dial_code: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dial_code: '+82', flag: '🇰🇷' },
  { code: 'HK', name: 'Hong Kong', dial_code: '+852', flag: '🇭🇰' },
  { code: 'LK', name: 'Sri Lanka', dial_code: '+94', flag: '🇱🇰' },
  { code: 'NP', name: 'Nepal', dial_code: '+977', flag: '🇳🇵' },
  { code: 'BD', name: 'Bangladesh', dial_code: '+880', flag: '🇧🇩' },
  { code: 'PK', name: 'Pakistan', dial_code: '+92', flag: '🇵🇰' },
  { code: 'BR', name: 'Brazil', dial_code: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dial_code: '+52', flag: '🇲🇽' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // India (+91)
