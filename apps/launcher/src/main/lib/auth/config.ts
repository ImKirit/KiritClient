/**
 * Microsoft-App-Registrierung.
 *
 * Die Client-ID eines **öffentlichen** Clients ist per Definition kein Geheimnis —
 * sie steckt in jedem ausgelieferten Launcher und ist über den Anmeldelink sichtbar.
 * Sie steht trotzdem hier und nicht verstreut im Code, damit sie an genau einer
 * Stelle austauschbar ist (im alten Client stand sie doppelt: `auth/microsoft.rs`
 * und `lib.rs`).
 *
 * Registrierung des Owners für den neuen Client, geprüft am 2026-07-27: der
 * Authorize-Endpunkt akzeptiert sie ohne AADSTS-Fehler.
 * Über `KIRITCLIENT_MS_CLIENT_ID` überschreibbar.
 *
 * Die ID des alten Clients war `c36a9fb6-4f2a-41ff-90bd-ae7cc92031eb` — ebenfalls noch
 * gültig, wird hier aber nicht mehr benutzt.
 */
export const MS_CLIENT_ID =
  process.env['KIRITCLIENT_MS_CLIENT_ID'] ?? 'abffc1b6-ea2e-4dfb-ba87-e27df87f259b'

/** Von der Registrierung akzeptierter Rückleitungspunkt für eingebettete Anmeldung. */
export const REDIRECT_URI = 'https://login.microsoftonline.com/common/oauth2/nativeclient'

export const AUTHORIZE_URL =
  'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize'
export const TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'

export const XBOX_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate'
export const XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
export const MC_LOGIN_URL =
  'https://api.minecraftservices.com/authentication/login_with_xbox'
export const MC_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile'

/** `offline_access` liefert das Refresh-Token, ohne das jede Sitzung neu anmelden müsste. */
export const SCOPE = 'XboxLive.signin offline_access'
