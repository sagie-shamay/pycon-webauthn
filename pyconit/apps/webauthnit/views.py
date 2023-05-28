import json

from django.http import JsonResponse
from django.template.response import TemplateResponse
from rest_framework.views import APIView
from rest_framework.request import Request

from .models import UserAccount, Credential

from webauthn import generate_registration_options, options_to_json, verify_registration_response, generate_authentication_options, verify_authentication_response
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential,
)

RELYING_PARTY_ID = "localhost"
ORIGIN = "http://localhost:8000"
RELYING_PARTY_NAME = "PyconIT"
    

accounts_db: dict[str, UserAccount] = dict()
challenges_db: dict[str, bytes] = dict()


def index(request):
    return TemplateResponse(request=request, template="index.html")


class Register(APIView):
    def get(self, request: Request):
        username = request.query_params.get("username")
        if username not in accounts_db:
            accounts_db[username] = UserAccount(id=username, username=username)

        user = accounts_db[username]
        options = generate_registration_options(
            rp_id=RELYING_PARTY_ID,
            rp_name=RELYING_PARTY_NAME,
            user_id=user.id,
            user_name=user.username,
            attestation=AttestationConveyancePreference.DIRECT,
            exclude_credentials=[
                {"id": cred.id, "transports": cred.transports, "type": "public-key"}
                for cred in user.credentials
            ],
            authenticator_selection=AuthenticatorSelectionCriteria(
                user_verification=UserVerificationRequirement.REQUIRED
            ),
        )

        challenges_db[username] = options.challenge
        return JsonResponse(json.loads(options_to_json(options)))

    def post(self, request: Request):
        request_body = request.body.decode("utf-8")
        username = request.query_params.get("username")
        try:
            credential = RegistrationCredential.parse_raw(request_body)
            verification = verify_registration_response(
                credential=credential,
                expected_challenge=challenges_db[username],
                expected_rp_id=RELYING_PARTY_ID,
                expected_origin=ORIGIN,
            )
        except Exception as err:
            return JsonResponse({"verified": False, "msg": str(err), "status": 400})

        user = accounts_db[username]

        new_credential = Credential(
            id=verification.credential_id,
            public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
            transports=credential.response.transports,
        )
        user.credentials.append(new_credential)
        return JsonResponse({"verified": True})


class Authenticate(APIView):
    def get(self, request: Request):
        username = request.query_params.get("username")
        user = accounts_db[username]
        options = generate_authentication_options(
            rp_id=RELYING_PARTY_ID,
            allow_credentials=[
                {"type": "public-key", "id": cred.id, "transports": cred.transports}
                for cred in user.credentials
            ],
            user_verification=UserVerificationRequirement.REQUIRED,
        )
        
        challenges_db[username] = options.challenge
        return JsonResponse(json.loads(options_to_json(options)))

    def post(self, request: Request):
        request_body = request.body.decode("utf-8")

        try:
            request_credential = AuthenticationCredential.parse_raw(request_body)
            username = request.query_params.get("username")
            user = accounts_db[username]
            user_credentials = [credential for credential in user.credentials if credential.id == request_credential.raw_id]

            if not user_credentials:
                raise Exception("User does not have a credential with the given ID")
            
            user_credential = user_credentials[0]
            verification = verify_authentication_response(
                credential=request_credential,
                expected_challenge=challenges_db.pop(username),
                expected_rp_id=RELYING_PARTY_ID,
                expected_origin=ORIGIN,
                credential_public_key=user_credential.public_key,
                credential_current_sign_count=user_credential.sign_count,
                require_user_verification=True,
            )
        except Exception as err:
            return JsonResponse({"verified": False, "msg": str(err), "status": 400})

        user_credential.sign_count = verification.new_sign_count
        return JsonResponse({"verified": True})

