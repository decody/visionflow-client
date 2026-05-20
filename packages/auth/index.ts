import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';

export const providers = [
  Google,
  Naver({
    clientId: process.env.AUTH_NAVER_ID,
    clientSecret: process.env.AUTH_NAVER_SECRET,
    checks: ['state'],
    client: {
      token_endpoint_auth_method: 'client_secret_post',
    },
  }),
  Kakao({
    clientId: process.env.AUTH_KAKAO_ID,
    clientSecret: process.env.AUTH_KAKAO_SECRET,
  }),
];
