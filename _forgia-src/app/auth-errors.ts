type AuthAction = 'login' | 'register' | 'forgot' | 'recovery';

/** Never expose provider responses, addresses or credentials in the form. */
export function authErrorMessage(error: unknown, action: AuthAction): string {
  const value = error && typeof error === 'object' ? error as {code?: string; status?: number; name?: string} : {};
  const code = value.code || '';
  if (code === 'invalid_credentials') return 'Email o password non corrette.';
  if (code === 'email_not_confirmed') return 'Conferma prima l’email dal link ricevuto.';
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'Controlla che l’indirizzo email sia completo e valido.';
  if (code === 'weak_password') return 'Scegli una password più sicura, di almeno 12 caratteri.';
  if (code === 'same_password') return 'Scegli una password diversa da quella attuale.';
  if (code.includes('rate_limit') || value.status === 429) return 'Troppe richieste. Attendi qualche minuto prima di riprovare.';
  if (code === 'signup_disabled') return 'Le registrazioni sono temporaneamente sospese. Riprova più tardi.';
  if (code === 'email_address_not_authorized' || (value.status || 0) >= 500) {
    if (action === 'register' || action === 'forgot') return 'Il servizio di registrazione e invio email è temporaneamente indisponibile. Riprova più tardi.';
    return 'Il servizio di accesso è temporaneamente indisponibile. Riprova più tardi.';
  }
  if (action === 'recovery' && ['otp_expired', 'flow_state_expired', 'flow_state_not_found', 'session_not_found', 'bad_code_verifier'].includes(code)) return 'Il link di recupero è scaduto o non è più valido. Richiedine uno nuovo.';
  if (value.name === 'AuthRetryableFetchError' || value.name === 'TypeError') return 'Non riesco a raggiungere il servizio di accesso. Verifica la connessione e riprova.';
  return 'La richiesta non è stata completata. Riprova; se il problema continua, contatta Arkalink.';
}
