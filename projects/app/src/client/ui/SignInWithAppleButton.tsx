export type SignInWithAppleButtonLocale =
  | `ar_SA`
  | `ca_ES`
  | `cs_CZ`
  | `da_DK`
  | `de_DE`
  | `el_GR`
  | `en_GB`
  | `en_US`
  | `es_ES`
  | `es_MX`
  | `fi_FI`
  | `fr_CA`
  | `fr_FR`
  | `hr_HR`
  | `hu_HU`
  | `id_ID`
  | `it_IT`
  | `iw_IL`
  | `ja_JP`
  | `ko_KR`
  | `ms_MY`
  | `nl_NL`
  | `no_NO`
  | `pl_PL`
  | `pt_BR`
  | `pt_PT`
  | `ro_RO`
  | `ru_RU`
  | `sk_SK`
  | `sv_SE`
  | `th_TH`
  | `tr_TR`
  | `uk_UA`
  | `vi_VI`
  | `zh_CN`
  | `zh_HK`
  | `zh_TW`;

export interface SignInWithAppleButtonProps {
  mode?: `center-align` | `left-align` | `logo-only`;
  clientId: string;
  color?: `black` | `white`;
  locale?: SignInWithAppleButtonLocale;
  labelPosition?: number;
  logoSize?: `small` | `medium` | `large`;
  border?: boolean;
  borderRadius?: number;
  redirectUri: string;
  scope?: (`email` | `name`)[];
  state?: string;
  usePopup?: boolean;
  nonce?: string;
  type?: `sign-in` | `continue` | `sign-up`;
  /**
   * To configure the width of the Sign in with Apple button, set the data-width
   * property to a value in points between 130—375, or 100% to fit the container
   * size. The default is 100%.
   */
  width?: number | `100%`;
  /**
   * To configure the height of the button, set the data-height property to a
   * value in points between 30—64, or 100% to fit the container size. The
   * default is 100%.
   */
  height?: number | `100%`;
  onSuccess: (data: AppleSignInAPI.SignInResponseI) => void;
}

/**
 * Ensures on web that the top status bar background color matches the view background.
 */
export function SignInWithAppleButton({}: SignInWithAppleButtonProps) {
  return null;
}
