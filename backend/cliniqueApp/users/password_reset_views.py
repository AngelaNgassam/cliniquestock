# backend/cliniqueApp/users/password_reset_views.py

import random
import string
from datetime import timedelta

from django.utils import timezone
from django.core.mail import send_mail, EmailMultiAlternatives
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .models import Utilisateur, PasswordResetOTP


# ── Helpers ────────────────────────────────────────────────────────────────────

def _generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))


def _send_reset_email(user: Utilisateur, otp: str, reset_link: str):
    """Envoie l'email avec le code OTP ET le lien sécurisé (version HTML)."""

    subject = "CliniqueStock — Réinitialisation de votre mot de passe"

    # ── Version texte brut (fallback) ─────────────────────────────────────────
    text_content = f"""
Bonjour {user.prenom} {user.nom},

Vous avez demandé la réinitialisation de votre mot de passe CliniqueStock.

OPTION 1 — Code OTP
Entrez ce code dans l'application : {otp}
Ce code expire dans 10 minutes.

OPTION 2 — Lien sécurisé
Cliquez ici : {reset_link}
Ce lien expire dans 1 heure.

Si vous n'avez pas fait cette demande, ignorez cet email.
— L'équipe CliniqueStock
"""

    # ── Version HTML ──────────────────────────────────────────────────────────
    otp_digits = ''.join(
        f'<span style="display:inline-block;width:44px;height:52px;line-height:52px;text-align:center;'
        f'font-size:26px;font-weight:700;color:#1a56db;background:#f0f5ff;border:2px solid #c7d9fd;'
        f'border-radius:10px;margin:0 4px;letter-spacing:0;">{d}</span>'
        for d in otp
    )

    html_content = f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Réinitialisation mot de passe</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(26,86,219,0.10);max-width:600px;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a56db 0%,#1e429f 100%);
                       padding:36px 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Logo + Nom -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <!-- Icône SVG bouclier/croix -->
                          <div style="width:44px;height:44px;background:rgba(255,255,255,0.18);
                                      border-radius:12px;display:inline-flex;align-items:center;
                                      justify-content:center;">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                                    fill="white" opacity="0.9"/>
                              <path d="M9 12l2 2 4-4" stroke="#1a56db" stroke-width="2"
                                    stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <span style="font-size:22px;font-weight:700;color:#ffffff;
                                       letter-spacing:-0.3px;">CliniqueStock</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:24px;">
                    <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;
                               letter-spacing:-0.5px;line-height:1.3;">
                      Réinitialisation<br/>de votre mot de passe
                    </h1>
                    <p style="margin:10px 0 0;color:rgba(255,255,255,0.78);font-size:14px;">
                      Demande reçue à {timezone.now().strftime('%H:%M')} · Expire dans 10 min
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="padding:40px 48px 8px;">
              <p style="margin:0 0 6px;font-size:16px;color:#374151;font-weight:600;">
                Bonjour {user.prenom} {user.nom},
              </p>
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                Vous avez demandé la réinitialisation de votre mot de passe.
                Utilisez l'une des deux options ci-dessous.
              </p>
            </td>
          </tr>

          <!-- ── OTP CARD ── -->
          <tr>
            <td style="padding:24px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8faff;border:1.5px solid #dce8fd;
                            border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:28px 32px;">
                    <!-- Badge option -->
                    <div style="display:inline-block;background:#1a56db;color:#fff;
                                font-size:11px;font-weight:700;letter-spacing:1px;
                                padding:4px 12px;border-radius:20px;margin-bottom:16px;
                                text-transform:uppercase;">
                      Option 1 — Code OTP
                    </div>
                    <p style="margin:0 0 20px;font-size:13px;color:#4b5563;">
                      Entrez ce code à 6 chiffres dans l'application&nbsp;:
                    </p>
                    <!-- Chiffres OTP -->
                    <div style="text-align:center;margin-bottom:20px;">
                      {otp_digits}
                    </div>
                    <!-- Expiry warning -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:8px;">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                               xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2"/>
                            <path d="M12 7v5l3 3" stroke="#f59e0b" stroke-width="2"
                                  stroke-linecap="round"/>
                          </svg>
                        </td>
                        <td>
                          <span style="font-size:12px;color:#92400e;font-weight:500;">
                            Ce code expire dans <strong>10 minutes</strong>
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── DIVIDER ── -->
          <tr>
            <td style="padding:20px 48px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #e5e7eb;"></td>
                  <td style="padding:0 16px;white-space:nowrap;font-size:12px;
                             color:#9ca3af;font-weight:500;">OU</td>
                  <td style="border-top:1px solid #e5e7eb;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── LINK CARD ── -->
          <tr>
            <td style="padding:0 48px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8faff;border:1.5px solid #dce8fd;
                            border-radius:14px;">
                <tr>
                  <td style="padding:28px 32px;">
                    <div style="display:inline-block;background:#1e429f;color:#fff;
                                font-size:11px;font-weight:700;letter-spacing:1px;
                                padding:4px 12px;border-radius:20px;margin-bottom:16px;
                                text-transform:uppercase;">
                      Option 2 — Lien sécurisé
                    </div>
                    <p style="margin:0 0 20px;font-size:13px;color:#4b5563;">
                      Cliquez sur le bouton ci-dessous pour réinitialiser directement&nbsp;:
                    </p>
                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:10px;overflow:hidden;">
                          <a href="{reset_link}"
                             style="display:inline-block;background:linear-gradient(135deg,#1a56db,#1e429f);
                                    color:#ffffff;font-size:15px;font-weight:700;
                                    text-decoration:none;padding:14px 32px;border-radius:10px;
                                    letter-spacing:0.2px;">
                            Réinitialiser mon mot de passe →
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">
                      Ce lien expire dans <strong>1 heure</strong>.
                      Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur&nbsp;:<br/>
                      <span style="color:#1a56db;word-break:break-all;font-size:10px;">
                        {reset_link}
                      </span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── SECURITY NOTE ── -->
          <tr>
            <td style="padding:24px 48px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:12px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align:top;padding-right:10px;padding-top:2px;">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                               xmlns="http://www.w3.org/2000/svg">
                            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                  fill="#f97316"/>
                            <line x1="12" y1="9" x2="12" y2="13" stroke="white"
                                  stroke-width="2" stroke-linecap="round"/>
                            <line x1="12" y1="17" x2="12.01" y2="17" stroke="white"
                                  stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </td>
                        <td>
                          <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
                            <strong>Vous n'avez pas fait cette demande ?</strong><br/>
                            Ignorez cet email. Votre mot de passe ne sera pas modifié.
                            Votre compte reste sécurisé.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding:32px 48px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:1px solid #f0f0f0;padding-top:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                            Cet email a été envoyé automatiquement par
                            <strong style="color:#6b7280;">CliniqueStock</strong>.<br/>
                            © 2026 CliniqueStock · Gestion intelligente des stocks cliniques
                          </p>
                        </td>
                        <td align="right" style="vertical-align:top;">
                          <div style="width:32px;height:32px;background:linear-gradient(135deg,#1a56db,#1e429f);
                                      border-radius:8px;display:inline-flex;align-items:center;
                                      justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                 xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
                                    fill="white" opacity="0.9"/>
                            </svg>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""

    # ── Envoi multipart (HTML + texte brut) ───────────────────────────────────
    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send(fail_silently=False)


