/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 개발 중 네트워크 주소(예: Chrome 원격/프리뷰 브라우저)에서도
  // HMR·Worker 번들이 차단되지 않도록 허용한다. 운영 배포에는 적용되지 않는다.
  allowedDevOrigins: ['100.103.138.8'],
};

export default nextConfig;
