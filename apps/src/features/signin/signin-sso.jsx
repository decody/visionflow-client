'use client';
import { signIn } from 'next-auth/react';
import styles from './signin-page.module.css';
function GoogleIcon() {
    return (<svg aria-hidden="true" className={styles.googleIcon} height={20} viewBox="0 0 20 20" width={20} xmlns="http://www.w3.org/2000/svg">
      <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.351z" fill="#4285F4"/>
      <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0 0 10 20z" fill="#34A853"/>
      <path d="M4.405 11.9a6.005 6.005 0 0 1 0-3.8V5.51H1.064a9.996 9.996 0 0 0 0 8.98L4.405 11.9z" fill="#FBBC05"/>
      <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.96.99 12.695 0 10 0A9.996 9.996 0 0 0 1.064 5.51L4.405 8.1C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
    </svg>);
}
function NaverIcon() {
    return (<svg aria-hidden="true" className={styles.naverIcon} height={20} viewBox="0 0 20 20" width={20} xmlns="http://www.w3.org/2000/svg">
      <rect fill="#03C75A" height={20} rx={4} width={20}/>
      <path d="M5.693 5.661h2.394l2.425 3.724V5.661h2.395v8.678h-2.395l-2.425-3.723v3.723H5.693V5.661z" fill="#fff"/>
    </svg>);
}
function SigninSso() {
    return (<>
      <button className={styles.altSso} onClick={() => void signIn('google', { callbackUrl: '/' })} type="button">
        <GoogleIcon />
        <span>대신 Google Workspace로 가입</span>
      </button>

      <button className={styles.altSso} onClick={() => void signIn('naver', { callbackUrl: '/' })} type="button">
        <NaverIcon />
        <span>네이버로 가입</span>
      </button>
    </>);
}
export default SigninSso;