# ── Vue 1 : Demande de réinitialisation ───────────────────────────────────────

class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'error': 'Email requis.'}, status=400)

        try:
            user = Utilisateur.objects.get(email__iexact=email, est_actif=True)
        except Utilisateur.DoesNotExist:
            return Response({'message': 'Si cet email existe, un message a été envoyé.'})

        PasswordResetOTP.objects.filter(user=user).delete()

        otp = _generate_otp(6)
        expires_at = timezone.now() + timedelta(minutes=10)
        PasswordResetOTP.objects.create(user=user, otp=otp, expires_at=expires_at)

        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password?uid={uid}&token={token}"

        try:
            _send_reset_email(user, otp, reset_link)
        except Exception as e:
            return Response({'error': f'Erreur envoi email : {str(e)}'}, status=500)

        return Response({'message': 'Si cet email existe, un message a été envoyé.'})


# ── Vue 2a : Vérifier le code OTP ─────────────────────────────────────────────

class PasswordResetVerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp   = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({'error': 'Email et OTP requis.'}, status=400)

        try:
            user = Utilisateur.objects.get(email__iexact=email, est_actif=True)
        except Utilisateur.DoesNotExist:
            return Response({'error': 'Code invalide ou expiré.'}, status=400)

        try:
            record = PasswordResetOTP.objects.get(user=user, otp=otp)
        except PasswordResetOTP.DoesNotExist:
            return Response({'error': 'Code invalide ou expiré.'}, status=400)

        if record.is_expired():
            record.delete()
            return Response({'error': 'Code expiré. Faites une nouvelle demande.'}, status=400)

        if record.attempts >= 5:
            record.delete()
            return Response({'error': 'Trop de tentatives. Faites une nouvelle demande.'}, status=400)

        record.verified = True
        record.save()

        uid   = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        return Response({'message': 'Code valide.', 'uid': uid, 'token': token})


# ── Vue 2b : Valider le lien sécurisé ─────────────────────────────────────────

class PasswordResetValidateLinkView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid   = request.data.get('uid', '')
        token = request.data.get('token', '')

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user    = Utilisateur.objects.get(pk=user_id, est_actif=True)
        except (ValueError, Utilisateur.DoesNotExist):
            return Response({'error': 'Lien invalide.'}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Lien invalide ou expiré.'}, status=400)

        return Response({'message': 'Lien valide.', 'uid': uid, 'token': token})


# ── Vue 3 : Nouveau mot de passe ───────────────────────────────────────────────

class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid          = request.data.get('uid', '')
        token        = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        if not uid or not token or not new_password:
            return Response({'error': 'Tous les champs sont requis.'}, status=400)

        if len(new_password) < 8:
            return Response({'error': 'Le mot de passe doit contenir au moins 8 caractères.'}, status=400)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user    = Utilisateur.objects.get(pk=user_id, est_actif=True)
        except (ValueError, Utilisateur.DoesNotExist):
            return Response({'error': 'Lien invalide.'}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Lien invalide ou expiré.'}, status=400)

        user.set_password(new_password)
        user.save()

        PasswordResetOTP.objects.filter(user=user).delete()

        try:
            from cliniqueApp.rapports.models import JournalAudit
            JournalAudit.objects.create(
                action='RESET_PASSWORD',
                entite_concernee=f'Utilisateur : {user.prenom} {user.nom}',
                nouvelle_valeur={'email': user.email},
                utilisateur=user,
                adresse_ip=request.META.get('REMOTE_ADDR'),
            )
        except Exception:
            pass

        return Response({'message': 'Mot de passe modifié avec succès.'})


# ── Vue 4 : Incrémenter les tentatives OTP ────────────────────────────────────

class PasswordResetOTPAttemptView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        try:
            user   = Utilisateur.objects.get(email__iexact=email, est_actif=True)
            record = PasswordResetOTP.objects.get(user=user)
            record.attempts += 1
            record.save()
        except (Utilisateur.DoesNotExist, PasswordResetOTP.DoesNotExist):
            pass
        return Response({'ok': True})